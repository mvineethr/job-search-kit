import Link from 'next/link';
import { notFound } from 'next/navigation';
import { currentSid } from '@/lib/auth';
import { ensureSchema, sql, type ResumeRow } from '@/lib/db';
import { ResumeSchema } from '@/lib/resume-schema';
import EditableResume from '@/components/EditableResume';
import AssistantPanel from '@/components/AssistantPanel';
import PrintButton from '@/components/PrintButton';
import ConfirmButton from '@/components/ConfirmButton';
import PageBar from '@/components/PageBar';
import AiNotice from '@/components/AiNotice';
import GenericPhrases from '@/components/GenericPhrases';
import { resumeParts } from '@/lib/generic-phrases';
import TailoringAuditPanel from '@/components/TailoringAudit';
import { readNote } from '@/lib/resume-edit';
import { countMarkers } from '@/lib/metric-schema';

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
  const { note, audit } = isTailored ? readNote(row.source_text) : { note: '', audit: null };

  // A tailored copy is checked against its posting, so the posting's own words are not flagged.
  const posting = row.job_id
    ? ((await sql()`SELECT description FROM jobs WHERE id = ${row.job_id} AND sid = ${sid}`) as unknown as {
        description: string;
      }[])[0]?.description
    : undefined;

  // For the review panel: the structured version reads better than raw text. Empty
  // fields are dropped, or the review critiques "an empty array" the reader never sees.
  const forReview = resume
    ? JSON.stringify(resume, (_k, v) => ((Array.isArray(v) && v.length === 0) || v === '' ? undefined : v), 2)
    : (row.source_text ?? '');

  return (
    <>
      <PageBar
        crumbs={
          isTailored
            ? [{ href: '/resumes', label: 'Résumés' }, { href: `/resume/${row.parent_id}`, label: 'Master' }, { label: row.title }]
            : [{ href: '/resumes', label: 'Résumés' }, { label: row.title }]
        }
      >
        {isTailored && <Link href="/jobs" className="btn">All jobs</Link>}
        <Link href="/ats-check" className="btn">
          Check what an ATS sees
        </Link>
        {resume && (
          <a href={`/api/resumes/${row.id}/docx`} className="btn">
            Download Word
          </a>
        )}
        <PrintButton />
        {isTailored && (
          <ConfirmButton
            action={`/api/resumes/${row.id}`}
            label="Delete this copy"
            confirm="Delete this tailored copy? Your master résumé and the job stay, so you can tailor again."
          />
        )}
        {markers > 0 && (
          <Link href={`/resume/${row.id}/metrics`} className="btn btn-primary">
            Fill in {markers} {markers === 1 ? 'number' : 'numbers'}
          </Link>
        )}
      </PageBar>

      <main className="canvas-split resume-split">
        <div id="printable">
          {resume ? (
            <div className="paper">
              <EditableResume id={row.id} initial={resume} flags={audit?.unsupportedNumbers ?? []} />
            </div>
          ) : (
            <article className="paper resume-plain">
              {row.source_text}
            </article>
          )}
        </div>

        <div className="stack">
          {isTailored && <AiNotice />}

          {error && (
            <p role="alert" className="notice notice-error">
              {error}
            </p>
          )}

          {filled && (
            <p className="notice notice-ok">
              Filled in {filled} {Number(filled) === 1 ? 'number' : 'numbers'} from what you told
              us.{' '}
              {Number(left) > 0
                ? `${left} still missing — you can come back to them.`
                : 'Nothing is missing now.'}
            </p>
          )}

          {markers > 0 && (
            <div className="card">
              <div className="card-head">
                <h2 className="tnum">
                  {markers} {markers === 1 ? 'bullet is' : 'bullets are'} missing a number
                </h2>
              </div>
              <div className="card-body">
                <p className="muted">
                  Nothing was invented to fill these, which is why they have holes. A bullet
                  without a number reads as a claim rather than a result — but a made-up number
                  is worse, so we asked instead of guessing.
                </p>
                <Link href={`/resume/${row.id}/metrics`} className="btn btn-primary self-start">
                  Tell us the numbers
                </Link>
              </div>
            </div>
          )}

          {resume && <GenericPhrases parts={resumeParts(resume)} posting={posting} />}

          {!resume && (
            <p className="notice">
              This one could not be read into sections, so it is shown as plain text. The
              review still works; the formatted document and PDF export need the structured
              version.
            </p>
          )}
          {audit && <TailoringAuditPanel audit={audit} />}
          {note && (
            <div className="card">
              <div className="card-head">
                <h2>What it says it changed</h2>
              </div>
              <div className="card-body">
                <p className="pre-wrap">{note}</p>
                <p className="notice">
                  Your master résumé is untouched. This is a separate copy for this job.
                </p>
              </div>
            </div>
          )}
          <AssistantPanel resumeText={forReview} resume={resume} />
        </div>
      </main>
    </>
  );
}
