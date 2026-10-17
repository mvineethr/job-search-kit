import Link from 'next/link';
import { notFound } from 'next/navigation';
import { currentSid } from '@/lib/auth';
import { ensureSchema, sql, type JobRow, type ResumeRow, type LetterRow } from '@/lib/db';
import { loadAnswers } from '@/lib/answers';
import { readMatch, viewMatch, type MatchedRequirement } from '@/lib/match';
import { isMatchStale } from '@/lib/resume-edit';
import FitMeter from '@/components/FitMeter';
import PageBar from '@/components/PageBar';
import GenerateButton from '@/components/GenerateButton';
import ConfirmButton from '@/components/ConfirmButton';

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
    SELECT id FROM letters WHERE sid = ${sid} AND job_id = ${id}
    ORDER BY created_at DESC LIMIT 1`) as unknown as LetterRow[])[0];

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
          <p className="sub">{job.company}</p>
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
              {view.openQuestions.length > 0 && (
                <Link href={`/jobs/${job.id}/questions`} className="notice notice-info notice-link">
                  <strong>Answer {Math.min(view.openQuestions.length, 8)} questions about your experience</strong>
                  <span className="notice-sub">
                    Your résumé may leave out things you have done. Answers you can back up raise the
                    score and let the tailored version use them.
                  </span>
                </Link>
              )}
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
      </div>
    </>
  );
}
