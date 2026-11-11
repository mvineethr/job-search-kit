import Link from 'next/link';
import { notFound } from 'next/navigation';
import { currentSid } from '@/lib/auth';
import { ensureSchema, sql, type JobRow, type ResumeRow, type LetterRow } from '@/lib/db';
import { loadAnswers } from '@/lib/answers';
import { readMatch, viewMatch, type MatchedRequirement, type MatchView } from '@/lib/match';
import { isMatchStale } from '@/lib/resume-edit';
import FitMeter from '@/components/FitMeter';
import PageBar from '@/components/PageBar';
import GenerateButton from '@/components/GenerateButton';
import ConfirmButton from '@/components/ConfirmButton';
import type { FormQuestion } from '@/lib/apply';

export const dynamic = 'force-dynamic';

const STATUS: Record<MatchedRequirement['status'], { label: string; tone: 'ok' | 'warn' | 'danger' | 'muted' }> = {
  met: { label: 'Shown', tone: 'ok' },
  partial: { label: 'Partly', tone: 'warn' },
  missing: { label: 'Not shown', tone: 'danger' },
  unknown: { label: 'Check yourself', tone: 'muted' },
};

function RequirementList({ title, items }: { title: string; items: MatchedRequirement[] }) {
  if (items.length === 0) return null;
  return (
    <section>
      <h2 className="section-title">
        {title} <span className="count tnum">{items.length}</span>
      </h2>
      <ul className="req-list">
        {items.map((r) => {
          const s = STATUS[r.status];
          return (
            <li key={r.id} className="req">
              <span className={`dot dot-${s.tone}`} aria-hidden="true" />
              <div className="req-main">
                <span className="req-text">{r.text}</span>
                {r.evidence ? (
                  <span className="req-evidence">{r.answered ? r.evidence : <>From your résumé: “{r.evidence}”</>}</span>
                ) : (
                  r.status === 'missing' && <span className="req-evidence">Not on your résumé</span>
                )}
              </div>
              <span className={`tag ${s.tone === 'muted' ? '' : `tag-${s.tone}`}`}>{s.label}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/**
 * The apply step. The app never presses Submit: no permitted way exists (lib/apply.ts),
 * so it lays out what is ready and what only the person can answer, and links to the form.
 */
function ApplyCard({ url, form, tailored, letter }: { url: string; form: FormQuestion[] | null; tailored: boolean; letter: boolean }) {
  const yours = form?.filter((f) => f.who === 'you') ?? [];
  return (
    <section className="card col-640 apply-card">
      <div className="card-head">
        <h2>Apply on the company&apos;s page</h2>
      </div>
      <div className="card-body stack">
        <p className="hint">
          Applications are sent by you, on the employer&apos;s own form. The app gets everything ready but never
          submits for you, and never answers a question about you that you have not answered yourself.
        </p>
        <ul className="apply-list">
          <li>{tailored ? 'Tailored résumé: ready. Download it as PDF or Word from its page.' : 'Tailored résumé: not yet. Tailor it first (top of the page).'}</li>
          <li>{letter ? 'Cover letter: ready.' : 'Cover letter: not written. Optional on most forms.'}</li>
        </ul>
        {form === null ? (
          <p className="notice">This site does not publish its form, so check the questions on the page before you start.</p>
        ) : yours.length > 0 ? (
          <div className="stack">
            <strong>Only you can answer these</strong>
            <ul className="apply-list">
              {yours.map((f, i) => (
                <li key={i}>
                  {f.label}
                  {f.required ? '' : ' (optional)'}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="notice notice-ok">The form only asks for your details, résumé and letter.</p>
        )}
        <div className="row">
          <a href={url} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
            Open the application
          </a>
          <span className="hint">Then come back and mark it as applied.</span>
        </div>
      </div>
    </section>
  );
}

/**
 * Plain next steps from the verified requirements. Nothing here suggests a claim:
 * a gap is either something they did and can say (the questions) or a real gap.
 */
function ImproveCard({ view, jobId, tailored }: { view: MatchView; jobId: string; tailored: boolean }) {
  const missing = view.requirements.filter((r) => r.kind === 'must' && r.status === 'missing');
  const partial = view.requirements.filter((r) => r.status === 'partial' && !r.answered);
  // Answered "tried it": shown honestly on the tailored résumé, never as experience.
  const tried = view.requirements.filter((r) => r.answered && r.status === 'partial');
  const steps: React.ReactNode[] = [];
  if (view.openQuestions.length > 0)
    steps.push(
      <>
        <Link href={`/jobs/${jobId}/questions`}>Answer {Math.min(view.openQuestions.length, 8)} quick questions</Link> about
        things the posting asks for. If you have done them, your score goes up and the tailored résumé can show them.
        You only answer each skill once; every later job reuses it.
      </>,
    );
  if (missing.length > 0)
    steps.push(
      <>
        Must-haves your résumé does not show: {missing.map((r) => r.text).join('; ')}. If you have done one, add it
        to your résumé in your own words. If not, it is a real gap: say how you would close it in the cover letter
        rather than claim it.
      </>,
    );
  if (partial.length > 0)
    steps.push(
      <>
        Partly shown: {partial.map((r) => r.text).join('; ')}. Make the bullet that touches each one say it plainly,
        with the result it had.
      </>,
    );
  if (tried.length > 0)
    steps.push(
      <>
        You said you have tried: {tried.map((r) => r.skill ?? r.text).join(', ')}. The tailored résumé lists these under
        “Working knowledge”, not as experience, so the keyword is there and you can stand behind every word.
      </>,
    );
  if (!tailored)
    steps.push(<>Tailor your résumé for this job. It leads with what this posting asks for and keeps only what is true.</>);
  if (steps.length === 0) return null;
  return (
    <section className="card">
      <div className="card-head">
        <h2>How to improve your match</h2>
      </div>
      <div className="card-body">
        <ol className="apply-list">
          {steps.map((x, i) => (
            <li key={i}>{x}</li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export default async function JobPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; answered?: string; was?: string }>;
}) {
  const { id } = await params;
  const { error, answered, was } = await searchParams;
  const sid = await currentSid();
  if (!sid) return null;

  await ensureSchema();
  const q = sql();
  const job = ((await q`
    SELECT id, company, role, description, analysis, match, applied_at, created_at
    FROM jobs WHERE id = ${id} AND sid = ${sid}`) as unknown as JobRow[])[0];
  if (!job) notFound();

  const master = ((await q`
    SELECT id, updated_at FROM resumes WHERE sid = ${sid} AND parent_id IS NULL
    ORDER BY updated_at DESC LIMIT 1`) as unknown as ResumeRow[])[0];
  const tailored = ((await q`
    SELECT id FROM resumes WHERE sid = ${sid} AND job_id = ${id} AND parent_id IS NOT NULL
    ORDER BY updated_at DESC LIMIT 1`) as unknown as ResumeRow[])[0];
  const letter = ((await q`
    SELECT id FROM letters WHERE sid = ${sid} AND job_id = ${id} AND kind = 'cover'
    ORDER BY created_at DESC LIMIT 1`) as unknown as LetterRow[])[0];
  // Set when the job was saved from a followed company's openings.
  const posting = ((await q`
    SELECT id, url, form, location, pay FROM postings WHERE sid = ${sid} AND job_id = ${id} LIMIT 1`) as {
    id: string;
    url: string;
    form: FormQuestion[] | null;
    location: string;
    pay: string;
  }[])[0];

  const match = readMatch(job.match);
  // The score was verified against the master as it was; an edit since then can change it.
  const stale = Boolean(match && master && isMatchStale(master.updated_at, match.created_at));
  const view = match ? viewMatch(match, await loadAnswers(sid)) : null;
  const wasScore = was !== undefined ? Number(was) : null;

  const scored = view?.requirements.filter((r) => r.status !== 'unknown') ?? [];

  return (
    <>
      <PageBar crumbs={[{ href: '/jobs', label: 'Jobs' }, { label: job.company }]}>
        <form method="post" action={`/api/jobs/${job.id}`}>
          <input type="hidden" name="op" value="applied" />
          <input type="hidden" name="back" value={`/jobs/${job.id}`} />
          <button type="submit" className="btn btn-sm">
            {job.applied_at ? 'Mark not applied' : 'Mark as applied'}
          </button>
        </form>

        {view && master && !stale && (
          <GenerateButton
            action={`/api/jobs/${job.id}`}
            op="match"
            jobId={job.id}
            label="Re-check fit"
            busyLabel="Checking… about 30 seconds"
          />
        )}

        <ConfirmButton
          action={`/api/jobs/${job.id}`}
          fields={{ op: 'delete' }}
          label="Delete job"
          confirm={`Delete ${job.role} at ${job.company}? Its tailored résumé and cover letter go with it. Your master résumé is not affected.`}
        />

        {letter ? (
          <Link href={`/letter/${letter.id}`} className="btn btn-sm">
            Cover letter
          </Link>
        ) : master ? (
          <GenerateButton action="/api/letter" jobId={job.id} label="Write a cover letter" busyLabel="Writing… about a minute" />
        ) : null}

        {master && (
          <Link href={`/email?job=${job.id}`} className="btn btn-sm">
            Cold email
          </Link>
        )}

        {tailored ? (
          <Link href={`/resume/${tailored.id}`} className="btn btn-sm">
            Tailored résumé
          </Link>
        ) : master ? (
          <GenerateButton
            action="/api/tailor"
            jobId={job.id}
            resumeId={master.id}
            label="Tailor my résumé"
            busyLabel="Tailoring… about a minute"
            primary={Boolean(view)}
          />
        ) : null}
      </PageBar>

      <div className="wrap job">
        <div className="page-head">
          <h1>{job.role}</h1>
          <p className="sub">
            {job.company}
            {posting?.location && ` · ${posting.location}`}
            {posting && ` · ${posting.pay || 'Pay not listed'}`}
          </p>
        </div>

        {error && (
          <p role="alert" className="notice notice-error">
            {error}
          </p>
        )}

        {answered && (
          <p className="notice notice-ok tnum">
            Saved {answered} {Number(answered) === 1 ? 'answer' : 'answers'}.{' '}
            {view?.score != null && wasScore !== null && view.score !== wasScore
              ? `Your fit went from ${wasScore} to ${view.score} from what you told us.`
              : 'They apply to every job you tailor to from now on.'}
          </p>
        )}

        {posting && !job.applied_at && (
          <ApplyCard url={posting.url} form={posting.form} tailored={Boolean(tailored)} letter={Boolean(letter)} />
        )}

        {!view ? (
          <div className="card col-640">
            <div className="card-body">
              {master ? (
                <div className="stack">
                  <p className="notice">This job has not been checked against your résumé yet.</p>
                  <div>
                    <GenerateButton
                      action={`/api/jobs/${job.id}`}
                      op="match"
                      jobId={job.id}
                      label="Check my fit"
                      busyLabel="Checking… about 30 seconds"
                      primary
                    />
                  </div>
                </div>
              ) : (
                <p className="notice">
                  <Link href="/review">Add your résumé</Link> first — the fit check compares it
                  against this posting.
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="job-grid">
            <aside className="job-score card">
              <div className="card-body stack">
                {stale && (
                  <div className="notice notice-warn stack">
                    <p>Your master résumé changed since this score was made.</p>
                    <GenerateButton
                      action={`/api/jobs/${job.id}`}
                      op="match"
                      jobId={job.id}
                      label="Re-check fit"
                      busyLabel="Checking… about 30 seconds"
                      primary
                    />
                  </div>
                )}
                <FitMeter view={view} large />
                <p className="fit-counts">
                  This measures how much of what the posting asks for your résumé shows. It is not a
                  prediction of whether you will get an interview.
                </p>
              </div>
            </aside>
            <div className="stack">
              <ImproveCard view={view} jobId={job.id} tailored={Boolean(tailored)} />
              {view.checkYourself.length > 0 && (
                <p className="notice">
                  <strong>Check these yourself.</strong> Résumés do not usually say them, so they
                  are not counted: {view.checkYourself.map((r) => r.text).join('; ')}.
                </p>
              )}
              <RequirementList title="Must-haves" items={scored.filter((r) => r.kind === 'must')} />
              <RequirementList title="Nice to have" items={scored.filter((r) => r.kind === 'nice')} />
            </div>
          </div>
        )}

        <details className="card col-720 job-description">
          <summary className="card-head">
            <h2>Job description</h2>
          </summary>
          <div className="card-body">
            {posting && (
              <p className="hint">
                <Link href={`/jobs/openings/${posting.id}`}>Opening details</Link> ·{' '}
                <a href={posting.url} target="_blank" rel="noopener noreferrer">
                  Posting on the company&apos;s site
                </a>
              </p>
            )}
            <div className="posting-text">{job.description}</div>
          </div>
        </details>
      </div>
    </>
  );
}
