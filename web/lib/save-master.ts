import { randomUUID } from 'node:crypto';
import { ensureSchema, sql } from './db';
import { loadPrompt } from './prompts';
import { completeText } from './provider';
import { extractJsonObject } from './extract-json';
import { ResumeSchema, type Resume } from './resume-schema';

/**
 * Stores text as a master résumé, with a model reading it into sections. Parsing
 * failure is not fatal: the text is kept either way, so the person does not lose
 * what they gave.
 */
export async function saveMaster(
  sid: string,
  text: string,
  title: string,
): Promise<{ id: string; content: Resume | null }> {
  let content: Resume | null = null;
  try {
    const { text: reply } = await completeText({
      system: loadPrompt('resume-parse'),
      tier: 'fast', // transcription needs no deliberation
      messages: [{ role: 'user', content: text }],
    });
    const parsed = ResumeSchema.safeParse(extractJsonObject(reply));
    if (parsed.success) content = parsed.data;
    else console.error('[save-master] parsed JSON did not match the schema');
  } catch (err) {
    console.error('[save-master] parse failed', err);
  }

  await ensureSchema();
  const id = randomUUID();
  await sql()`
    INSERT INTO resumes (id, sid, title, source_text, content)
    VALUES (${id}, ${sid}, ${title}, ${text}, ${content ? JSON.stringify(content) : null})`;
  return { id, content };
}
