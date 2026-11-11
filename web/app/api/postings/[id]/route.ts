import { randomUUID } from 'node:crypto';
import { requireSid } from '@/lib/auth';
import { ensureSchema, sql } from '@/lib/db';
import { loadAnswers } from '@/lib/answers';
import { viewMatch } from '@/lib/match';
import { runMatch } from '@/lib/run-match';
import { backWithError, redirectTo } from '@/lib/redirect';

export const runtime = 'nodejs';
export const maxDuration = 180; // saving runs the fit check on the primary model

/**
 * `op=save`: turns a followed company's posting into one of the person's jobs, with
 * the posting's own text as the description, then checks the fit exactly as adding a
 * job by hand does. Saving twice opens the job already saved.
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
  if (String(form.get('op') ?? '') !== 'save') return backWithError(req, '/jobs/openings', 'Unknown action.');

  await ensureSchema();
  const q = sql();
  const rows = (await q`
    SELECT p.title, p.description, p.url, p.job_id, c.name AS company
    FROM postings p JOIN companies c ON c.id = p.company_id
    WHERE p.id = ${id} AND p.sid = ${sid} AND c.sid = ${sid}`) as {
    title: string;
    description: string;
    url: string;
    job_id: string | null;
    company: string;
  }[];
  const p = rows[0];
  if (!p) return backWithError(req, '/jobs/openings', 'That opening has closed.');
  if (p.job_id) return redirectTo(req, `/jobs/${p.job_id}`);

  const jobId = randomUUID();
  // The link goes at the end so the job page, the letter and the person can find the posting.
  const description = `${p.description}\n\nPosting: ${p.url}`;
  await q.transaction([
    q`INSERT INTO jobs (id, sid, company, role, description) VALUES (${jobId}, ${sid}, ${p.company}, ${p.title}, ${description})`,
    q`UPDATE postings SET job_id = ${jobId} WHERE id = ${id} AND sid = ${sid}`,
  ]);

  const match = await runMatch(sid, { id: jobId, company: p.company, role: p.title, description });
  if (match && viewMatch(match, await loadAnswers(sid)).openQuestions.length > 0) {
    return redirectTo(req, `/jobs/${jobId}/questions`);
  }
  return redirectTo(req, `/jobs/${jobId}`);
}
