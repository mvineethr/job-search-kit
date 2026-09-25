import { requireSid } from '@/lib/auth';
import { ensureSchema, sql } from '@/lib/db';
import { redirectTo } from '@/lib/redirect';

export const runtime = 'nodejs';

/**
 * Deletes a tailored copy. Masters cannot be deleted: `parent_id IS NOT NULL`
 * makes a post against a master a no-op rather than trusting the button to
 * only appear on tailored copies. The job stays, so it can be tailored again.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  let sid: string;
  try {
    sid = await requireSid();
  } catch {
    return redirectTo(req, '/login');
  }

  const { id } = await ctx.params;
  await ensureSchema();
  await sql()`DELETE FROM resumes WHERE id = ${id} AND sid = ${sid} AND parent_id IS NOT NULL`;
  return redirectTo(req, '/jobs');
}
