import { requireSid } from '@/lib/auth';
import { ensureSchema, sql, type ResumeRow } from '@/lib/db';
import { loadPrompt } from '@/lib/prompts';
import { completeText } from '@/lib/provider';
import { extractJsonObject } from '@/lib/extract-json';
import { ResumeSchema, METRIC_NEEDED } from '@/lib/resume-schema';
import { countMarkers } from '@/lib/metric-schema';
import { backWithError, redirectTo } from '@/lib/redirect';

export const runtime = 'nodejs';
export const maxDuration = 180;

type Supplied = { roleIndex: number; bulletIndex: number; bullet: string; answer: string };

/**
 * Fills the [METRIC NEEDED] holes with what the person actually told us.
 *
 * Their answers are their own words about their own work, so this is the one
 * place a number may enter a résumé without already being written on it.
 * Unanswered bullets keep their marker: a hole is honest, a guess is not.
 */
export async function POST(req: Request) {
  let sid: string;
  try {
    sid = await requireSid();
  } catch {
    return redirectTo(req, '/login');
  }

  const form = await req.formData();
  const resumeId = String(form.get('resumeId') ?? '');

  await ensureSchema();
  const rows = (await sql()`
    SELECT id, title, source_text, content, parent_id, job_id, created_at, updated_at
    FROM resumes WHERE id = ${resumeId} AND sid = ${sid}`) as unknown as ResumeRow[];
  const row = rows[0];
  if (!row) return backWithError(req, '/', 'That résumé could not be found.');

  const parsed = ResumeSchema.safeParse(row.content);
  if (!parsed.success) return backWithError(req, `/resume/${resumeId}`, 'That résumé could not be read.');
  const resume = parsed.data;

  const ids = [...form.keys()]
    .filter((k) => k.startsWith('answer__'))
    .map((k) => k.slice('answer__'.length));

  const supplied: Supplied[] = [];
  for (const id of ids) {
    const answer = String(form.get(`answer__${id}`) ?? '').trim();
    if (!answer) continue; // skipped, marker stays

    const roleIndex = Number(form.get(`role__${id}`));
    const bulletIndex = Number(form.get(`bullet__${id}`));
    const bullet = resume.experience[roleIndex]?.bullets?.[bulletIndex];
    if (!bullet || !bullet.includes(METRIC_NEEDED)) continue;

    supplied.push({ roleIndex, bulletIndex, bullet, answer });
  }

  if (supplied.length === 0) {
    return backWithError(req, `/resume/${resumeId}`, 'Nothing was filled in — every question was left blank.');
  }

  let reply: string;
  try {
    const out = await completeText({
      system: loadPrompt('metric-fill'),
      messages: [
        {
          role: 'user',
          content:
            `THE RESUME:\n${JSON.stringify(resume, null, 2)}\n\n` +
            `WHAT THEY TOLD ME ABOUT THE MISSING NUMBERS:\n` +
            supplied
              .map(
                (s) =>
                  `- experience[${s.roleIndex}].bullets[${s.bulletIndex}]\n` +
                  `  bullet: ${s.bullet}\n` +
                  `  their answer: ${s.answer}`,
              )
              .join('\n'),
        },
      ],
      tier: 'fast',
    });
    reply = out.text;
  } catch (err) {
    console.error('[metrics] provider failed', err);
    return backWithError(req, `/resume/${resumeId}`, 'That did not go through — your résumé is unchanged.');
  }

  const filled = ResumeSchema.safeParse(extractJsonObject(reply));
  if (!filled.success) {
    console.error('[metrics] schema mismatch');
    return backWithError(
      req,
      `/resume/${resumeId}`,
      'The filled-in résumé came back in a shape we could not read. Nothing was changed.',
    );
  }

  // Guard against the rewrite quietly losing content: only the answered bullets
  // should change, so the shape must match what we sent.
  const sameShape =
    filled.data.experience.length === resume.experience.length &&
    filled.data.experience.every((r, i) => r.bullets.length === resume.experience[i].bullets.length);
  if (!sameShape) {
    console.error('[metrics] rewrite changed the résumé shape; rejected');
    return backWithError(
      req,
      `/resume/${resumeId}`,
      'The rewrite changed more than the numbers, so it was discarded. Your résumé is unchanged.',
    );
  }

  await sql()`
    UPDATE resumes SET content = ${JSON.stringify(filled.data)}, updated_at = now()
    WHERE id = ${resumeId} AND sid = ${sid}`;

  const left = countMarkers(filled.data);
  return redirectTo(req, `/resume/${resumeId}?filled=${supplied.length}&left=${left}`);
}
