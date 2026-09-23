import { randomUUID } from 'node:crypto';
import { requireSid } from '@/lib/auth';
import { ensureSchema, sql, type ResumeRow } from '@/lib/db';
import { loadPrompt } from '@/lib/prompts';
import { completeText } from '@/lib/provider';
import { extractJsonArray } from '@/lib/extract-json';
import { QuestionsSchema } from '@/lib/question-schema';
import { loadAnswers, skillKey } from '@/lib/answers';
import { backWithError, redirectTo } from '@/lib/redirect';

export const runtime = 'nodejs';
export const maxDuration = 120;

/**
 * Works out what this posting asks for that the résumé does not show, so the
 * person can fill the gaps in their own words before tailoring runs. Best effort:
 * a job is still saved if this fails, because the questions are an improvement to
 * tailoring rather than a precondition for it.
 */
async function generateQuestions(
  sid: string,
  description: string,
  company: string,
  role: string,
): Promise<unknown | null> {
  const resumes = (await sql()`
    SELECT content, source_text FROM resumes
    WHERE sid = ${sid} AND parent_id IS NULL
    ORDER BY updated_at DESC LIMIT 1`) as unknown as ResumeRow[];
  const resume = resumes[0];
  if (!resume) return null; // nothing to compare the posting against yet

  const resumeText = resume.content
    ? JSON.stringify(resume.content, null, 2)
    : (resume.source_text ?? '');

  try {
    const { text } = await completeText({
      system: loadPrompt('gap-questions'),
      messages: [
        {
          role: 'user',
          content: `MY RESUME:\n${resumeText}\n\nTHE JOB (${company} — ${role}):\n${description}`,
        },
      ],
      tier: 'fast',
    });

    const parsed = QuestionsSchema.safeParse(extractJsonArray(text) ?? []);
    if (!parsed.success) return null;

    // Drop anything already answered — nobody should be asked twice.
    const answered = new Set((await loadAnswers(sid)).map((a) => skillKey(a.skill)));
    const fresh = parsed.data.filter((q) => !answered.has(skillKey(q.skill)));
    return fresh.length > 0 ? fresh : null;
  } catch (err) {
    console.error('[jobs] question generation failed', err);
    return null;
  }
}

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

  const questions = await generateQuestions(sid, description, company, role);
  if (questions) {
    await sql()`UPDATE jobs SET questions = ${JSON.stringify(questions)} WHERE id = ${id} AND sid = ${sid}`;
    return redirectTo(req, `/jobs/${id}/questions`);
  }

  return redirectTo(req, '/jobs');
}
