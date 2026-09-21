import { randomUUID } from 'node:crypto';
import { requireSid } from '@/lib/auth';
import { ensureSchema, sql, type JobRow, type ResumeRow } from '@/lib/db';
import { loadPrompt } from '@/lib/prompts';
import { completeText } from '@/lib/provider';
import { extractJsonObject } from '@/lib/extract-json';
import { LetterSchema } from '@/lib/letter-schema';
import { backWithError, redirectTo } from '@/lib/redirect';

export const runtime = 'nodejs';
export const maxDuration = 180;

/**
 * Writes a cover letter for a job from what is already stored: the posting, and
 * the résumé tailored to it if one exists (otherwise the master). The person
 * never pastes anything again.
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

  await ensureSchema();
  const q = sql();

  const jobs = (await q`
    SELECT id, company, role, description FROM jobs
    WHERE id = ${jobId} AND sid = ${sid}`) as unknown as JobRow[];
  const job = jobs[0];
  if (!job) return backWithError(req, '/jobs', 'That job could not be found.');

  // Prefer the copy tailored to this job; fall back to the most recent master.
  const tailored = (await q`
    SELECT id, content, source_text FROM resumes
    WHERE sid = ${sid} AND job_id = ${job.id}
    ORDER BY created_at DESC LIMIT 1`) as unknown as ResumeRow[];
  const masters = (await q`
    SELECT id, content, source_text FROM resumes
    WHERE sid = ${sid} AND parent_id IS NULL
    ORDER BY updated_at DESC LIMIT 1`) as unknown as ResumeRow[];

  const resume = tailored[0] ?? masters[0];
  if (!resume) {
    return backWithError(req, '/jobs', 'Add a résumé first — the letter is written from it.');
  }

  const resumeText = resume.content
    ? JSON.stringify(resume.content, null, 2)
    : (resume.source_text ?? '');

  let reply: string;
  try {
    const out = await completeText({
      system: loadPrompt('cover-letter'),
      messages: [
        {
          role: 'user',
          content: `MY RESUME:\n${resumeText}\n\nTHE JOB (${job.company} — ${job.role}):\n${job.description}`,
        },
      ],
    });
    reply = out.text;
  } catch (err) {
    console.error('[letter] provider failed', err);
    return backWithError(req, '/jobs', 'The cover letter did not go through. Try again in a moment.');
  }

  const parsed = LetterSchema.safeParse(extractJsonObject(reply));
  if (!parsed.success) {
    console.error(
      '[letter] schema mismatch:',
      parsed.error.issues.slice(0, 5).map((i) => `${i.path.join('.')}: ${i.message}`),
    );
    return backWithError(
      req,
      '/jobs',
      'The cover letter came back in a shape we could not read. Nothing was saved — try again.',
    );
  }

  const id = randomUUID();
  await q`
    INSERT INTO letters (id, sid, kind, job_id, resume_id, content)
    VALUES (${id}, ${sid}, 'cover', ${job.id}, ${resume.id}, ${JSON.stringify(parsed.data)})`;

  return redirectTo(req, `/letter/${id}`);
}
