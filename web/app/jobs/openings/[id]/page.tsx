import Link from 'next/link';
import { notFound } from 'next/navigation';
import { currentSid } from '@/lib/auth';
import { ensureSchema, sql } from '@/lib/db';
import { loadAnswers } from '@/lib/answers';
import { readMatch, viewMatch } from '@/lib/match';
import type { Ats } from '@/lib/job-sources';
import PageBar from '@/components/PageBar';
import GenerateButton from '@/components/GenerateButton';
import FitMeter from '@/components/FitMeter';

export const dynamic = 'force-dynamic';

const ATS_LABEL = { greenhouse: 'Greenhouse', lever: 'Lever', ashby: 'Ashby' } as const;
const date = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

/** One opening, laid out plainly: where, what it pays, when it was posted, and the full description. */
export default async function OpeningPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sid = await currentSid();
  if (!sid) return null;

  await ensureSchema();
  const q = sql();
  const p = ((await q`
    SELECT p.id, p.title, p.location, p.url, p.description, p.posted_at, p.pay, p.job_id,
           c.name AS company, c.ats, j.match
    FROM postings p
    JOIN companies c ON c.id = p.company_id AND c.sid = ${sid}
    LEFT JOIN jobs j ON j.id = p.job_id AND j.sid = ${sid}
    WHERE p.id = ${id} AND p.sid = ${sid}`) as {
    id: string;
    title: string;
    location: string;
    url: string;
    description: string;
    posted_at: string | null;
    pay: string;
    job_id: string | null;
    company: string;
    ats: Ats;
    match: unknown;
  }[])[0];
  if (!p) notFound();

  const match = readMatch(p.match);
  const view = match ? viewMatch(match, await loadAnswers(sid)) : null;

  return (
    <>
      <PageBar crumbs={[{ href: '/jobs', label: 'Jobs' }, { href: '/jobs/openings', label: 'Openings' }, { label: p.company }]}>
        <a href={p.url} target="_blank" rel="noopener noreferrer" className="btn btn-sm">
          Open the posting
        </a>
        {p.job_id ? (
          <Link href={`/jobs/${p.job_id}`} className="btn btn-sm btn-primary">
            Open saved job
          </Link>
        ) : (
          <GenerateButton
            action={`/api/postings/${p.id}`}
            jobId={p.id}
            op="save"
            label="Save and check my fit"
            busyLabel="Checking your fit… about 30 seconds"
            primary
          />
        )}
      </PageBar>
      <div className="wrap">
        <div className="page-head">
          <h1>{p.title}</h1>
          <p className="sub">{p.company}</p>
        </div>

        <div className="stack col-720">
          <section className="card">
            <div className="card-body">
              <dl className="sp-list">
                <dt>Location</dt>
                <dd>{p.location || 'Not listed'}</dd>
                <dt>Pay</dt>
                <dd>{p.pay || 'Not listed in the posting'}</dd>
                <dt>Posted</dt>
                <dd>{p.posted_at ? date(p.posted_at) : 'Not listed'}</dd>
                <dt>Applies through</dt>
                <dd>{ATS_LABEL[p.ats]}</dd>
              </dl>
              <p className="hint">Pay is shown only as the employer published it. The app never estimates it.</p>
            </div>
          </section>

          {view ? (
            <section className="card">
              <div className="card-body stack">
                <FitMeter view={view} />
                <Link href={`/jobs/${p.job_id}`}>See what matches and how to improve it</Link>
              </div>
            </section>
          ) : (
            !p.job_id && (
              <p className="notice">
                Save it to see your résumé match score, what the posting asks for that your résumé does not show,
                and how to close those gaps.
              </p>
            )
          )}

          <section className="card">
            <div className="card-head">
              <h2>Job description</h2>
            </div>
            <div className="card-body">
              <div className="posting-text">{p.description || 'The feed has no description. Open the posting to read it.'}</div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
