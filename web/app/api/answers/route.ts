import { requireSid } from '@/lib/auth';
import { ensureSchema } from '@/lib/db';
import { saveAnswer } from '@/lib/answers';
import { AnswerSchema } from '@/lib/question-schema';
import { backWithError, redirectTo } from '@/lib/redirect';

export const runtime = 'nodejs';

/**
 * Saves what someone told us about their own experience. Fields arrive as
 * level__<id>, detail__<id> and skill__<id> from the questions form.
 *
 * Skipped questions are simply absent — never assume an unanswered question
 * means "no", because the difference between "I do not have this" and "I did not
 * get round to answering" matters on a résumé.
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

  const ids = [...form.keys()]
    .filter((k) => k.startsWith('level__'))
    .map((k) => k.slice('level__'.length));

  let saved = 0;
  for (const id of ids) {
    const level = String(form.get(`level__${id}`) ?? '');
    if (!level) continue; // skipped

    const parsed = AnswerSchema.safeParse({
      skill: String(form.get(`skill__${id}`) ?? ''),
      level,
      detail: String(form.get(`detail__${id}`) ?? '').trim(),
    });
    if (!parsed.success) continue;

    await saveAnswer(sid, parsed.data);
    saved++;
  }

  if (saved === 0) {
    return backWithError(req, '/jobs', 'Nothing was saved — no questions were answered.');
  }

  return redirectTo(req, jobId ? `/jobs?answered=${saved}` : '/jobs');
}
