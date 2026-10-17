import { notFound } from 'next/navigation';
import { currentSid } from '@/lib/auth';
import { ensureSchema, sql, type LetterRow, type JobRow } from '@/lib/db';
import { LetterSchema, wordCount } from '@/lib/letter-schema';
import { METRIC_NEEDED } from '@/lib/resume-schema';
import PageBar from '@/components/PageBar';
import PrintButton from '@/components/PrintButton';
import CopyButton from '@/components/CopyButton';
import AiNotice from '@/components/AiNotice';
import GenericPhrases from '@/components/GenericPhrases';

export const dynamic = 'force-dynamic';

function Para({ text }: { text: string }) {
  const parts = text.split(METRIC_NEEDED);
  return (
    <p className="letter-para">
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {i < parts.length - 1 && <span className="marker-chip">{METRIC_NEEDED}</span>}
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
      <PageBar
        crumbs={[
          { href: '/jobs', label: 'Jobs' },
          ...(job && row.job_id ? [{ href: `/jobs/${row.job_id}`, label: job.company }] : []),
          { label: 'Cover letter' },
        ]}
      >
        <CopyButton text={plain} />
        <PrintButton />
      </PageBar>

      <main className="canvas-split resume-split">
        <div id="printable">
          <div className="paper">
            <article className="letter-body">
              <p className="letter-para">{letter.greeting}</p>
              {letter.paragraphs.map((p, i) => (
                <Para key={i} text={p} />
              ))}
              <p className="letter-sign">{letter.signoff}</p>
              <p>{letter.name}</p>

              <p className="letter-count tnum">
                {words} words · {words <= 350 ? 'fits on one page' : 'longer than one page — worth trimming'}
              </p>
            </article>
          </div>
        </div>

        <div className="stack">
          <AiNotice />
          <p className="notice">
            Written from the posting you saved{job ? ` for ${job.company}` : ''} and your
            résumé. You did not have to paste anything again.
          </p>

          {letter.facts.length > 0 && (
            <div className="card">
              <div className="card-head">
                <h2>Facts it used</h2>
              </div>
              <div className="card-body">
                <ul className="facts-list">
                  {letter.facts.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                <p className="notice">
                  Check each of these is true. They should all come from your résumé — nothing
                  was meant to be invented.
                </p>
              </div>
            </div>
          )}

          <GenericPhrases
            parts={letter.paragraphs.map((text, i) => ({ where: `paragraph ${i + 1}`, text }))}
            posting={job?.description}
            inline
          />

          {letter.gaps.length > 0 && (
            <div className="card">
              <div className="card-head">
                <h2>What it chose not to claim</h2>
              </div>
              <div className="card-body">
                <p className="muted">The posting asks for these and your résumé does not show them:</p>
                <p>{letter.gaps.join(', ')}</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
