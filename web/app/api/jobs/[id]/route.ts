import { requireSid } from '@/lib/auth';
import { ensureSchema, sql } from '@/lib/db';

export const runtime = 'nodejs';

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  let sid: string;
  try {
    sid = await requireSid();
  } catch {
    return Response.json({ error: 'Sign in first.' }, { status: 401 });
  }

  const { id } = await ctx.params;
  await ensureSchema();
  // The sid filter is what stops one tester deleting another's job.
  await sql()`DELETE FROM jobs WHERE id = ${id} AND sid = ${sid}`;
  return Response.json({ ok: true });
}
