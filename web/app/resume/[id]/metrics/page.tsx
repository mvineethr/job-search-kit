import Link from 'next/link';
import { notFound } from 'next/navigation';
import { currentSid } from '@/lib/auth';
import { ensureSchema, sql, type ResumeRow } from '@/lib/db';
import { ResumeSchema, METRIC_NEEDED } from '@/lib/resume-schema';
import { loadPrompt } from '@/lib/prompts';
import { completeText } from '@/lib/provider';
import { extractJsonArray } from '@/lib/extract-json';
import PageBar from '@/components/PageBar';
import { MetricQuestionsSchema, findMarkers, type MetricQuestion } from '@/lib/metric-schema';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/** The bullet with its marker highlighted, so the hole is obvious. */
function BulletWithMarker({ text }: { text: string }) {
  const parts = text.split(METRIC_NEEDED);
  return (
    <p className="bullet-sample">
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {i < parts.length - 1 && <span className="marker-chip">{METRIC_NEEDED}</span>}
        </span>
      ))}
    </p>
  );
}

export default async function MetricsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sid = await currentSid();
  if (!sid) return null;

  await ensureSchema();
  const rows = (await sql()`
    SELECT id, title, source_text, content, parent_id, job_id, created_at, updated_at
    FROM resumes WHERE id = ${id} AND sid = ${sid}`) as unknown as ResumeRow[];
  const row = rows[0];
  if (!row) notFound();

  const parsed = ResumeSchema.safeParse(row.content);
  if (!parsed.success) notFound();
  const resume = parsed.data;

  const crumbs = [
    { href: '/resumes', label: 'Résumés' },
    { href: `/resume/${row.id}`, label: row.title },
    { label: 'Numbers' },
  ];

  const markers = findMarkers(resume);
  if (markers.length === 0) {
    return (
      <>
        <PageBar crumbs={crumbs} />
        <div className="wrap col-720 stack">
          <div className="page-head">
            <h1>No holes left</h1>
            <p className="sub">Every bullet on this résumé has its number.</p>
          </div>
          <Link href={`/resume/${row.id}`} className="btn btn-primary self-start">
            Back to the résumé
          </Link>
        </div>
      </>
    );
  }

  // Ask the model to phrase each question; fall back to a plain one if that fails.
  let questions: MetricQuestion[];
  try {
    const { text } = await completeText({
      system: loadPrompt('metric-questions'),
      messages: [{ role: 'user', content: JSON.stringify(resume, null, 2) }],
      tier: 'fast',
    });
    const got = MetricQuestionsSchema.safeParse(extractJsonArray(text) ?? []);
    questions = got.success && got.data.length > 0 ? got.data : [];
  } catch {
    questions = [];
  }

  if (questions.length === 0) {
    questions = markers.map((m, i) => ({
      id: `m${i}`,
      roleIndex: m.roleIndex,
      bulletIndex: m.bulletIndex,
      bullet: m.bullet,
      question: 'What number belongs here?',
      hint: 'A rough figure or a description of what you did is fine. Skip it if you do not know.',
    }));
  }

  return (
    <>
      <PageBar crumbs={crumbs} />
      <div className="wrap col-640 stack">
        <div className="page-head">
          <h1>Fill in your own numbers</h1>
          <p className="sub">
            These bullets are missing a figure. Nothing was invented to fill them, which is why
            they have holes. A rough number you can defend beats a precise one you cannot — and
            if you have no number, say what you actually did instead.
          </p>
        </div>

        <form method="post" action="/api/metrics" className="stack">
          <input type="hidden" name="resumeId" value={row.id} />

          {questions.map((qq, i) => (
            <div key={qq.id} className="card">
              <div className="card-body">
                <span className="q-count tnum">
                  {i + 1} of {questions.length}
                </span>

                <BulletWithMarker text={qq.bullet} />

                <input type="hidden" name={`role__${qq.id}`} value={qq.roleIndex} />
                <input type="hidden" name={`bullet__${qq.id}`} value={qq.bulletIndex} />

                <div className="field">
                  <label htmlFor={`answer__${qq.id}`} className="field-label-base">
                    {qq.question}
                  </label>
                  <input id={`answer__${qq.id}`} name={`answer__${qq.id}`} type="text" />
                  {qq.hint && <span className="hint">{qq.hint}</span>}
                </div>
              </div>
            </div>
          ))}

          <div className="form-actions form-actions-end">
            <Link href={`/resume/${row.id}`} className="btn">
              Skip for now
            </Link>
            <button type="submit" className="btn btn-primary">
              Fill these in
            </button>
          </div>

          <p className="notice">
            Leave any of them blank to skip. A bullet you skip keeps its marker, which is honest
            — an empty hole is better than a number you made up, and you can come back to it.
          </p>
        </form>
      </div>
    </>
  );
}
