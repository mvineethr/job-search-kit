import { randomUUID } from 'node:crypto';
import { requireSid } from '@/lib/auth';
import { ensureSchema, sql, type JobRow, type ResumeRow } from '@/lib/db';
import { loadPrompt } from '@/lib/prompts';
import { completeText } from '@/lib/provider';
import { extractJsonObject, proseBefore } from '@/lib/extract-json';
import { ResumeSchema } from '@/lib/resume-schema';

export const runtime = 'nodejs';
export const maxDuration = 60;

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
    return Response.json({ error: 'Sign in first.' }, { status: 401 });
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
    return Response.json({ error: 'That job or résumé is not yours.' }, { status: 404 });
  }

  const base = master.content
    ? JSON.stringify(master.content, null, 2)
    : (master.source_text ?? '');

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
    return Response.json(
      { error: 'That did not go through. Your résumé is unchanged — try again.' },
      { status: 502 },
    );
  }

  const raw = extractJsonObject(reply) as Record<string, unknown> | null;
  const parsed = ResumeSchema.safeParse(raw);
  if (!parsed.success) {
    console.error('[tailor] tailored JSON did not match the schema');
    return Response.json(
      { error: 'The tailored résumé came back malformed. Try again.' },
      { status: 502 },
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

  return new Response(null, { status: 303, headers: { location: new URL(`/resume/${id}`, req.url).toString() } });
}
