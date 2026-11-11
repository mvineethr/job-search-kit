import { requireSid } from '@/lib/auth';
import { ensureSchema, sql } from '@/lib/db';
import { backWithError, redirectTo } from '@/lib/redirect';

export const runtime = 'nodejs';

/** `op=open` (id) marks one read and goes to it; `op=read-all` clears the list's unread marks. */
export async function POST(req: Request) {
  let sid: string;
  try {
    sid = await requireSid();
  } catch {
    return redirectTo(req, '/login');
  }
  const form = await req.formData();
  const op = String(form.get('op') ?? '');
  await ensureSchema();
  const q = sql();

  if (op === 'open') {
    const rows = (await q`
      UPDATE notifications SET read_at = COALESCE(read_at, now())
      WHERE id = ${String(form.get('id') ?? '')} AND sid = ${sid}
      RETURNING href`) as { href: string }[];
    const href = rows[0]?.href ?? '';
    // Same-app paths only, even though the code writes every href.
    return redirectTo(req, /^\/(?!\/)/.test(href) ? href : '/notifications');
  }
  if (op === 'read-all') {
    await q`UPDATE notifications SET read_at = now() WHERE sid = ${sid} AND read_at IS NULL`;
    return redirectTo(req, '/notifications');
  }
  return backWithError(req, '/notifications', 'Unknown action.');
}
