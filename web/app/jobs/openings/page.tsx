import Link from 'next/link';
import { currentSid } from '@/lib/auth';
import { ensureSchema, sql } from '@/lib/db';
import { inPlace, matchesSearch, placeChoices, type CompanyRow, type PostingRow } from '@/lib/pool';
import PageBar from '@/components/PageBar';
import GenerateButton from '@/components/GenerateButton';
import ConfirmButton from '@/components/ConfirmButton';
import { getProfile } from '@/lib/profile';
import { parseBoardUrl } from '@/lib/job-sources';
import { wantedTitle } from '@/lib/apply';
import {
  FIELDS,
  INDUSTRIES,
  SENIORITIES,
  isSearchProfileBehind,
  readSearchProfile,
  wantedRoles,
  type SearchProfile,
} from '@/lib/search-profile';
import { suggestCompanies, STARTER_COMPANIES } from '@/lib/starter-companies';

export const dynamic = 'force-dynamic';

const ATS_LABEL = { greenhouse: 'Greenhouse', lever: 'Lever', ashby: 'Ashby' } as const;
const SHOWN = 100;
const day = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

export default async function OpeningsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; q?: string; company?: string; all?: string; profile?: string; loc?: string }>;
}) {
  const { error, q: search = '', company: only = '', all, profile: profileNote, loc = '' } = await searchParams;
  const sid = await currentSid();
  if (!sid) return null;

  await ensureSchema();
  const q = sql();
  const companies = (await q`
    SELECT id, sid, ats, token, name, checked_at, check_error FROM companies
    WHERE sid = ${sid} ORDER BY name`) as unknown as CompanyRow[];
  const profile = await getProfile(sid);
  const spRows = (await q`SELECT search_profile FROM profiles WHERE sid = ${sid}`) as { search_profile: unknown }[];
  const sp = readSearchProfile(spRows[0]?.search_profile);
  const skills = (sp?.skills ?? []).map((x) => x.toLowerCase());
  // Openings that mention more of the person's skills come first; ties stay newest first.
  const postings = (await q`
    SELECT id, company_id, title, location, url, posted_at, pay, first_seen, job_id,
           first_seen > now() - interval '7 days' AS fresh,
           (SELECT count(*)::int FROM jsonb_array_elements_text(${JSON.stringify(skills)}::jsonb) s
             WHERE position(s IN lower(description)) > 0) AS skill_hits
    FROM postings
    WHERE sid = ${sid}
    ORDER BY skill_hits DESC, COALESCE(posted_at, first_seen) DESC`) as unknown as (PostingRow & {
    fresh: boolean;
    skill_hits: number;
  })[];
  const roles = wantedRoles(sp, profile);
  // What changed since the profile was built: the active master or a skill answer.
  const [changed] = (await q`
    SELECT GREATEST(
      (SELECT max(updated_at) FROM resumes WHERE sid = ${sid} AND parent_id IS NULL),
      (SELECT max(updated_at) FROM skill_answers WHERE sid = ${sid})) AS at`) as { at: string | null }[];
  const behind = sp ? isSearchProfileBehind(sp, changed?.at ?? null) : false;
  const places = placeChoices(profile?.location ?? null, profile?.preferences?.places ?? null);
  if (loc && !places.some((x) => x.toLowerCase() === loc.toLowerCase())) places.push(loc);
  // Links keep the other filters.
  const href = (over: Record<string, string>) => {
    const sp2 = new URLSearchParams({ ...(only && { company: only }), ...(search && { q: search }), ...(all && { all: '1' }), ...(loc && { loc }), ...over });
    for (const [k, v] of [...sp2]) if (!v) sp2.delete(k);
    const s = sp2.toString();
    return `/jobs/openings${s ? `?${s}` : ''}`;
  };
  const { forYou, more } = suggestCompanies(sp?.industries ?? [], companies, parseBoardUrl);

  const byCompany = new Map(companies.map((c) => [c.id, c]));
  const counts = new Map<string, number>();
  for (const p of postings) counts.set(p.company_id, (counts.get(p.company_id) ?? 0) + 1);
  const inScope = postings.filter(
    (p) => (!only || p.company_id === only) && matchesSearch(p, search) && (!loc || inPlace(p.location, loc)),
  );
  // With roles to go on, show the jobs that fit them first; "Show all" lifts the filter.
  const filtering = roles.length > 0 && !all;
  const shown = filtering ? inScope.filter((p) => wantedTitle(p.title, roles)) : inScope;

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

          {profileNote && (
            <p className="notice notice-ok">
              {profileNote === 'built'
                ? 'Your search profile is ready. Check it below and change anything that is not you.'
                : 'Saved your search profile.'}
            </p>
          )}

          <SearchProfileCard sp={sp} behind={behind} />

          {(forYou.length > 0 || more.length > 0) && (
            <section className="card">
              <div className="card-head">
                <h2>Companies to follow</h2>
              </div>
              <div className="card-body stack">
                {forYou.length > 0 && (
                  <>
                    <p className="hint">In the industries from your search profile.</p>
                    <CompanyButtons list={forYou} />
                  </>
                )}
                {more.length > 0 &&
                  (forYou.length > 0 ? (
                    <details>
                      <summary>More companies ({more.length})</summary>
                      <CompanyButtons list={more} />
                    </details>
                  ) : (
                    <CompanyButtons list={more} />
                  ))}
                <p className="hint">
                  A short starting list of {STARTER_COMPANIES.length} companies. Add any other company below by its
                  careers link.
                </p>
              </div>
            </section>
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
            {filtering && (
              <p className="hint">
                Matching your roles: {roles.slice(0, 6).join(', ')}
                {roles.length > 6 && '…'}.{skills.length > 0 && ' Those that mention more of your skills come first.'}{' '}
                <Link href={href({ all: '1' })}>Show all {inScope.length}</Link>
              </p>
            )}

            <nav aria-label="Location" className="row loc-tabs">
              <Link href={href({ loc: '' })} className={`btn btn-sm${loc ? '' : ' btn-primary'}`} aria-current={loc ? undefined : 'page'}>
                Anywhere
              </Link>
              {places.map((x) => {
                const on = x.toLowerCase() === loc.toLowerCase();
                return (
                  <Link key={x} href={href({ loc: x })} className={`btn btn-sm${on ? ' btn-primary' : ''}`} aria-current={on ? 'page' : undefined}>
                    {x}
                  </Link>
                );
              })}
            </nav>

            <form method="get" className="row" role="search">
              {only && <input type="hidden" name="company" value={only} />}
              {all && <input type="hidden" name="all" value="1" />}
              <label htmlFor="loc" className="sr-only">
                Location
              </label>
              <input id="loc" name="loc" type="search" defaultValue={loc} placeholder="City, state or Remote" />
              <label htmlFor="q" className="sr-only">
                Search titles and places
              </label>
              <input id="q" name="q" type="search" defaultValue={search} placeholder="Search titles and places" />
              <button type="submit" className="btn btn-sm">
                Search
              </button>
              {(search || only || loc) && (
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
                      <Link href={`/jobs/openings/${p.id}`} className="job-row-title">
                        {p.title}
                      </Link>
                      <span className="job-row-company">
                        {byCompany.get(p.company_id)?.name}
                        {p.location && ` · ${p.location}`}
                        {p.pay && ` · ${p.pay}`}
                        {p.posted_at && ` · posted ${day(p.posted_at)}`}
                        {p.skill_hits > 0 && ` · mentions ${p.skill_hits} of your skills`}
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

function CompanyButtons({ list }: { list: { name: string; url: string }[] }) {
  return (
    <div className="row">
      {list.map((c) => (
        <form key={c.url} method="post" action="/api/companies">
          <input type="hidden" name="op" value="follow" />
          <input type="hidden" name="url" value={c.url} />
          <button type="submit" className="btn btn-sm">
            Follow {c.name}
          </button>
        </form>
      ))}
    </div>
  );
}

/**
 * What the app searches for on the person's behalf. Drafted from the résumé by AI,
 * every part editable, and used only to find and rank openings.
 */
function SearchProfileCard({ sp, behind }: { sp: SearchProfile | null; behind: boolean }) {
  const build = (label: string) => (
    <GenerateButton
      action="/api/profile/search"
      jobId=""
      op="build"
      label={label}
      busyLabel="Reading your résumé… about 20 seconds"
      primary={!sp}
    />
  );
  if (!sp) {
    return (
      <section className="card">
        <div className="card-head">
          <h2>Your search profile</h2>
        </div>
        <div className="card-body stack">
          <p className="hint">
            The app reads your résumé and what you told it in your profile, and drafts the job titles, nearby roles
            and industries to look for. You can change all of it. It is only used to find and sort openings, never
            shown to employers or added to your résumé.
          </p>
          <div className="row">{build('Build it from my résumé')}</div>
        </div>
      </section>
    );
  }
  const chips = (xs: string[]) =>
    xs.length ? (
      <span className="row">
        {xs.map((x) => (
          <span key={x} className="tag">
            {x}
          </span>
        ))}
      </span>
    ) : (
      <span className="hint">None</span>
    );
  return (
    <section className="card">
      <div className="card-head">
        <h2>Your search profile</h2>
      </div>
      <div className="card-body stack">
        {behind && (
          <p className="notice">
            Your résumé or skill answers changed since this was built. Rebuild below to include them
            {sp.edited ? '; it replaces your changes here' : ''}.
          </p>
        )}
        {sp.summary && <p>{sp.summary}</p>}
        {!sp.edited && (
          <p className="hint">It updates by itself when you add a résumé, answer skill questions or change your profile.</p>
        )}
        <dl className="sp-list">
          <dt>Roles</dt>
          <dd>{chips(sp.roles)}</dd>
          <dt>Nearby roles</dt>
          <dd>{chips(sp.nearby_roles)}</dd>
          <dt>Fields</dt>
          <dd>{chips(sp.fields)}</dd>
          <dt>Industries</dt>
          <dd>{chips(sp.industries)}</dd>
          {sp.seniority && (
            <>
              <dt>Level</dt>
              <dd>{sp.seniority}</dd>
            </>
          )}
          <dt>Skills</dt>
          <dd>{chips(sp.skills)}</dd>
        </dl>
        <details>
          <summary>Change it</summary>
          <form method="post" action="/api/profile/search" className="stack">
            <input type="hidden" name="op" value="save" />
            <div className="field">
              <label htmlFor="sp-roles">Roles you want (comma separated, up to 5)</label>
              <input id="sp-roles" name="roles" type="text" defaultValue={sp.roles.join(', ')} />
            </div>
            <div className="field">
              <label htmlFor="sp-nearby">Nearby roles to include (up to 6)</label>
              <input id="sp-nearby" name="nearby_roles" type="text" defaultValue={sp.nearby_roles.join(', ')} />
            </div>
            <fieldset className="field">
              <legend>Fields (up to 3)</legend>
              <div className="row">
                {FIELDS.map((f) => (
                  <label key={f}>
                    <input type="checkbox" name="fields" value={f} defaultChecked={sp.fields.includes(f)} /> {f}
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset className="field">
              <legend>Industries (up to 3)</legend>
              <div className="row">
                {INDUSTRIES.map((f) => (
                  <label key={f}>
                    <input type="checkbox" name="industries" value={f} defaultChecked={sp.industries.includes(f)} /> {f}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="field">
              <label htmlFor="sp-level">Level</label>
              <select id="sp-level" name="seniority" defaultValue={sp.seniority}>
                <option value="">Not set</option>
                {SENIORITIES.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="sp-skills">Skills (up to 12; openings that mention them come first)</label>
              <input id="sp-skills" name="skills" type="text" defaultValue={sp.skills.join(', ')} />
            </div>
            <div className="row">
              <button type="submit" className="btn btn-primary">
                Save
              </button>
            </div>
          </form>
        </details>
        <div className="row">
          {build('Rebuild from my résumé')}
          {sp.edited && <span className="hint">Rebuilding replaces your changes.</span>}
        </div>
      </div>
    </section>
  );
}
