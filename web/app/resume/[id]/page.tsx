import Link from 'next/link';
import { notFound } from 'next/navigation';
import { currentSid } from '@/lib/auth';
import { ensureSchema, sql, type ResumeRow } from '@/lib/db';
import { ResumeSchema } from '@/lib/resume-schema';
import ResumeDocument from '@/components/ResumeDocument';
import AssistantPanel from '@/components/AssistantPanel';
import PrintButton from '@/components/PrintButton';
import ConfirmButton from '@/components/ConfirmButton';
import AiNotice from '@/components/AiNotice';
import GenericPhrases from '@/components/GenericPhrases';
import { resumeParts } from '@/lib/generic-phrases';
import TailoringAuditPanel from '@/components/TailoringAudit';
import type { TailoringAudit } from '@/lib/verify-tailoring';
import { countMarkers } from '@/lib/metric-schema';

/**
 * A tailored row stores {note, audit} as JSON in source_text. Rows written before
 * the audit existed hold plain prose, so fall back to treating it as the note.
 */
function readNote(raw: string | null): { note: string; audit: TailoringAudit | null } {
  if (!raw) return { note: '', audit: null };
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && 'note' in parsed) {
      return { note: String(parsed.note ?? ''), audit: (parsed.audit as TailoringAudit) ?? null };
    }
  } catch {
    // older row: plain text
  }
  return { note: raw, audit: null };
}

export const dynamic = 'force-dynamic';

export default async function ResumePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ filled?: string; left?: string; error?: string }>;
}) {
  const { id } = await params;
  const { filled, left, error } = await searchParams;
  const sid = await currentSid();
  if (!sid) return null;

  await ensureSchema();
  const rows = (await sql()`
    SELECT id, title, source_text, content, parent_id, job_id, created_at, updated_at
    FROM resumes WHERE id = ${id} AND sid = ${sid}`) as unknown as ResumeRow[];

  const row = rows[0];
  if (!row) notFound();

  const parsed = ResumeSchema.safeParse(row.content);
  const resume = parsed.success ? parsed.data : null;
  const isTailored = Boolean(row.parent_id);
  const markers = resume ? countMarkers(resume) : 0;

  // A tailored copy is checked against its posting, so the posting's own words are not flagged.
  const posting = row.job_id
    ? ((await sql()`SELECT description FROM jobs WHERE id = ${row.job_id} AND sid = ${sid}`) as unknown as {
        description: string;
      }[])[0]?.description
    : undefined;

  // For the review panel: the structured version reads better than raw text.
  const forReview = resume
    ? JSON.stringify(resume, null, 2)
    : (row.source_text ?? '');

  return (
    <>
      <div className="canvas-head">
        <div className="canvas-head-in">
          <div className="crumb">
            <Link href="/">Home</Link>
            <span className="sep">›</span>
            {isTailored ? (
              <>
                <Link href={`/resume/${row.parent_id}`}>Master</Link>
                <span className="sep">›</span>
                <strong>{row.title}</strong>
              </>
            ) : (
              <strong>{row.title}</strong>
            )}
          </div>
          <div className="rail">
            {isTailored && <Link href="/jobs" className="btn">All jobs</Link>}
            {markers > 0 && (
              <Link href={`/resume/${row.id}/metrics`} className="btn">
                Fill in {markers} {markers === 1 ? 'number' : 'numbers'}
              </Link>
            )}
            <PrintButton />
            {isTailored && (
              <ConfirmButton
                action={`/api/resumes/${row.id}`}
                label="Delete this copy"
                confirm="Delete this tailored copy? Your master résumé and the job stay, so you can tailor again."
              />
            )}
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
          {resume ? (
            <div
              style={{
                border: '1px solid var(--doc-border)',
                borderRadius: 8,
                boxShadow: 'var(--shadow)',
                overflow: 'hidden',
              }}
            >
              <ResumeDocument resume={resume} />
            </div>
          ) : (
            <article
              style={{
                background: 'var(--doc-bg)',
                color: 'var(--doc-text)',
                border: '1px solid var(--doc-border)',
                borderRadius: 8,
                padding: 'var(--s-12)',
                whiteSpace: 'pre-wrap',
                fontFamily: 'var(--serif)',
                lineHeight: 1.6,
              }}
            >
              {row.source_text}
            </article>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
          {isTailored && <AiNotice />}

          {error && (
            <p role="alert" className="note" style={{ borderLeft: '3px solid var(--danger)', color: 'var(--danger)' }}>
              {error}
            </p>
          )}

          {filled && (
            <p className="note" style={{ borderLeft: '3px solid var(--ok)' }}>
              Filled in {filled} {Number(filled) === 1 ? 'number' : 'numbers'} from what you told
              us.{' '}
              {Number(left) > 0
                ? `${left} still missing — you can come back to them.`
                : 'Nothing is missing now.'}
            </p>
          )}

          {markers > 0 && (
            <div className="panel">
              <div className="panel-head">
                <h2 className="tnum">
                  {markers} {markers === 1 ? 'bullet is' : 'bullets are'} missing a number
                </h2>
              </div>
              <div className="panel-body">
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  Nothing was invented to fill these, which is why they have holes. A bullet
                  without a number reads as a claim rather than a result — but a made-up number
                  is worse, so we asked instead of guessing.
                </p>
                <Link href={`/resume/${row.id}/metrics`} className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>
                  Tell us the numbers
                </Link>
              </div>
            </div>
          )}

          {resume && <GenericPhrases parts={resumeParts(resume)} posting={posting} />}

          {!resume && (
            <p className="note">
              This one could not be read into sections, so it is shown as plain text. The
              review still works; the formatted document and PDF export need the structured
              version.
            </p>
          )}
          {isTailored &&
            (() => {
              const { note, audit } = readNote(row.source_text);
              return (
                <>
                  {audit && <TailoringAuditPanel audit={audit} />}
                  {note && (
                    <div className="panel">
                      <div className="panel-head">
                        <h2>What it says it changed</h2>
                      </div>
                      <div className="panel-body">
                        <p style={{ lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{note}</p>
                        <p className="note">
                          Your master résumé is untouched. This is a separate copy for this job.
                        </p>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          <AssistantPanel resumeText={forReview} />
        </div>
      </main>
    </>
  );
}
