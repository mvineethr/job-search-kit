import Link from 'next/link';
import { notFound } from 'next/navigation';
import { currentSid } from '@/lib/auth';
import { ensureSchema, sql, type JobRow } from '@/lib/db';
import { QuestionsSchema, LEVELS, LEVEL_LABEL, LEVEL_HELP } from '@/lib/question-schema';
import { readMatch, viewMatch } from '@/lib/match';
import { loadAnswers } from '@/lib/answers';

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

  // Jobs matched against the résumé ask about exactly the gaps being scored.
  // Jobs added before matching existed still have their stored gap questions.
  const match = readMatch(job.match);
  const parsed = match
    ? QuestionsSchema.safeParse(viewMatch(match, await loadAnswers(sid)).openQuestions.slice(0, 8))
    : QuestionsSchema.safeParse(job.questions);
  if (!parsed.success) {
    return (
      <div className="wrap" style={{ maxWidth: 720 }}>
        <div className="page-head">
          <h1>No questions for this one</h1>
          <p className="sub">
            Your résumé already covers what this posting asks for, or the questions could not
            be worked out. Either way, you can tailor straight away.
          </p>
        </div>
        <Link href={`/jobs/${job.id}`} className="btn btn-primary">
          Back to the job
        </Link>
      </div>
    );
  }

  const questions = parsed.data;

  return (
    <div className="wrap" style={{ maxWidth: 760 }}>
      <div className="page-head">
        <h1>A few things your résumé does not say</h1>
        <p className="sub">
          {job.company} asks for these and your résumé does not mention them. A résumé is not
          a complete record of what you have done — answer honestly and the tailored version
          can use the real ones.
        </p>
      </div>

      {error && (
        <p role="alert" className="note" style={{ maxWidth: 680, marginBottom: 'var(--s-4)', borderLeft: '3px solid var(--danger)', color: 'var(--danger)' }}>
          {error}
        </p>
      )}

      <div
        className="note"
        style={{ maxWidth: 680, marginBottom: 'var(--s-6)', borderLeft: '3px solid var(--accent)' }}
      >
        Only answer <strong>{LEVEL_LABEL.solid}</strong> or <strong>{LEVEL_LABEL.deep}</strong> for
        things you could talk through in an interview. Anything below that stays off your
        résumé on purpose — that is the point of asking rather than guessing.
      </div>

      <form
        method="post"
        action="/api/answers"
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}
      >
        <input type="hidden" name="jobId" value={job.id} />

        {questions.map((q, i) => (
          <fieldset
            key={q.id}
            style={{
              border: '1px solid var(--border)',
              borderRadius: 8,
              background: 'var(--bg-surface)',
              padding: 'var(--s-4)',
              margin: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--s-3)',
            }}
          >
            <input type="hidden" name={`skill__${q.id}`} value={q.skill} />

            <legend style={{ padding: 0, float: 'none' }}>
              <span
                className="tnum"
                style={{
                  fontSize: 'var(--text-xs)',
                  letterSpacing: '.08em',
                  textTransform: 'uppercase',
                  color: 'var(--text-faint)',
                  display: 'block',
                  marginBottom: 4,
                }}
              >
                Question {i + 1} of {questions.length}
              </span>
              <strong style={{ fontSize: 'var(--text-lg)', fontWeight: 600 }}>{q.question}</strong>
            </legend>

            {q.why && (
              <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', lineHeight: 1.5 }}>
                {q.why}
              </p>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {LEVELS.map((level) => (
                <label
                  key={level}
                  style={{
                    display: 'flex',
                    gap: 'var(--s-3)',
                    alignItems: 'flex-start',
                    padding: '9px 11px',
                    border: '1px solid var(--border)',
                    borderRadius: 4,
                    background: 'var(--bg-page)',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="radio"
                    name={`level__${q.id}`}
                    value={level}
                    style={{ marginTop: 3 }}
                  />
                  <span>
                    <span style={{ fontWeight: 500, display: 'block' }}>{LEVEL_LABEL[level]}</span>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      {LEVEL_HELP[level]}
                    </span>
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

        <div style={{ display: 'flex', gap: 'var(--s-2)', flexWrap: 'wrap' }}>
          <button type="submit" className="btn btn-primary">
            Save these answers
          </button>
          <Link href={`/jobs/${job.id}`} className="btn">
            Skip for now
          </Link>
        </div>

        <p className="note">
          Answers are saved against you, not this job — you will not be asked about the same
          skill again for the next posting. Leave any question blank to skip it.
        </p>
      </form>
    </div>
  );
}
