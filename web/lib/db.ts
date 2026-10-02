import { neon } from '@neondatabase/serverless';

/**
 * Plain SQL over Neon. No ORM: there are two tables, and a migration runner
 * plus a query builder would be more machinery than the thing they manage.
 *
 * Every query filters by sid. That is the only thing keeping testers' résumés
 * apart, so it is never optional.
 */
export function sql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set.');
  return neon(url);
}

export type JobRow = {
  id: string;
  company: string;
  role: string;
  description: string;
  analysis: { matched?: string[]; missing?: string[]; requirements?: number } | null;
  questions?: unknown;
  applied_at?: string | null;
  match?: unknown;
  created_at: string;
};

export type SkillAnswerRow = {
  skill_key: string;
  skill: string;
  level: string;
  detail: string;
};

export type LetterRow = {
  id: string;
  kind: string;
  job_id: string | null;
  resume_id: string | null;
  content: unknown;
  created_at: string;
};

export type ResumeRow = {
  id: string;
  title: string;
  source_text: string | null;
  content: unknown | null;
  parent_id: string | null;
  job_id: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * Creates the schema if it is absent. Called on demand rather than as a build
 * step, because a build step cannot run against a database that is provisioned
 * after the build. Cheap: CREATE TABLE IF NOT EXISTS on an existing schema is
 * a no-op, and the guard below means it runs once per process.
 *
 * Concurrent first requests share one run: Better Auth's migrations issue plain
 * CREATE TABLE, which would fail if two requests raced. A failed run is retried.
 */
let ensuring: Promise<void> | null = null;

export function ensureSchema(): Promise<void> {
  ensuring ??= createSchema().catch((err) => {
    ensuring = null;
    throw err;
  });
  return ensuring;
}

async function createSchema(): Promise<void> {
  const q = sql();

  // Better Auth's own tables (user, session, account, verification). Imported
  // lazily so code that only needs sql() does not load the auth stack.
  const { getMigrations } = await import('better-auth/db/migration');
  const { authOptions } = await import('./auth-server');
  await (await getMigrations(authOptions)).runMigrations();

  await q`
    CREATE TABLE IF NOT EXISTS jobs (
      id          TEXT PRIMARY KEY,
      sid         TEXT NOT NULL,
      company     TEXT NOT NULL,
      role        TEXT NOT NULL,
      description TEXT NOT NULL,
      analysis    JSONB,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;

  await q`
    CREATE TABLE IF NOT EXISTS resumes (
      id          TEXT PRIMARY KEY,
      sid         TEXT NOT NULL,
      title       TEXT NOT NULL,
      source_text TEXT,
      content     JSONB,
      parent_id   TEXT REFERENCES resumes(id) ON DELETE SET NULL,
      job_id      TEXT REFERENCES jobs(id) ON DELETE SET NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;

  await q`
    CREATE TABLE IF NOT EXISTS letters (
      id          TEXT PRIMARY KEY,
      sid         TEXT NOT NULL,
      kind        TEXT NOT NULL DEFAULT 'cover',
      job_id      TEXT REFERENCES jobs(id) ON DELETE CASCADE,
      resume_id   TEXT REFERENCES resumes(id) ON DELETE SET NULL,
      content     JSONB NOT NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;

  /**
   * Answers belong to the person, not the job. If someone confirms they have run
   * Istio, that is true for every job they tailor to — asking again per posting
   * would be tedious and would collect contradictory answers.
   */
  await q`
    CREATE TABLE IF NOT EXISTS skill_answers (
      sid        TEXT NOT NULL,
      skill_key  TEXT NOT NULL,
      skill      TEXT NOT NULL,
      level      TEXT NOT NULL,
      detail     TEXT NOT NULL DEFAULT '',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (sid, skill_key)
    )`;

  // One row per session: who this is, and the LinkedIn text kept for the LinkedIn feature.
  await q`
    CREATE TABLE IF NOT EXISTS profiles (
      sid           TEXT PRIMARY KEY,
      name          TEXT NOT NULL DEFAULT '',
      linkedin_text TEXT,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;

  // Career basics, all optional, asked once on /start.
  await q`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS target_role TEXT`;
  await q`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS years_experience TEXT`;
  await q`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS location TEXT`;
  await q`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS search_status TEXT`;
  await q`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS heard_from TEXT`;

  // Questions are per job, since they come from that posting's requirements.
  await q`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS questions JSONB`;
  // Null until the person marks the job applied: a yes/no with the date it became yes.
  await q`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS applied_at TIMESTAMPTZ`;
  // The verified requirement list from core/job-match.md. The score is computed from it on render.
  await q`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS match JSONB`;

  await q`CREATE INDEX IF NOT EXISTS jobs_sid_idx ON jobs (sid, created_at DESC)`;
  await q`CREATE INDEX IF NOT EXISTS letters_sid_idx ON letters (sid, job_id)`;
  await q`CREATE INDEX IF NOT EXISTS resumes_sid_idx ON resumes (sid, updated_at DESC)`;
}
