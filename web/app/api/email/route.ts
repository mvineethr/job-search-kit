import { randomUUID } from 'node:crypto';
import { requireSid } from '@/lib/auth';
import { sql, type JobRow } from '@/lib/db';
import { loadPrompt } from '@/lib/prompts';
import { completeText } from '@/lib/provider';
import { extractJsonObject } from '@/lib/extract-json';
import { emailMessage } from '@/lib/messages';
import { loadMaster } from '@/lib/load-master';
import { getProfile } from '@/lib/profile';
import { displayName, EmailSchema, greetingFor, isSituation, unsupportedNumbers, type StoredEmail } from '@/lib/outreach';
import { backWithError, redirectTo } from '@/lib/redirect';

export const runtime = 'nodejs';
export const maxDuration = 180;

const field = (form: FormData, k: string, max: number) => String(form.get(k) ?? '').trim().slice(0, max);

/** Writes a cold email from the master résumé, optionally aimed at a saved job. */
export async function POST(req: Request) {
  let sid: string;
  try {
    sid = await requireSid();
  } catch {
    return redirectTo(req, '/login');
  }

  const form = await req.formData();
  const situation = field(form, 'situation', 40);
  const to = field(form, 'to', 200);
  const why = field(form, 'why', 1500);
  const jobId = field(form, 'jobId', 80);
  if (!isSituation(situation)) return backWithError(req, '/email', 'Pick what the email is for.');

  const master = await loadMaster(sid);
  if (!master) return backWithError(req, '/email', 'Add a résumé first — the email is written from it.');

  const q = sql();
  const job = jobId
    ? ((await q`SELECT id, company, role, description FROM jobs WHERE id = ${jobId} AND sid = ${sid}`) as unknown as JobRow[])[0]
    : undefined;
  if (jobId && !job) return backWithError(req, '/email', 'That job could not be found.');
  const profile = await getProfile(sid);

  let reply: string;
  try {
    const out = await completeText({
      system: loadPrompt('cold-email'),
      messages: [
        {
          role: 'user',
          content: emailMessage({
            situation,
            to,
            why,
            profile,
            resumeText: master.text,
            job: job ? { title: `${job.company} — ${job.role}`, description: job.description } : null,
          }),
        },
      ],
    });
    reply = out.text;
  } catch (err) {
    console.error('[email] provider failed', err);
    return backWithError(req, '/email', 'The email did not go through. Try again in a moment.');
  }

  const parsed = EmailSchema.safeParse(extractJsonObject(reply));
  if (!parsed.success) {
    console.error('[email] schema mismatch:', parsed.error.issues.slice(0, 5).map((i) => `${i.path.join('.')}: ${i.message}`));
    return backWithError(req, '/email', 'The email came back in a shape we could not read. Nothing was saved — try again.');
  }

  // What the person typed about the recipient is their own material, so its numbers are not invented.
  const content: StoredEmail = {
    ...parsed.data,
    situation,
    greeting: greetingFor(to),
    name: displayName(master.name || profile?.name || ''),
    unsupportedNumbers: unsupportedNumbers([parsed.data.subject, ...parsed.data.paragraphs], `${master.source}\n${why}\n${to}`),
  };

  const id = randomUUID();
  await q`
    INSERT INTO letters (id, sid, kind, job_id, resume_id, content)
    VALUES (${id}, ${sid}, 'email', ${job?.id ?? null}, ${master.id}, ${JSON.stringify(content)})`;
  return redirectTo(req, `/email/${id}`);
}
