import Link from 'next/link';
import { currentSid } from '@/lib/auth';
import { ensureSchema, sql } from '@/lib/db';
import { matchesSearch, type CompanyRow, type PostingRow } from '@/lib/pool';
import PageBar from '@/components/PageBar';
import GenerateButton from '@/components/GenerateButton';
import ConfirmButton from '@/components/ConfirmButton';

export const dynamic = 'force-dynamic';

const ATS_LABEL = { greenhouse: 'Greenhouse', lever: 'Lever', ashby: 'Ashby' } as const;
const SHOWN = 100;
const day = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

export default async function OpeningsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; q?: string; company?: string }>;
}) {
  const { error, q: search = '', company: only = '' } = await searchParams;
  const sid = await currentSid();
  if (!sid) return null;

  await ensureSchema();
  const q = sql();
  const companies = (await q`
    SELECT id, sid, ats, token, name, checked_at, check_error FROM companies
    WHERE sid = ${sid} ORDER BY name`) as unknown as CompanyRow[];
  const postings = (await q`
    SELECT id, company_id, title, location, url, posted_at, first_seen, job_id,
           first_seen > now() - interval '7 days' AS fresh
    FROM postings
    WHERE sid = ${sid} ORDER BY COALESCE(posted_at, first_seen) DESC`) as unknown as (PostingRow & { fresh: boolean })[];

  const byCompany = new Map(companies.map((c) => [c.id, c]));
  const counts = new Map<string, number>();
  for (const p of postings) counts.set(p.company_id, (counts.get(p.company_id) ?? 0) + 1);
  const shown = postings.filter((p) => (!only || p.company_id === only) && matchesSearch(p, search));

  return (
    <>
      <PageBar crumbs={[{ href: '/jobs', label: 'Jobs' }, { label: 'Openings' }]}>
        {companies.length > 0 && (
          <form method="post" action="/api/companies">
            <input type="hidden" name="op" value="refresh" />
            <button type="submit" className="btn btn-sm">
              Check for new jobs
            </button>
          </form>
        )}
      </PageBar>
      <div className="wrap">
        <div className="page-head">
          <h1>Openings</h1>
          <p className="sub">
            Follow companies by their careers page and their open jobs show up here, checked once a day. Save one
            to check your fit and tailor your résumé for it.
          </p>
        </div>

        <div className="stack col-720 jobs-top">
          {error && (
            <p role="alert" className="notice notice-error">
              {error}
            </p>
          )}

          <form method="post" action="/api/companies" className="card">
            <div className="card-body stack">
              <input type="hidden" name="op" value="follow" />
              <div className="field">
                <label htmlFor="url">Follow a company</label>
                <input
                  id="url"
                  name="url"
                  type="text"
                  required
                  placeholder="https://boards.greenhouse.io/acme"
                  autoComplete="off"
                />
                <span className="hint">
                  A careers page on Greenhouse, Lever or Ashby: boards.greenhouse.io/…, jobs.lever.co/… or
                  jobs.ashbyhq.com/…. Open a company&apos;s jobs page and copy the link from a posting if you are
                  not sure. Other sites are not supported yet.
                </span>
              </div>
              <div className="row">
                <button type="submit" className="btn btn-primary">
                  Follow
                </button>
              </div>
            </div>
          </form>

          {companies.length > 0 && (
            <section>
              <h2 className="section-title">
                Following <span className="count tnum">{companies.length}</span>
              </h2>
              <ul className="stack">
                {companies.map((c) => (
                  <li key={c.id} className="card job-row">
                    <div className="job-row-head">
                      <div className="job-row-main">
                        <Link href={`/jobs/openings?company=${c.id}`} className="job-row-title">
                          {c.name}
                        </Link>
                        <span className="job-row-company tnum">
                          {ATS_LABEL[c.ats]} · {counts.get(c.id) ?? 0} open
                          {c.checked_at && ` · checked ${day(c.checked_at)}`}
                        </span>
                      </div>
                      <ConfirmButton
                        action="/api/companies"
                        fields={{ op: 'unfollow', id: c.id }}
                        label="Unfollow"
                        confirm={`Stop following ${c.name}? Jobs you saved from it stay in your jobs.`}
                      />
                    </div>
                    {c.check_error && <p className="notice notice-error">Last check failed: {c.check_error}</p>}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {postings.length > 0 && (
          <section className="jobs-list">
            <h2 className="section-title">
              {only && byCompany.get(only) ? `Open at ${byCompany.get(only)!.name}` : 'Open jobs'}{' '}
              <span className="count tnum">{shown.length}</span>
            </h2>

            <form method="get" className="row" role="search">
              {only && <input type="hidden" name="company" value={only} />}
              <label htmlFor="q" className="sr-only">
                Search titles and places
              </label>
              <input id="q" name="q" type="search" defaultValue={search} placeholder="Search titles and places" />
              <button type="submit" className="btn btn-sm">
                Search
              </button>
              {(search || only) && (
                <Link href="/jobs/openings" className="btn btn-sm">
                  Show all
                </Link>
              )}
            </form>

            <ul className="stack">
              {shown.slice(0, SHOWN).map((p) => (
                <li key={p.id} className="card job-row">
                  <div className="job-row-head">
                    <div className="job-row-main">
                      <a href={p.url} target="_blank" rel="noopener noreferrer" className="job-row-title">
                        {p.title}
                      </a>
                      <span className="job-row-company">
                        {byCompany.get(p.company_id)?.name}
                        {p.location && ` · ${p.location}`}
                        {p.posted_at && ` · posted ${day(p.posted_at)}`}
                      </span>
                    </div>
                    {p.fresh && !p.job_id && <span className="tag">New</span>}
                    {p.job_id ? (
                      <Link href={`/jobs/${p.job_id}`} className="btn btn-sm">
                        Saved: open job
                      </Link>
                    ) : (
                      <GenerateButton
                        action={`/api/postings/${p.id}`}
                        jobId={p.id}
                        op="save"
                        label="Save and check fit"
                        busyLabel="Checking your fit… about 30 seconds"
                      />
                    )}
                  </div>
                </li>
              ))}
            </ul>
            {shown.length > SHOWN && (
              <p className="hint">
                Showing the newest {SHOWN} of {shown.length}. Search to narrow them down.
              </p>
            )}
          </section>
        )}
      </div>
    </>
  );
}
