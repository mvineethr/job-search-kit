import Link from 'next/link';
import { currentSid } from '@/lib/auth';
import { ensureSchema, sql, type ResumeRow, type JobRow } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const sid = await currentSid();
  if (!sid) return null;

  await ensureSchema();
  const q = sql();

  const resumes = (await q`
    SELECT id, title, content, parent_id, job_id, created_at, updated_at, source_text
    FROM resumes WHERE sid = ${sid} ORDER BY updated_at DESC`) as unknown as ResumeRow[];
  const jobs = (await q`
    SELECT id, company, role, description, analysis, created_at
    FROM jobs WHERE sid = ${sid}`) as unknown as JobRow[];

  const hasResume = resumes.length > 0;

  return (
    <div className="wrap">
      <div className="page-head">
        <h1>Fix your résumé against the jobs you actually want</h1>
        <p className="sub">
          Diagnose before rewriting, anchor everything to real job descriptions, and never
          invent a number. Where a metric is missing it says so rather than making one up.
        </p>
      </div>

      <div className="identity">
        <div className="identity-avatar" aria-hidden="true">
          JS
        </div>
        <div className="identity-main">
          <strong>Test build</strong>
          <span className="tnum">
            {resumes.length} {resumes.length === 1 ? 'résumé' : 'résumés'} · {jobs.length}{' '}
            {jobs.length === 1 ? 'job' : 'jobs'} · kept to this browser
          </span>
        </div>
        <form method="post" action="/api/login">
          <input type="hidden" name="_method" value="delete" />
          <Link href="/login" className="btn">
            Switch session
          </Link>
        </form>
      </div>

      <div className="sec">
        <div className="sec-head">
          <h2>Start something</h2>
        </div>

        <div className="entries">
          <Link href="/review" className="entry entry-lead">
            <strong>{hasResume ? 'Add another résumé' : 'Add my résumé'}</strong>
            <span>
              Paste or upload it. It gets read into sections so it can be reviewed, tailored
              and exported.
            </span>
          </Link>

          <Link href="/jobs" className="entry">
            <strong>Tailor to a job</strong>
            <span>Add a posting and aim a copy of your résumé at it, keyword for keyword.</span>
          </Link>

          <Link href="/email" className="entry entry-soon">
            <strong>Write a cold email</strong>
            <span>A short, specific note to a hiring manager or someone who could refer you.</span>
          </Link>

          <Link href="/linkedin" className="entry entry-soon">
            <strong>Fix my LinkedIn</strong>
            <span>Headline, About, experience bullets, and what to post.</span>
          </Link>
        </div>
      </div>

      <div className="sec">
        <div className="sec-head">
          <h2>Your documents</h2>
          {hasResume && <span className="count">{resumes.length}</span>}
        </div>

        {!hasResume ? (
          <p className="note" style={{ maxWidth: 640 }}>
            Nothing saved yet. Add a résumé and it will show up here, along with any copies
            you tailor to specific jobs.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-2)' }}>
            {resumes.map((r) => (
              <Link
                key={r.id}
                href={`/resume/${r.id}`}
                className="entry"
                style={{ flexDirection: 'row', alignItems: 'center', gap: 'var(--s-3)' }}
              >
                <span className={r.parent_id ? 'pill' : 'pill pill-master'}>
                  {r.parent_id ? 'Tailored' : 'Master'}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <strong style={{ display: 'block', fontSize: 'var(--text-sm)' }}>{r.title}</strong>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                    {r.content ? 'Read into sections' : 'Plain text only'}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
