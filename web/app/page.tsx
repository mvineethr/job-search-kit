import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import PageBar from '@/components/PageBar';
import Landing from '@/components/Landing';
import { ensureSchema, sql, type ResumeRow, type JobRow } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const user = await currentUser();
  if (!user) return <Landing />;
  const sid = user.id;

  await ensureSchema();
  const q = sql();

  const resumes = (await q`
    SELECT id, title, content, parent_id, job_id, created_at, updated_at, source_text
    FROM resumes WHERE sid = ${sid} ORDER BY updated_at DESC`) as unknown as ResumeRow[];
  const jobs = (await q`
    SELECT id, company, role, description, analysis, created_at
    FROM jobs WHERE sid = ${sid} ORDER BY created_at DESC`) as unknown as JobRow[];

  // Nothing to show without a résumé, so new accounts start with onboarding.
  if (resumes.length === 0) redirect('/start');

  const hasResume = resumes.length > 0;

  return (
    <>
      <PageBar crumbs={[{ label: 'Home' }]} />
      <div className="wrap">
        <div className="page-head">
          <h1>Fix your résumé against the jobs you actually want</h1>
          <p className="sub">
            Diagnose before rewriting, anchor everything to real job descriptions, and never
            invent a number. Where a metric is missing it says so rather than making one up.
          </p>
          <p className="sub tnum">
            {resumes.length} {resumes.length === 1 ? 'résumé' : 'résumés'} · {jobs.length}{' '}
            {jobs.length === 1 ? 'job' : 'jobs'}
          </p>
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

            <Link href="/ats-check" className="entry">
              <strong>Check what an ATS sees</strong>
              <span>Upload a résumé PDF and see the plain text a tracking system pulls out of it.</span>
            </Link>

            <Link href="/email" className="entry entry-soon">
              <strong>
                Write a cold email <span className="tag tag-soon">Soon</span>
              </strong>
              <span>A short, specific note to a hiring manager or someone who could refer you.</span>
            </Link>

            <Link href="/linkedin" className="entry entry-soon">
              <strong>
                Fix my LinkedIn <span className="tag tag-soon">Soon</span>
              </strong>
              <span>Headline, About, experience bullets, and what to post.</span>
            </Link>
          </div>
        </div>

        <div className="home-recent sec">
          <div>
            <div className="sec-head">
              <h2>Recent résumés</h2>
              <span className="count">{resumes.length}</span>
            </div>
            <div className="stack">
              {resumes.slice(0, 3).map((r) => (
                <Link key={r.id} href={`/resume/${r.id}`} className="card entry-row">
                  <span className={r.parent_id ? 'tag' : 'tag tag-accent'}>
                    {r.parent_id ? 'Tailored' : 'Master'}
                  </span>
                  <span className="entry-title">
                    <strong>{r.title}</strong>
                    <span className="entry-meta">
                      {r.content ? 'Read into sections' : 'Plain text only'}
                    </span>
                  </span>
                </Link>
              ))}
              <Link href="/resumes">See all résumés</Link>
            </div>
          </div>

          <div>
            <div className="sec-head">
              <h2>Recent jobs</h2>
              <span className="count">{jobs.length}</span>
            </div>
            {jobs.length === 0 ? (
              <p className="notice col-640">
                No jobs yet. Add a posting and aim a copy of your résumé at it.
              </p>
            ) : (
              <div className="stack">
                {jobs.slice(0, 3).map((j) => (
                  <Link key={j.id} href={`/jobs/${j.id}`} className="card entry-row">
                    <span className="entry-title">
                      <strong>{j.role}</strong>
                      <span className="entry-meta">{j.company}</span>
                    </span>
                  </Link>
                ))}
                <Link href="/jobs">See all jobs</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
