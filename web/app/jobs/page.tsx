import Link from 'next/link';
import { currentSid } from '@/lib/auth';
import { ensureSchema, sql, type JobRow, type ResumeRow, type LetterRow } from '@/lib/db';
import AddJobForm from '@/components/AddJobForm';
import GenerateButton from '@/components/GenerateButton';
import ConfirmButton from '@/components/ConfirmButton';
import { QuestionsSchema } from '@/lib/question-schema';
import { loadAnswers, skillKey } from '@/lib/answers';
import { readMatch, viewMatch, type MatchView } from '@/lib/match';
import FitMeter from '@/components/FitMeter';
import PageBar from '@/components/PageBar';

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
    SELECT id, company, role, description, analysis, questions, match, applied_at, created_at
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
  const answers = await loadAnswers(sid);
  const answeredKeys = new Set(answers.map((a) => skillKey(a.skill)));
  const openQuestions = new Map<string, number>();
  const views = new Map<string, MatchView>();
  for (const job of jobs) {
    const match = readMatch(job.match);
    if (match) {
      const view = viewMatch(match, answers);
      views.set(job.id, view);
      if (view.openQuestions.length > 0) openQuestions.set(job.id, Math.min(view.openQuestions.length, 8));
      continue;
    }
    // Jobs added before matching existed keep their stored gap questions.
    const parsed = QuestionsSchema.safeParse(job.questions);
    if (!parsed.success) continue;
    const open = parsed.data.filter((q) => !answeredKeys.has(skillKey(q.skill))).length;
    if (open > 0) openQuestions.set(job.id, open);
  }

  return (
    <>
      <PageBar crumbs={[{ label: 'Jobs' }]} />
      <div className="wrap">
        <div className="page-head">
          <h1>Jobs</h1>
          <p className="sub">
            Add a posting once. The tailored résumé and cover letter are both written from what
            you enter here — you never paste the description twice.
          </p>
        </div>

        <div className="stack col-720 jobs-top">
          {error && (
            <p role="alert" className="notice notice-error">
              {error}
            </p>
          )}

          {answered && (
            <p className="notice notice-ok">
              Saved {answered} {Number(answered) === 1 ? 'answer' : 'answers'}. These apply to every
              job you tailor to from now on — tailor again to use them.
            </p>
          )}

          {!master && (
            <p className="notice">
              You have not added a résumé yet. <Link href="/review">Add one first</Link> — tailoring
              and cover letters are written from it.
            </p>
          )}

          <AddJobForm />

          {jobs.length === 0 && (
            <p className="notice">
              No jobs yet. Add one above — paste the whole posting, including the requirements
              section, because that is where the keywords live.
            </p>
          )}
        </div>

        {jobs.length > 0 && (
          <section className="jobs-list">
            <h2 className="section-title">
              Your jobs <span className="count tnum">{jobs.length}</span>
            </h2>

            <div className="stack">
              {jobs.map((job) => {
                const tailored = tailoredByJob.get(job.id);
                const letter = letterByJob.get(job.id);
                const view = views.get(job.id);
                // The tailoring's own matched/missing is shown only for jobs without a fit check.
                const matched = view ? 0 : (job.analysis?.matched?.length ?? 0);
                const missing = view ? 0 : (job.analysis?.missing?.length ?? 0);
                const total = matched + missing;

                return (
                  <div key={job.id} className="card job-row">
                    <div className="job-row-head">
                      <div className="job-row-main">
                        <Link href={`/jobs/${job.id}`} className="job-row-title">
                          {job.role}
                        </Link>
                        <span className="job-row-company">{job.company}</span>
                      </div>

                      {view ? (
                        <div className="job-row-fit">
                          <FitMeter view={view} />
                        </div>
                      ) : (
                        master && (
                          <Link href={`/jobs/${job.id}`} className="job-row-hint">
                            Check how well your résumé fits this job
                          </Link>
                        )
                      )}

                      {(job.applied_at || openQuestions.has(job.id)) && (
                        <div className="job-row-tags">
                          {job.applied_at && (
                            <span className="tag tag-ok tnum">
                              Applied {new Date(job.applied_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                          {openQuestions.has(job.id) && (
                            <Link href={`/jobs/${job.id}/questions`} className="tag tag-accent">
                              {openQuestions.get(job.id)} questions
                            </Link>
                          )}
                        </div>
                      )}
                    </div>

                    {total > 0 && (
                      <p className="tnum job-row-note">
                        {matched} of {total} requirements matched
                        {missing > 0 && ` · ${missing} real ${missing === 1 ? 'gap' : 'gaps'}`}
                      </p>
                    )}

                    {!view && job.analysis?.missing && job.analysis.missing.length > 0 && (
                      <div className="job-row-tags">
                        {job.analysis.missing.map((m) => (
                          <span key={m} className="tag tag-warn">
                            {m}
                          </span>
                        ))}
                      </div>
                    )}

                    {openQuestions.has(job.id) && (
                      <p className="job-row-note">
                        This posting asks for things your résumé does not mention. Answer the questions
                        and the tailored version can use the real ones.
                      </p>
                    )}

                    <div className="job-row-actions">
                      {/* Tailored résumé */}
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
                          primary
                        />
                      ) : null}

                      {/* Cover letter */}
                      {letter ? (
                        <Link href={`/letter/${letter.id}`} className="btn btn-sm">
                          Cover letter
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
                        <button type="submit" className="btn btn-sm">
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
                      <p className="job-row-note">
                        Tailor first if you can — the cover letter is sharper when it is written
                        from the tailored résumé rather than your master.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
