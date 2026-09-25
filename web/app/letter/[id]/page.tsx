import Link from 'next/link';
import { notFound } from 'next/navigation';
import { currentSid } from '@/lib/auth';
import { ensureSchema, sql, type LetterRow, type JobRow } from '@/lib/db';
import { LetterSchema, wordCount } from '@/lib/letter-schema';
import { METRIC_NEEDED } from '@/lib/resume-schema';
import PrintButton from '@/components/PrintButton';
import CopyButton from '@/components/CopyButton';
import AiNotice from '@/components/AiNotice';
import GenericPhrases from '@/components/GenericPhrases';

export const dynamic = 'force-dynamic';

function Para({ text }: { text: string }) {
  const parts = text.split(METRIC_NEEDED);
  return (
    <p style={{ marginBottom: 16, maxWidth: '68ch' }}>
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {i < parts.length - 1 && (
            <span
              style={{
                background: '#fdf4e0',
                color: '#8a6410',
                padding: '0 4px',
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

export default async function LetterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sid = await currentSid();
  if (!sid) return null;

  await ensureSchema();
  const rows = (await sql()`
    SELECT id, kind, job_id, resume_id, content, created_at
    FROM letters WHERE id = ${id} AND sid = ${sid}`) as unknown as LetterRow[];
  const row = rows[0];
  if (!row) notFound();

  const parsed = LetterSchema.safeParse(row.content);
  if (!parsed.success) notFound();
  const letter = parsed.data;

  const jobs = row.job_id
    ? ((await sql()`SELECT company, role, description FROM jobs WHERE id = ${row.job_id} AND sid = ${sid}`) as unknown as Pick<
        JobRow,
        'company' | 'role' | 'description'
      >[])
    : [];
  const job = jobs[0];

  const plain = [letter.greeting, ...letter.paragraphs, letter.signoff, letter.name].join('\n\n');
  const words = wordCount(letter);

  return (
    <>
      <div className="canvas-head">
        <div className="canvas-head-in">
          <div className="crumb">
            <Link href="/jobs">Jobs</Link>
            <span className="sep">›</span>
            {job && (
              <>
                <span>
                  {job.company} — {job.role}
                </span>
                <span className="sep">›</span>
              </>
            )}
            <strong>Cover letter</strong>
          </div>
          <div className="rail">
            <CopyButton text={plain} />
            <PrintButton />
          </div>
        </div>
      </div>

      <main
        className="canvas-split"
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: 'var(--s-6) var(--s-4) var(--s-16)',
          display: 'grid',
          gap: 'var(--s-6)',
          gridTemplateColumns: 'minmax(0,1fr) 380px',
          alignItems: 'start',
        }}
      >
        <div id="printable">
          <article
            style={{
              background: 'var(--doc-bg)',
              color: 'var(--doc-text)',
              border: '1px solid var(--doc-border)',
              borderRadius: 8,
              padding: 'var(--s-12)',
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: '11pt',
              lineHeight: 1.6,
              boxShadow: 'var(--shadow)',
            }}
          >
            <p style={{ marginBottom: 16 }}>{letter.greeting}</p>
            {letter.paragraphs.map((p, i) => (
              <Para key={i} text={p} />
            ))}
            <p style={{ marginTop: 24 }}>{letter.signoff}</p>
            <p>{letter.name}</p>

            <p
              className="tnum"
              style={{
                marginTop: 'var(--s-6)',
                paddingTop: 'var(--s-2)',
                borderTop: '1px dashed var(--doc-border)',
                fontFamily: 'var(--sans)',
                fontSize: 'var(--text-xs)',
                color: 'var(--doc-muted)',
              }}
            >
              {words} words · {words <= 350 ? 'fits on one page' : 'longer than one page — worth trimming'}
            </p>
          </article>
        </div>

        <aside className="panel">
          <div className="panel-head">
            <h2>Cover letter</h2>
          </div>
          <div className="panel-body">
            <AiNotice />
            <p className="note">
              Written from the posting you saved{job ? ` for ${job.company}` : ''} and your
              résumé. You did not have to paste anything again.
            </p>

            {letter.facts.length > 0 && (
              <div>
                <p
                  style={{
                    fontSize: 'var(--text-xs)',
                    textTransform: 'uppercase',
                    letterSpacing: '.07em',
                    color: 'var(--text-faint)',
                    marginBottom: 'var(--s-2)',
                  }}
                >
                  Facts it used
                </p>
                <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6, fontSize: 'var(--text-sm)' }}>
                  {letter.facts.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                <p className="note" style={{ marginTop: 'var(--s-2)' }}>
                  Check each of these is true. They should all come from your résumé — nothing
                  was meant to be invented.
                </p>
              </div>
            )}

            <GenericPhrases
              parts={letter.paragraphs.map((text, i) => ({ where: `paragraph ${i + 1}`, text }))}
              posting={job?.description}
              inline
            />

            {letter.gaps.length > 0 && (
              <div
                style={{
                  border: '1px solid var(--border)',
                  borderLeft: '3px solid var(--warn)',
                  borderRadius: 4,
                  padding: 'var(--s-3)',
                  background: 'var(--bg-page)',
                }}
              >
                <p style={{ fontWeight: 600, marginBottom: 4 }}>What it chose not to claim</p>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 6 }}>
                  The posting asks for these and your résumé does not show them:
                </p>
                <p style={{ fontSize: 'var(--text-sm)' }}>{letter.gaps.join(', ')}</p>
              </div>
            )}
          </div>
        </aside>
      </main>
    </>
  );
}
