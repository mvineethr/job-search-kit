import Link from 'next/link';
import { notFound } from 'next/navigation';
import { currentSid } from '@/lib/auth';
import { ensureSchema, sql, type JobRow } from '@/lib/db';
import { QuestionsSchema, LEVELS, LEVEL_LABEL, LEVEL_HELP } from '@/lib/question-schema';
import { readMatch, viewMatch } from '@/lib/match';
import { loadAnswers } from '@/lib/answers';
import PageBar from '@/components/PageBar';

export const dynamic = 'force-dynamic';

export default async function QuestionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const sid = await currentSid();
  if (!sid) return null;

  await ensureSchema();
  const rows = (await sql()`
    SELECT id, company, role, description, analysis, questions, match, created_at
    FROM jobs WHERE id = ${id} AND sid = ${sid}`) as unknown as JobRow[];
  const job = rows[0];
  if (!job) notFound();

  const crumbs = [
    { href: '/jobs', label: 'Jobs' },
    { href: `/jobs/${job.id}`, label: job.company },
    { label: 'Questions' },
  ];

  // Jobs matched against the résumé ask about exactly the gaps being scored.
  // Jobs added before matching existed still have their stored gap questions.
  const match = readMatch(job.match);
  const parsed = match
    ? QuestionsSchema.safeParse(viewMatch(match, await loadAnswers(sid)).openQuestions.slice(0, 8))
    : QuestionsSchema.safeParse(job.questions);
  if (!parsed.success) {
    return (
      <>
        <PageBar crumbs={crumbs} />
        <div className="wrap col-720 stack">
          <div className="page-head">
            <h1>No questions for this one</h1>
            <p className="sub">
              Your résumé already covers what this posting asks for, or the questions could not
              be worked out. Either way, you can tailor straight away.
            </p>
          </div>
          <Link href={`/jobs/${job.id}`} className="btn btn-primary self-start">
            Back to the job
          </Link>
        </div>
      </>
    );
  }

  const questions = parsed.data;

  return (
    <>
      <PageBar crumbs={crumbs} />
      <div className="wrap col-640 stack">
        <div className="page-head">
          <h1>A few things your résumé does not say</h1>
          <p className="sub">
            {job.company} asks for these and your résumé does not mention them. A résumé is not
            a complete record of what you have done — answer honestly and the tailored version
            can use the real ones.
          </p>
        </div>

        {error && (
          <p role="alert" className="notice notice-error">
            {error}
          </p>
        )}

        <div className="notice notice-info">
          Only answer <strong>{LEVEL_LABEL.solid}</strong> or <strong>{LEVEL_LABEL.deep}</strong> for
          things you could talk through in an interview. Anything below that stays off your
          résumé on purpose — that is the point of asking rather than guessing.
        </div>

        <form method="post" action="/api/answers" className="stack">
          <input type="hidden" name="jobId" value={job.id} />

          {questions.map((q, i) => (
            <fieldset key={q.id} className="card q-card">
              <input type="hidden" name={`skill__${q.id}`} value={q.skill} />

              <legend className="q-legend">
                <span className="q-count tnum">
                  Question {i + 1} of {questions.length}
                </span>
                <strong className="q-title">{q.question}</strong>
              </legend>

              {q.why && <p className="muted">{q.why}</p>}

              <div className="q-options">
                {LEVELS.map((level) => (
                  <label key={level} className="q-option">
                    <input type="radio" name={`level__${q.id}`} value={level} />
                    <span>
                      <span className="q-option-label">{LEVEL_LABEL[level]}</span>
                      <span className="q-option-help">{LEVEL_HELP[level]}</span>
                    </span>
                  </label>
                ))}
              </div>

              <div className="field">
                <label htmlFor={`detail__${q.id}`}>Where did you use it? (optional)</label>
                <input
                  id={`detail__${q.id}`}
                  name={`detail__${q.id}`}
                  type="text"
                  placeholder="Ran it across 12 services at Meridian for two years"
                />
                <span className="hint">
                  One line. This gets used to write the bullet, so specifics help.
                </span>
              </div>
            </fieldset>
          ))}

          <div className="form-actions form-actions-end">
            <Link href={`/jobs/${job.id}`} className="btn">
              Skip for now
            </Link>
            <button type="submit" className="btn btn-primary">
              Save these answers
            </button>
          </div>

          <p className="notice">
            Answers are saved against you, not this job — you will not be asked about the same
            skill again for the next posting. Leave any question blank to skip it.
          </p>
        </form>
      </div>
    </>
  );
}
