import Link from 'next/link';
import { notFound } from 'next/navigation';
import { currentSid } from '@/lib/auth';
import { ensureSchema, sql, type ResumeRow } from '@/lib/db';
import { ResumeSchema, METRIC_NEEDED } from '@/lib/resume-schema';
import { loadPrompt } from '@/lib/prompts';
import { completeText } from '@/lib/provider';
import { extractJsonArray } from '@/lib/extract-json';
import { MetricQuestionsSchema, findMarkers, type MetricQuestion } from '@/lib/metric-schema';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/** The bullet with its marker highlighted, so the hole is obvious. */
function BulletWithMarker({ text }: { text: string }) {
  const parts = text.split(METRIC_NEEDED);
  return (
    <p
      style={{
        fontFamily: 'var(--serif)',
        fontSize: 'var(--text-base)',
        lineHeight: 1.55,
        background: 'var(--doc-bg)',
        color: 'var(--doc-text)',
        border: '1px solid var(--doc-border)',
        borderRadius: 4,
        padding: 'var(--s-3)',
      }}
    >
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {i < parts.length - 1 && (
            <span
              style={{
                background: '#fdf4e0',
                color: '#8a6410',
                padding: '0 5px',
                borderRadius: 3,
                fontFamily: 'var(--sans)',
                fontSize: '0.8em',
                fontWeight: 600,
              }}
            >
              {METRIC_NEEDED}
            </span>
          )}
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

  const markers = findMarkers(resume);
  if (markers.length === 0) {
    return (
      <div className="wrap" style={{ maxWidth: 720 }}>
        <div className="page-head">
          <h1>No holes left</h1>
          <p className="sub">Every bullet on this résumé has its number.</p>
        </div>
        <Link href={`/resume/${row.id}`} className="btn btn-primary">
          Back to the résumé
        </Link>
      </div>
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
    <div className="wrap" style={{ maxWidth: 760 }}>
      <div className="page-head">
        <h1>Fill in your own numbers</h1>
        <p className="sub">
          These bullets are missing a figure. Nothing was invented to fill them, which is why
          they have holes. A rough number you can defend beats a precise one you cannot — and
          if you have no number, say what you actually did instead.
        </p>
      </div>

      <form
        method="post"
        action="/api/metrics"
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}
      >
        <input type="hidden" name="resumeId" value={row.id} />

        {questions.map((qq, i) => (
          <div
            key={qq.id}
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
            <span
              className="tnum"
              style={{
                fontSize: 'var(--text-xs)',
                letterSpacing: '.08em',
                textTransform: 'uppercase',
                color: 'var(--text-faint)',
              }}
            >
              {i + 1} of {questions.length}
            </span>

            <BulletWithMarker text={qq.bullet} />

            <input type="hidden" name={`role__${qq.id}`} value={qq.roleIndex} />
            <input type="hidden" name={`bullet__${qq.id}`} value={qq.bulletIndex} />

            <div className="field">
              <label htmlFor={`answer__${qq.id}`} style={{ fontSize: 'var(--text-base)' }}>
                {qq.question}
              </label>
              <input id={`answer__${qq.id}`} name={`answer__${qq.id}`} type="text" />
              {qq.hint && <span className="hint">{qq.hint}</span>}
            </div>
          </div>
        ))}

        <div style={{ display: 'flex', gap: 'var(--s-2)', flexWrap: 'wrap' }}>
          <button type="submit" className="btn btn-primary">
            Fill these in
          </button>
          <Link href={`/resume/${row.id}`} className="btn">
            Skip for now
          </Link>
        </div>

        <p className="note">
          Leave any of them blank to skip. A bullet you skip keeps its marker, which is honest
          — an empty hole is better than a number you made up, and you can come back to it.
        </p>
      </form>
    </div>
  );
}
