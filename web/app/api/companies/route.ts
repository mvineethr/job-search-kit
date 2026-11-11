import { randomUUID } from 'node:crypto';
import { requireSid } from '@/lib/auth';
import { ensureSchema, sql } from '@/lib/db';
import { nameFromToken, parseBoardUrl } from '@/lib/job-sources';
import { refreshCompany, type CompanyRow } from '@/lib/pool';
import { backWithError, redirectTo } from '@/lib/redirect';

export const runtime = 'nodejs';
export const maxDuration = 120; // a refresh fetches every followed board

const BACK = '/jobs/openings';
// shortcut: a flat cap keeps one person's refresh inside one function run; batch if people need more.
const MAX_COMPANIES = 40;

/**
 * Form posts from the openings page. `op=follow` (url) follows a company by its
 * careers page link and pulls its jobs at once; `op=unfollow` (id) drops it and its
 * unsaved postings; `op=refresh` checks every followed company now.
 */
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

  if (op === 'follow') {
    const board = parseBoardUrl(String(form.get('url') ?? ''));
    if (!board) {
      return backWithError(
        req,
        BACK,
        'Paste a careers page link from Greenhouse, Lever or Ashby, like boards.greenhouse.io/acme or jobs.lever.co/acme.',
      );
    }
    const [{ n }] = (await q`SELECT count(*)::int AS n FROM companies WHERE sid = ${sid}`) as { n: number }[];
    if (n >= MAX_COMPANIES) return backWithError(req, BACK, `You can follow up to ${MAX_COMPANIES} companies.`);

    const rows = (await q`
      INSERT INTO companies (id, sid, ats, token, name)
      VALUES (${randomUUID()}, ${sid}, ${board.ats}, ${board.token}, ${nameFromToken(board.token)})
      ON CONFLICT (sid, ats, token) DO UPDATE SET name = companies.name
      RETURNING id, sid, ats, token, name, checked_at, check_error`) as unknown as CompanyRow[];
    await refreshCompany(rows[0]);
    const [after] = (await q`SELECT check_error FROM companies WHERE id = ${rows[0].id} AND sid = ${sid}`) as {
      check_error: string | null;
    }[];
    if (after?.check_error) {
      // A board that never loaded is not worth keeping: nothing to show, and it would fail every day.
      await q`DELETE FROM companies WHERE id = ${rows[0].id} AND sid = ${sid} AND checked_at IS NOT NULL
              AND NOT EXISTS (SELECT 1 FROM postings WHERE company_id = ${rows[0].id})`;
      return backWithError(req, BACK, after.check_error);
    }
    return redirectTo(req, `${BACK}?company=${rows[0].id}`);
  }

  if (op === 'unfollow') {
    // Saved jobs keep their own copy; only the postings list goes.
    await q`DELETE FROM companies WHERE id = ${String(form.get('id') ?? '')} AND sid = ${sid}`;
    return redirectTo(req, BACK);
  }

  if (op === 'refresh') {
    const companies = (await q`
      SELECT id, sid, ats, token, name, checked_at, check_error FROM companies WHERE sid = ${sid}`) as unknown as CompanyRow[];
    await Promise.all(companies.map((c) => refreshCompany(c)));
    return redirectTo(req, BACK);
  }

  return backWithError(req, BACK, 'Unknown action.');
}
