import Link from 'next/link';
import { notFound } from 'next/navigation';
import { currentSid } from '@/lib/auth';
import { ensureSchema, sql, type JobRow, type ResumeRow, type LetterRow } from '@/lib/db';
import { loadAnswers } from '@/lib/answers';
import { readMatch, viewMatch, type MatchedRequirement } from '@/lib/match';
import FitMeter from '@/components/FitMeter';
import GenerateButton from '@/components/GenerateButton';
import ConfirmButton from '@/components/ConfirmButton';

export const dynamic = 'force-dynamic';

const STATUS: Record<MatchedRequirement['status'], { label: string; color: string }> = {
  met: { label: 'Shown', color: 'var(--ok)' },
  partial: { label: 'Partly', color: 'var(--warn)' },
  missing: { label: 'Not shown', color: 'var(--danger)' },
  unknown: { label: 'Check yourself', color: 'var(--text-muted)' },
};

function RequirementList({ title, items }: { title: string; items: MatchedRequirement[] }) {
  if (items.length === 0) return null;
  return (
    <div className="sec">
      <div className="sec-head">
        <h2>{title}</h2>
        <span className="count">{items.length}</span>
      </div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--s-2)' }}>
        {items.map((r) => (
          <li
            key={r.id}
            style={{
              border: '1px solid var(--border)',
              borderLeft: `3px solid ${STATUS[r.status].color}`,
              borderRadius: 4,
              background: 'var(--bg-surface)',
              padding: 'var(--s-3)',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            <div style={{ display: 'flex', gap: 'var(--s-2)', alignItems: 'baseline', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: STATUS[r.status].color, minWidth: 72 }}>
                {STATUS[r.status].label}
              </span>
              <span>{r.text}</span>
            </div>
            {r.evidence ? (
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                {r.answered ? r.evidence : <>From your résumé: “{r.evidence}”</>}
              </span>
            ) : (
              r.status === 'missing' && (
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>Not on your résumé</span>
              )
            )}
          </li>
        ))}
      </ul>
    </div>
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
    SELECT id FROM resumes WHERE sid = ${sid} AND parent_id IS NULL
    ORDER BY updated_at DESC LIMIT 1`) as unknown as ResumeRow[])[0];
  const tailored = ((await q`
    SELECT id FROM resumes WHERE sid = ${sid} AND job_id = ${id} AND parent_id IS NOT NULL
    ORDER BY updated_at DESC LIMIT 1`) as unknown as ResumeRow[])[0];
  const letter = ((await q`
    SELECT id FROM letters WHERE sid = ${sid} AND job_id = ${id}
    ORDER BY created_at DESC LIMIT 1`) as unknown as LetterRow[])[0];

  const match = readMatch(job.match);
  const view = match ? viewMatch(match, await loadAnswers(sid)) : null;
  const wasScore = was !== undefined ? Number(was) : null;

  const scored = view?.requirements.filter((r) => r.status !== 'unknown') ?? [];

  return (
    <div className="wrap" style={{ maxWidth: 820 }}>
      <div className="crumb" style={{ marginBottom: 'var(--s-4)' }}>
        <Link href="/jobs">Jobs</Link>
        <span className="sep">›</span>
        <strong>
          {job.company} — {job.role}
        </strong>
      </div>

      <div className="page-head">
        <h1>{job.role}</h1>
        <p className="sub">{job.company}</p>
      </div>

      {error && (
        <p role="alert" className="note" style={{ marginBottom: 'var(--s-6)', borderLeft: '3px solid var(--danger)', color: 'var(--danger)' }}>
          {error}
        </p>
      )}

      {answered && (
        <p className="note tnum" style={{ marginBottom: 'var(--s-6)', borderLeft: '3px solid var(--ok)' }}>
          Saved {answered} {Number(answered) === 1 ? 'answer' : 'answers'}.{' '}
          {view?.score != null && wasScore !== null && view.score !== wasScore
            ? `Your fit went from ${wasScore} to ${view.score} from what you told us.`
            : 'They apply to every job you tailor to from now on.'}
        </p>
      )}

      {!view ? (
        <div className="sec">
          {master ? (
            <>
              <p className="note" style={{ marginBottom: 'var(--s-3)' }}>
                This job has not been checked against your résumé yet.
              </p>
              <GenerateButton
                action={`/api/jobs/${job.id}`}
                op="match"
                jobId={job.id}
                label="Check my fit"
                busyLabel="Checking… about 30 seconds"
                primary
              />
            </>
          ) : (
            <p className="note">
              <Link href="/review">Add your résumé</Link> first — the fit check compares it
              against this posting.
            </p>
          )}
        </div>
      ) : (
        <>
          <div className="sec">
            <FitMeter view={view} large />
            <p className="note" style={{ marginTop: 'var(--s-3)' }}>
              This measures how much of what the posting asks for your résumé shows. It is not a
              prediction of whether you will get an interview.
            </p>
          </div>

          {view.checkYourself.length > 0 && (
            <div className="sec">
              <p className="note">
                <strong>Check these yourself.</strong> Résumés do not usually say them, so they
                are not counted: {view.checkYourself.map((r) => r.text).join('; ')}.
              </p>
            </div>
          )}

          {view.openQuestions.length > 0 && (
            <div className="sec">
              <Link
                href={`/jobs/${job.id}/questions`}
                style={{
                  display: 'block',
                  border: '1px solid var(--accent)',
                  borderRadius: 4,
                  padding: 'var(--s-3)',
                  background: 'var(--accent-subtle)',
                  color: 'var(--accent)',
                  textDecoration: 'none',
                }}
              >
                <strong style={{ display: 'block', fontSize: 'var(--text-sm)' }}>
                  Answer {Math.min(view.openQuestions.length, 8)} questions about your experience
                </strong>
                <span style={{ fontSize: 'var(--text-xs)', opacity: 0.85 }}>
                  Your résumé may leave out things you have done. Answers you can back up raise the
                  score and let the tailored version use them.
                </span>
              </Link>
            </div>
          )}

          <RequirementList title="Must-haves" items={scored.filter((r) => r.kind === 'must')} />
          <RequirementList title="Nice to have" items={scored.filter((r) => r.kind === 'nice')} />
        </>
      )}

      <div className="sec" style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--s-2)' }}>
        {tailored ? (
          <Link href={`/resume/${tailored.id}`} className="btn">
            ✓ Tailored résumé
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

        {letter ? (
          <Link href={`/letter/${letter.id}`} className="btn">
            ✓ Cover letter
          </Link>
        ) : master ? (
          <GenerateButton action="/api/letter" jobId={job.id} label="Write a cover letter" busyLabel="Writing… about a minute" />
        ) : null}

        <form method="post" action={`/api/jobs/${job.id}`}>
          <input type="hidden" name="op" value="applied" />
          <input type="hidden" name="back" value={`/jobs/${job.id}`} />
          <button type="submit" className="btn">
            {job.applied_at ? 'Mark not applied' : 'Mark as applied'}
          </button>
        </form>

        {view && master && (
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
      </div>
    </div>
  );
}
