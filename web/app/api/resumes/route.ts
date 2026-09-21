import { randomUUID } from 'node:crypto';
import { requireSid } from '@/lib/auth';
import { ensureSchema, sql } from '@/lib/db';
import { loadPrompt } from '@/lib/prompts';
import { completeText } from '@/lib/provider';
import { extractJsonObject } from '@/lib/extract-json';
import { ResumeSchema } from '@/lib/resume-schema';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Saves a résumé. The pasted text is stored as-is, and a model turns it into
 * structured JSON so the document view and tailoring can work with it.
 *
 * Parsing failure is not fatal: the text is kept either way, so the review flow
 * still works and the person does not lose what they pasted.
 */
export async function POST(req: Request) {
  let sid: string;
  try {
    sid = await requireSid();
  } catch {
    return Response.json({ error: 'Sign in first.' }, { status: 401 });
  }

  const form = await req.formData();
  const text = String(form.get('text') ?? '').trim();
  const title = String(form.get('title') ?? '').trim() || 'My résumé';

  if (text.length < 80) {
    return Response.json({ error: 'That looks too short to be a résumé.' }, { status: 400 });
  }

  let content: unknown = null;
  try {
    const { text: reply } = await completeText({
      system: loadPrompt('resume-parse'),
      messages: [{ role: 'user', content: text }],
    });
    const raw = extractJsonObject(reply);
    const parsed = ResumeSchema.safeParse(raw);
    if (parsed.success) content = parsed.data;
    else console.error('[resumes] parsed JSON did not match the schema');
  } catch (err) {
    console.error('[resumes] parse failed', err);
  }

  await ensureSchema();
  const id = randomUUID();
  await sql()`
    INSERT INTO resumes (id, sid, title, source_text, content)
    VALUES (${id}, ${sid}, ${title}, ${text}, ${content ? JSON.stringify(content) : null})`;

  return new Response(null, { status: 303, headers: { location: new URL(`/resume/${id}`, req.url).toString() } });
}
