import { notFound } from 'next/navigation';
import { currentSid } from '@/lib/auth';
import { ensureSchema, sql, type JobRow, type LetterRow } from '@/lib/db';
import { emailWords, SITUATIONS, type StoredEmail } from '@/lib/outreach';
import PageBar from '@/components/PageBar';
import CopyButton from '@/components/CopyButton';
import AiNotice from '@/components/AiNotice';
import GenericPhrases from '@/components/GenericPhrases';
import MarkedText from '@/components/MarkedText';

export const dynamic = 'force-dynamic';

export default async function EmailView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sid = await currentSid();
  if (!sid) return null;

  await ensureSchema();
  const row = ((await sql()`
    SELECT id, job_id, content FROM letters WHERE id = ${id} AND sid = ${sid} AND kind = 'email'`) as unknown as LetterRow[])[0];
  if (!row) notFound();
  const email = row.content as StoredEmail;
  const job = row.job_id
    ? ((await sql()`SELECT company, role, description FROM jobs WHERE id = ${row.job_id} AND sid = ${sid}`) as unknown as JobRow[])[0]
    : undefined;

  const words = emailWords(email);
  const body = [email.greeting, ...email.paragraphs, email.name].filter(Boolean).join('\n\n');
  const flagged = email.unsupportedNumbers ?? [];

  return (
    <>
      <PageBar crumbs={[{ href: '/email', label: 'Cold email' }, { label: email.subject }]}>
        <CopyButton text={`Subject: ${email.subject}\n\n${body}`} label="Copy email" />
      </PageBar>

      <main className="canvas-split resume-split">
        <div className="paper">
          <article className="letter-body">
            <p className="letter-para">
              <strong>Subject:</strong> <MarkedText text={email.subject} numbers={flagged} />
            </p>
            <p className="letter-para">{email.greeting}</p>
            {email.paragraphs.map((p, i) => (
              <p key={i} className="letter-para">
                <MarkedText text={p} numbers={flagged} />
              </p>
            ))}
            {email.name && <p className="letter-sign">{email.name}</p>}
            <p className="letter-count tnum">
              {words} words · {words <= 120 ? 'short enough to be read' : 'over 120 words — worth trimming'}
            </p>
          </article>
        </div>

        <div className="stack">
          <AiNotice />
          <p className="notice">
            {SITUATIONS[email.situation] ?? 'Cold email'}
            {job ? ` · ${job.company} — ${job.role}` : ''}. Nothing is sent from here: copy it into your own email.
          </p>

          {flagged.length > 0 && (
            <div className="notice notice-warn">
              Not in your résumé or what you typed: {flagged.join(', ')}. Check or remove before sending.
            </div>
          )}

          {email.facts.length > 0 && (
            <div className="card">
              <div className="card-head">
                <h2>Facts it used</h2>
              </div>
              <div className="card-body">
                <ul className="facts-list">
                  {email.facts.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                <p className="notice">Check each of these is true. They should all come from your résumé.</p>
              </div>
            </div>
          )}

          <GenericPhrases
            parts={email.paragraphs.map((text, i) => ({ where: `paragraph ${i + 1}`, text }))}
            posting={job?.description}
            inline
          />

          {email.gaps.length > 0 && (
            <div className="card">
              <div className="card-head">
                <h2>What it chose not to claim</h2>
              </div>
              <div className="card-body">
                <ul className="facts-list">
                  {email.gaps.map((g) => (
                    <li key={g}>{g}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
