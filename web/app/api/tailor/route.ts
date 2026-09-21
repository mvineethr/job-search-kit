import { randomUUID } from 'node:crypto';
import { requireSid } from '@/lib/auth';
import { ensureSchema, sql, type JobRow, type ResumeRow } from '@/lib/db';
import { loadPrompt } from '@/lib/prompts';
import { completeText } from '@/lib/provider';
import { extractJsonObject, proseBefore } from '@/lib/extract-json';
import { ResumeSchema, type Resume } from '@/lib/resume-schema';
import { backWithError, redirectTo } from '@/lib/redirect';

export const runtime = 'nodejs';
// Fluid Compute gives Hobby up to 300s. Tailoring measured at ~51s on kimi-k3, plus
// up to ~17s for a one-off parse. 180 leaves headroom while stopping a runaway.
export const maxDuration = 180;

/**
 * A résumé saved before parsing worked (or one whose parse failed) is stored as
 * text only. Parse it now and keep the result, so the person's existing data
 * starts working without them re-uploading anything.
 */
async function ensureParsed(master: ResumeRow, sid: string): Promise<Resume | null> {
  const existing = ResumeSchema.safeParse(master.content);
  if (existing.success) return existing.data;
  if (!master.source_text) return null;

  try {
    const { text } = await completeText({
      system: loadPrompt('resume-parse'),
      messages: [{ role: 'user', content: master.source_text }],
      tier: 'fast',
    });
    const parsed = ResumeSchema.safeParse(extractJsonObject(text));
    if (!parsed.success) return null;

    await sql()`
      UPDATE resumes SET content = ${JSON.stringify(parsed.data)}, updated_at = now()
      WHERE id = ${master.id} AND sid = ${sid}`;
    return parsed.data;
  } catch (err) {
    console.error('[tailor] re-parse failed', err);
    return null;
  }
}

/**
 * Tailors a copy of a résumé to one job. The master is never modified — the
 * result is a new row pointing at both its parent and the job, which is what
 * keeps "which version did I send them?" answerable.
 */
export async function POST(req: Request) {
  let sid: string;
  try {
    sid = await requireSid();
  } catch {
    return redirectTo(req, '/login');
  }

  const form = await req.formData();
  const jobId = String(form.get('jobId') ?? '');
  const resumeId = String(form.get('resumeId') ?? '');

  await ensureSchema();
  const q = sql();

  const jobs = (await q`
    SELECT id, company, role, description FROM jobs
    WHERE id = ${jobId} AND sid = ${sid}`) as unknown as JobRow[];
  const resumes = (await q`
    SELECT id, title, source_text, content FROM resumes
    WHERE id = ${resumeId} AND sid = ${sid}`) as unknown as ResumeRow[];

  const job = jobs[0];
  const master = resumes[0];
  if (!job || !master) {
    return backWithError(req, '/jobs', 'That job or résumé could not be found.');
  }

  const structured = await ensureParsed(master, sid);
  const base = structured ? JSON.stringify(structured, null, 2) : (master.source_text ?? '');

  let reply: string;
  try {
    const out = await completeText({
      system: loadPrompt('resume-tailor'),
      messages: [
        {
          role: 'user',
          content: `MY RESUME:\n${base}\n\nTHE JOB (${job.company} — ${job.role}):\n${job.description}`,
        },
      ],
    });
    reply = out.text;
  } catch (err) {
    console.error('[tailor] provider failed', err);
    return backWithError(
      req,
      '/jobs',
      'Tailoring did not go through. Your résumé is unchanged — try again in a moment.',
    );
  }

  const raw = extractJsonObject(reply) as Record<string, unknown> | null;
  const parsed = ResumeSchema.safeParse(raw);
  if (!parsed.success) {
    console.error(
      '[tailor] schema mismatch:',
      parsed.error.issues.slice(0, 5).map((i) => `${i.path.join('.')}: ${i.message}`),
    );
    return backWithError(
      req,
      '/jobs',
      'The tailored résumé came back in a shape we could not read. Nothing was saved — try again.',
    );
  }

  const analysis = (raw?.tailoring as JobRow['analysis']) ?? null;

  const id = randomUUID();
  await q`
    INSERT INTO resumes (id, sid, title, content, parent_id, job_id, source_text)
    VALUES (${id}, ${sid}, ${`${job.company} — ${job.role}`},
            ${JSON.stringify(parsed.data)}, ${master.id}, ${job.id}, ${proseBefore(reply)})`;

  if (analysis) {
    await q`UPDATE jobs SET analysis = ${JSON.stringify(analysis)} WHERE id = ${job.id} AND sid = ${sid}`;
  }

  return redirectTo(req, `/resume/${id}`);
}
