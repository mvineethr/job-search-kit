import { sql } from './db';
import { fetchBoard, type Ats, type Posting } from './job-sources';
import { wantedTitle } from './apply';
import { notify } from './notifications';
import { readSearchProfile, wantedRoles } from './search-profile';

export type CompanyRow = {
  id: string;
  sid: string;
  ats: Ats;
  token: string;
  name: string;
  checked_at: string | null;
  check_error: string | null;
};

export type PostingRow = {
  id: string;
  company_id: string;
  title: string;
  location: string;
  url: string;
  description: string;
  posted_at: string | null;
  first_seen: string;
  job_id: string | null;
};

// shortcut: one insert per company caps the payload; raise if a followed board ever has more.
const MAX_POSTINGS = 1000;
const MAX_DESCRIPTION = 15_000;

/**
 * Pulls one followed company's feed and brings its postings up to date: new ones
 * are added, changed ones updated, and ones that left the feed (closed) removed,
 * unless the person already saved them as a job. Returns how many were new.
 * A failed fetch is recorded on the company and leaves its postings as they were.
 */
export async function refreshCompany(c: CompanyRow, fetchImpl?: typeof fetch): Promise<number> {
  const q = sql();
  let postings: Posting[];
  try {
    postings = (await fetchBoard({ ats: c.ats, token: c.token }, fetchImpl)).slice(0, MAX_POSTINGS);
  } catch (err) {
    await q`UPDATE companies SET checked_at = now(), check_error = ${(err as Error).message}
            WHERE id = ${c.id} AND sid = ${c.sid}`;
    return 0;
  }

  const rows = postings.map((p) => ({
    external_id: p.externalId,
    title: p.title.slice(0, 300),
    location: p.location.slice(0, 300),
    url: p.url,
    description: p.description.slice(0, MAX_DESCRIPTION),
    posted_at: p.postedAt,
  }));
  const ids = rows.map((r) => r.external_id);

  const [inserted] = await q.transaction([
    q`
      INSERT INTO postings (id, sid, company_id, external_id, title, location, url, description, posted_at)
      SELECT gen_random_uuid()::text, ${c.sid}, ${c.id}, r.external_id, r.title, r.location, r.url, r.description,
             r.posted_at::timestamptz
      FROM jsonb_to_recordset(${JSON.stringify(rows)}::jsonb)
        AS r(external_id text, title text, location text, url text, description text, posted_at text)
      ON CONFLICT (company_id, external_id) DO UPDATE SET
        title = EXCLUDED.title, location = EXCLUDED.location, url = EXCLUDED.url,
        description = EXCLUDED.description, posted_at = EXCLUDED.posted_at
      RETURNING (xmax = 0) AS inserted`,
    q`
      DELETE FROM postings
      WHERE sid = ${c.sid} AND company_id = ${c.id} AND job_id IS NULL
        AND external_id NOT IN (SELECT jsonb_array_elements_text(${JSON.stringify(ids)}::jsonb))`,
    q`UPDATE companies SET checked_at = now(), check_error = NULL WHERE id = ${c.id} AND sid = ${c.sid}`,
  ]);
  return (inserted as { inserted: boolean }[]).filter((r) => r.inserted).length;
}

/** Words in a title search: every word must appear in the title or location. */
export function matchesSearch(p: { title: string; location: string }, search: string): boolean {
  const hay = `${p.title} ${p.location}`.toLowerCase();
  return search
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((w) => hay.includes(w));
}

/**
 * After a daily check: one notification per company that posted jobs for the roles
 * the person wants (their own roles and the search profile's). With no roles set, any new job counts.
 */
export async function notifyNewOpenings(c: CompanyRow, since: Date): Promise<void> {
  const q = sql();
  const fresh = (await q`
    SELECT title FROM postings WHERE sid = ${c.sid} AND company_id = ${c.id} AND first_seen >= ${since.toISOString()}`) as {
    title: string;
  }[];
  const [p] = (await q`SELECT target_role, preferences, search_profile FROM profiles WHERE sid = ${c.sid}`) as {
    target_role: string | null;
    preferences: { target_roles: string[] } | null;
    search_profile: unknown;
  }[];
  // Their own roles plus the search profile's roles and nearby roles.
  const roles = wantedRoles(readSearchProfile(p?.search_profile), p ? { target_role: p.target_role, preferences: p.preferences as never } : null);
  const hits = roles.length ? fresh.filter((f) => wantedTitle(f.title, roles)) : fresh;
  if (hits.length === 0) return;
  const text =
    hits.length === 1
      ? `New at ${c.name}: ${hits[0].title}`
      : `${hits.length} new jobs at ${c.name}${roles.length ? ' for the roles you want' : ''}`;
  await notify(c.sid, text, `/jobs/openings?company=${c.id}`);
}
