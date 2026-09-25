import { requireSid } from '@/lib/auth';
import { ensureSchema, sql } from '@/lib/db';
import { backWithError, redirectTo } from '@/lib/redirect';

export const runtime = 'nodejs';

/**
 * Form posts from the jobs page. `op=applied` toggles the applied flag;
 * `op=delete` removes the job with the tailored résumés and letters written for
 * it — they only make sense for that posting. Master résumés are never touched.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  let sid: string;
  try {
    sid = await requireSid();
  } catch {
    return redirectTo(req, '/login');
  }

  const { id } = await ctx.params;
  const op = String((await req.formData()).get('op') ?? '');
  await ensureSchema();
  const q = sql();

  // The sid filter on every statement is what stops one tester touching another's job.
  if (op === 'applied') {
    await q`
      UPDATE jobs SET applied_at = CASE WHEN applied_at IS NULL THEN now() ELSE NULL END
      WHERE id = ${id} AND sid = ${sid}`;
  } else if (op === 'delete') {
    // Letters go with the job via ON DELETE CASCADE.
    await q.transaction([
      q`DELETE FROM resumes WHERE job_id = ${id} AND sid = ${sid} AND parent_id IS NOT NULL`,
      q`DELETE FROM jobs WHERE id = ${id} AND sid = ${sid}`,
    ]);
  } else {
    return backWithError(req, '/jobs', 'Unknown action.');
  }

  return redirectTo(req, '/jobs');
}
