import { ensureSchema, sql } from './db';

/** A blank name or missing LinkedIn text never overwrites what is already stored. */
export async function upsertProfile(sid: string, name: string, linkedinText?: string | null): Promise<void> {
  await ensureSchema();
  await sql()`
    INSERT INTO profiles (sid, name, linkedin_text)
    VALUES (${sid}, ${name}, ${linkedinText ?? null})
    ON CONFLICT (sid) DO UPDATE SET
      name = CASE WHEN EXCLUDED.name <> '' THEN EXCLUDED.name ELSE profiles.name END,
      linkedin_text = COALESCE(EXCLUDED.linkedin_text, profiles.linkedin_text)`;
}

export async function getProfile(sid: string): Promise<{ name: string } | null> {
  await ensureSchema();
  const rows = (await sql()`SELECT name FROM profiles WHERE sid = ${sid}`) as { name: string }[];
  return rows[0] ?? null;
}
