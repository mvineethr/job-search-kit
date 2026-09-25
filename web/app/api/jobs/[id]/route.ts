import { requireSid } from '@/lib/auth';
import { ensureSchema, sql, type JobRow } from '@/lib/db';
import { runMatch } from '@/lib/run-match';
import { backWithError, redirectTo } from '@/lib/redirect';

export const runtime = 'nodejs';
export const maxDuration = 180; // op=match calls the primary model

/**
 * Form posts from the jobs pages. `op=match` (re)checks the fit against the
 * current master résumé; `op=applied` toggles the applied flag;
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
  const form = await req.formData();
  const op = String(form.get('op') ?? '');
  // Only same-app job paths, so a crafted form cannot redirect anywhere else.
  const back = String(form.get('back') ?? '');
  const returnTo = /^\/jobs(\/[\w-]+)?$/.test(back) ? back : '/jobs';
  await ensureSchema();
  const q = sql();

  // The sid filter on every statement is what stops one tester touching another's job.
  if (op === 'applied') {
    await q`
      UPDATE jobs SET applied_at = CASE WHEN applied_at IS NULL THEN now() ELSE NULL END
      WHERE id = ${id} AND sid = ${sid}`;
    return redirectTo(req, returnTo);
  } else if (op === 'match') {
    const rows = (await q`
      SELECT id, company, role, description FROM jobs WHERE id = ${id} AND sid = ${sid}`) as unknown as JobRow[];
    if (!rows[0]) return backWithError(req, '/jobs', 'That job no longer exists.');
    const match = await runMatch(sid, rows[0]);
    if (!match) return backWithError(req, `/jobs/${id}`, 'The fit check did not work this time. Try again.');
    return redirectTo(req, `/jobs/${id}`);
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
