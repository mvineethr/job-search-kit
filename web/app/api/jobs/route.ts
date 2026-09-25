import { randomUUID } from 'node:crypto';
import { requireSid } from '@/lib/auth';
import { ensureSchema, sql } from '@/lib/db';
import { loadAnswers } from '@/lib/answers';
import { viewMatch } from '@/lib/match';
import { runMatch } from '@/lib/run-match';
import { backWithError, redirectTo } from '@/lib/redirect';

export const runtime = 'nodejs';
// The match runs on the primary model; 180 matches the other model routes.
export const maxDuration = 180;

/**
 * Saves a posting and matches the master résumé against it. The match is best
 * effort: if it fails the job is still saved, and the job page offers to run it
 * again. Open questions go first, because answering them is what moves the score.
 */
export async function POST(req: Request) {
  let sid: string;
  try {
    sid = await requireSid();
  } catch {
    return redirectTo(req, '/login');
  }

  const form = await req.formData();
  const company = String(form.get('company') ?? '').trim();
  const role = String(form.get('role') ?? '').trim();
  const description = String(form.get('description') ?? '').trim();

  if (!company || !role || description.length < 80) {
    return backWithError(req, '/jobs', 'Company, role, and the full posting are all needed.');
  }

  await ensureSchema();
  const id = randomUUID();
  await sql()`
    INSERT INTO jobs (id, sid, company, role, description)
    VALUES (${id}, ${sid}, ${company}, ${role}, ${description})`;

  const match = await runMatch(sid, { id, company, role, description });
  if (match && viewMatch(match, await loadAnswers(sid)).openQuestions.length > 0) {
    return redirectTo(req, `/jobs/${id}/questions`);
  }
  return redirectTo(req, `/jobs/${id}`);
}
