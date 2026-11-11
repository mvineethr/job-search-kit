import { ensureSchema, sql } from '@/lib/db';
import { refreshCompany, type CompanyRow } from '@/lib/pool';

export const runtime = 'nodejs';
export const maxDuration = 300;

// shortcut: one run checks the least recently checked boards; raise or batch once follows outgrow it.
const PER_RUN = 200;

/**
 * Daily check of every followed company (vercel.json cron). The one route that reads
 * across people, like /admin: each refresh still writes only that company's own sid.
 * Vercel sends `Authorization: Bearer $CRON_SECRET`; without the secret set, it is off.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('Not found', { status: 404 });
  }

  await ensureSchema();
  const companies = (await sql()`
    SELECT id, sid, ats, token, name, checked_at, check_error FROM companies
    ORDER BY checked_at ASC NULLS FIRST LIMIT ${PER_RUN}`) as unknown as CompanyRow[];

  // A few at a time: polite to the hiring sites, and well inside the time limit.
  let added = 0;
  for (let i = 0; i < companies.length; i += 8) {
    const counts = await Promise.all(companies.slice(i, i + 8).map((c) => refreshCompany(c)));
    added += counts.reduce((a, b) => a + b, 0);
  }
  return Response.json({ ok: true, checked: companies.length, added });
}
