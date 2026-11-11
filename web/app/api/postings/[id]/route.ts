import { randomUUID } from 'node:crypto';
import { requireSid } from '@/lib/auth';
import { ensureSchema, sql } from '@/lib/db';
import { loadAnswers } from '@/lib/answers';
import { viewMatch } from '@/lib/match';
import { runMatch } from '@/lib/run-match';
import { backWithError, redirectTo } from '@/lib/redirect';
import { fetchForm } from '@/lib/apply';
import { notify } from '@/lib/notifications';
import type { Ats } from '@/lib/job-sources';

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
    SELECT p.title, p.description, p.url, p.job_id, p.external_id, c.name AS company, c.ats, c.token
    FROM postings p JOIN companies c ON c.id = p.company_id
    WHERE p.id = ${id} AND p.sid = ${sid} AND c.sid = ${sid}`) as {
    title: string;
    description: string;
    url: string;
    job_id: string | null;
    external_id: string;
    company: string;
    ats: Ats;
    token: string;
  }[];
  const p = rows[0];
  if (!p) return backWithError(req, '/jobs/openings', 'That opening has closed.');
  if (p.job_id) return redirectTo(req, `/jobs/${p.job_id}`);
  // Same bar as adding a job by hand: the fit check and tailoring need the posting's text.
  if (p.description.trim().length < 80) {
    return backWithError(
      req,
      '/jobs/openings',
      `The feed for “${p.title}” has no description. Open the posting and add it from Jobs by pasting its text.`,
    );
  }

  const jobId = randomUUID();
  // The link goes at the end so the job page, the letter and the person can find the posting.
  const description = `${p.description}\n\nPosting: ${p.url}`;
  await q.transaction([
    q`INSERT INTO jobs (id, sid, company, role, description) VALUES (${jobId}, ${sid}, ${p.company}, ${p.title}, ${description})`,
    q`UPDATE postings SET job_id = ${jobId} WHERE id = ${id} AND sid = ${sid}`,
  ]);

  // The application form, so the job page can say what only the person can answer.
  const applyForm = await fetchForm(p.ats, p.token, p.external_id);
  if (applyForm) await q`UPDATE postings SET form = ${JSON.stringify(applyForm)}::jsonb WHERE id = ${id} AND sid = ${sid}`;
  const yours = applyForm?.filter((f) => f.who === 'you' && f.required).length;
  await notify(
    sid,
    `Waiting for you to apply: ${p.title} at ${p.company}` +
      (yours ? ` (${yours} ${yours === 1 ? 'question' : 'questions'} only you can answer)` : ''),
    `/jobs/${jobId}`,
  );

  const match = await runMatch(sid, { id: jobId, company: p.company, role: p.title, description });
  if (match && viewMatch(match, await loadAnswers(sid)).openQuestions.length > 0) {
    return redirectTo(req, `/jobs/${jobId}/questions`);
  }
  return redirectTo(req, `/jobs/${jobId}`);
}
