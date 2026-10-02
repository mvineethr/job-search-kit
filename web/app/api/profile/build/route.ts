import { randomUUID } from 'node:crypto';
import { requireSid } from '@/lib/auth';
import { ensureSchema, sql } from '@/lib/db';
import { loadPrompt } from '@/lib/prompts';
import { completeText } from '@/lib/provider';
import { extractJsonObject } from '@/lib/extract-json';
import { ResumeSchema } from '@/lib/resume-schema';
import { verifyTailoring } from '@/lib/verify-tailoring';
import { BuildAnswersSchema, answersToText, stripUnsupportedClaims } from '@/lib/build-answers';
import { upsertProfile } from '@/lib/profile';

export const runtime = 'nodejs';
export const maxDuration = 180;

/**
 * Builds a master résumé from guided answers. Called with fetch, not a form post,
 * so a failure leaves the answers on screen. The flattened answers are stored as
 * source_text: they are the person's own words and the original for tailoring.
 */
export async function POST(req: Request) {
  let sid: string;
  try {
    sid = await requireSid();
  } catch {
    return Response.json({ error: 'Sign in first.' }, { status: 401 });
  }

  const parsed = BuildAnswersSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { error: 'Add your name, and for each role a title, company and what you did there.' },
      { status: 400 },
    );
  }
  const answers = parsed.data;
  const source = answersToText(answers);

  try {
    const { text: reply } = await completeText({
      system: loadPrompt('resume-build'),
      tier: 'primary', // writing bullets needs judgment; parse-grade models over-reach
      messages: [{ role: 'user', content: source }],
    });
    const built = ResumeSchema.safeParse(extractJsonObject(reply));
    if (!built.success) throw new Error('built JSON did not match the schema');

    // The answers are the only source. Unsupported skills are removed by the
    // verifier; unsupported numbers and employers are removed here too, because a
    // master shows no audit and would pass them on to every later tailoring.
    const { cleaned: noSkills, audit } = verifyTailoring(built.data, null, source);
    const cleaned = stripUnsupportedClaims(noSkills, audit);

    await ensureSchema();
    const id = randomUUID();
    await sql()`
      INSERT INTO resumes (id, sid, title, source_text, content)
      VALUES (${id}, ${sid}, 'My résumé', ${source}, ${JSON.stringify(cleaned)})`;
    await upsertProfile(sid, answers.name);
    return Response.json({ id });
  } catch (err) {
    console.error('[profile/build] failed', err);
    return Response.json(
      { error: 'The résumé could not be written this time. Your answers are still here — try again.' },
      { status: 502 },
    );
  }
}
