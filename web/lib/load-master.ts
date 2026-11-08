import { ensureSchema, sql, type ResumeRow } from './db';
import { ResumeSchema } from './resume-schema';
import { sourceText } from './verify-tailoring';

/**
 * The active master (most recently updated), as the model sees it and as the
 * checks see it. `source` covers the parsed résumé and the person's original words.
 */
export async function loadMaster(sid: string): Promise<{ id: string; text: string; source: string; name: string } | null> {
  await ensureSchema();
  const rows = (await sql()`
    SELECT id, content, source_text FROM resumes
    WHERE sid = ${sid} AND parent_id IS NULL
    ORDER BY updated_at DESC LIMIT 1`) as unknown as ResumeRow[];
  const row = rows[0];
  if (!row) return null;
  const parsed = ResumeSchema.safeParse(row.content);
  const resume = parsed.success ? parsed.data : null;
  return {
    id: row.id,
    text: row.content ? JSON.stringify(row.content, null, 2) : (row.source_text ?? ''),
    source: sourceText(resume, row.source_text),
    name: resume?.name ?? '',
  };
}
