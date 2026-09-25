import Link from 'next/link';
import { currentSid } from '@/lib/auth';
import { ensureSchema, sql, type JobRow, type ResumeRow, type LetterRow } from '@/lib/db';
import AddJobForm from '@/components/AddJobForm';
import GenerateButton from '@/components/GenerateButton';
import ConfirmButton from '@/components/ConfirmButton';
import { QuestionsSchema } from '@/lib/question-schema';
import { loadAnswers, skillKey } from '@/lib/answers';

export const dynamic = 'force-dynamic';

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; answered?: string }>;
}) {
  const { error, answered } = await searchParams;
  const sid = await currentSid();
  if (!sid) return null;

  await ensureSchema();
  const q = sql();

  const jobs = (await q`
    SELECT id, company, role, description, analysis, questions, applied_at, created_at
    FROM jobs WHERE sid = ${sid} ORDER BY created_at DESC`) as unknown as JobRow[];
  const resumes = (await q`
    SELECT id, title, content, parent_id, job_id, created_at, updated_at, source_text
    FROM resumes WHERE sid = ${sid} ORDER BY updated_at DESC`) as unknown as ResumeRow[];
  const letters = (await q`
    SELECT id, kind, job_id, resume_id, content, created_at
    FROM letters WHERE sid = ${sid} ORDER BY created_at DESC`) as unknown as LetterRow[];

  const master = resumes.find((r) => !r.parent_id);
  const tailoredByJob = new Map<string, ResumeRow>();
  for (const r of resumes) if (r.job_id && !tailoredByJob.has(r.job_id)) tailoredByJob.set(r.job_id, r);
  const letterByJob = new Map<string, LetterRow>();
  for (const l of letters) if (l.job_id && !letterByJob.has(l.job_id)) letterByJob.set(l.job_id, l);

  // Questions already answered are not worth showing again.
  const answeredKeys = new Set((await loadAnswers(sid)).map((a) => skillKey(a.skill)));
  const openQuestions = new Map<string, number>();
  for (const job of jobs) {
    const parsed = QuestionsSchema.safeParse(job.questions);
    if (!parsed.success) continue;
    const open = parsed.data.filter((q) => !answeredKeys.has(skillKey(q.skill))).length;
    if (open > 0) openQuestions.set(job.id, open);
  }

  return (
    <div className="wrap">
      <div className="page-head">
        <h1>Jobs</h1>
        <p className="sub">
          Add a posting once. The tailored résumé and cover letter are both written from what
          you enter here — you never paste the description twice.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          style={{
            border: '1px solid var(--danger)',
            borderRadius: 8,
            padding: 'var(--s-3) var(--s-4)',
            marginBottom: 'var(--s-6)',
            color: 'var(--danger)',
            background: 'var(--bg-surface)',
            maxWidth: 680,
          }}
        >
          {error}
        </div>
      )}

      {answered && (
        <p
          className="note"
          style={{ maxWidth: 680, marginBottom: 'var(--s-6)', borderLeft: '3px solid var(--ok)' }}
        >
          Saved {answered} {Number(answered) === 1 ? 'answer' : 'answers'}. These apply to every
          job you tailor to from now on — tailor again to use them.
        </p>
      )}

      {!master && (
        <p className="note" style={{ maxWidth: 680, marginBottom: 'var(--s-6)' }}>
          You have not added a résumé yet. <Link href="/review">Add one first</Link> — tailoring
          and cover letters are written from it.
        </p>
      )}

      <div className="sec">
        <AddJobForm />
      </div>

      {jobs.length === 0 ? (
        <p className="note" style={{ maxWidth: 680 }}>
          No jobs yet. Add one above — paste the whole posting, including the requirements
          section, because that is where the keywords live.
        </p>
      ) : (
        <div className="sec">
          <div className="sec-head">
            <h2>Your jobs</h2>
            <span className="count">{jobs.length}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
            {jobs.map((job) => {
              const tailored = tailoredByJob.get(job.id);
              const letter = letterByJob.get(job.id);
              const matched = job.analysis?.matched?.length ?? 0;
              const missing = job.analysis?.missing?.length ?? 0;
              const total = matched + missing;

              return (
                <div
                  key={job.id}
                  style={{
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    background: 'var(--bg-surface)',
                    padding: 'var(--s-4)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--s-3)',
                  }}
                >
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', alignItems: 'baseline' }}>
                    <strong style={{ fontSize: 'var(--text-base)' }}>{job.role}</strong>
                    <span style={{ color: 'var(--text-muted)' }}>{job.company}</span>
                    {job.applied_at && (
                      <span className="pill tnum" style={{ color: 'var(--ok)' }}>
                        Applied {new Date(job.applied_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>

                  {total > 0 && (
                    <p className="tnum" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      {matched} of {total} requirements matched
                      {missing > 0 && ` · ${missing} real ${missing === 1 ? 'gap' : 'gaps'}`}
                    </p>
                  )}

                  {job.analysis?.missing && job.analysis.missing.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {job.analysis.missing.map((m) => (
                        <span
                          key={m}
                          style={{
                            fontSize: 'var(--text-xs)',
                            padding: '3px 8px',
                            borderRadius: 4,
                            background: 'var(--warn-subtle)',
                            color: 'var(--warn)',
                          }}
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  )}

                  {openQuestions.has(job.id) && (
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
                        {openQuestions.get(job.id)} questions about your experience
                      </strong>
                      <span style={{ fontSize: 'var(--text-xs)', opacity: 0.85 }}>
                        This posting asks for things your résumé does not mention. Answer them
                        and the tailored version can use the real ones.
                      </span>
                    </Link>
                  )}

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--s-2)' }}>
                    {/* Tailored résumé */}
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
                        primary
                      />
                    ) : null}

                    {/* Cover letter */}
                    {letter ? (
                      <Link href={`/letter/${letter.id}`} className="btn">
                        ✓ Cover letter
                      </Link>
                    ) : master ? (
                      <GenerateButton
                        action="/api/letter"
                        jobId={job.id}
                        label="Write a cover letter"
                        busyLabel="Writing… about a minute"
                      />
                    ) : null}

                    <form method="post" action={`/api/jobs/${job.id}`}>
                      <input type="hidden" name="op" value="applied" />
                      <button type="submit" className="btn">
                        {job.applied_at ? 'Mark not applied' : 'Mark as applied'}
                      </button>
                    </form>

                    <ConfirmButton
                      action={`/api/jobs/${job.id}`}
                      fields={{ op: 'delete' }}
                      label="Delete job"
                      confirm={`Delete ${job.role} at ${job.company}? Its tailored résumé and cover letter go with it. Your master résumé is not affected.`}
                    />
                  </div>

                  {!tailored && !letter && master && (
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>
                      Tailor first if you can — the cover letter is sharper when it is written
                      from the tailored résumé rather than your master.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
