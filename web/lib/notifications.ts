import { randomUUID } from 'node:crypto';
import { sql } from './db';

export type NotificationRow = { id: string; text: string; href: string; created_at: string; read_at: string | null };

/** `href` is always an in-app path the code builds, never text from a feed. */
export async function notify(sid: string, text: string, href: string): Promise<void> {
  await sql()`INSERT INTO notifications (id, sid, text, href) VALUES (${randomUUID()}, ${sid}, ${text}, ${href})`;
}

/** For the top bar. 0 if the table is not there yet (first request before ensureSchema). */
export async function unreadCount(sid: string): Promise<number> {
  try {
    const rows = (await sql()`
      SELECT count(*)::int AS n FROM notifications WHERE sid = ${sid} AND read_at IS NULL`) as { n: number }[];
    return rows[0]?.n ?? 0;
  } catch {
    return 0;
  }
}
