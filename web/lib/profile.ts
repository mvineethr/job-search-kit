import { ensureSchema, sql } from './db';

export type Profile = {
  name: string;
  target_role: string | null;
  years_experience: string | null;
  location: string | null;
  search_status: string | null;
  heard_from: string | null;
};

export const YEARS = ['Under 1', '1–2', '3–5', '6–10', 'More than 10'] as const;
export const SEARCH_STATUS = ['Actively looking', 'Open to offers', 'Just exploring'] as const;

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

export type About = Pick<Profile, 'target_role' | 'years_experience' | 'location' | 'search_status' | 'heard_from'>;

/** Career basics, all optional. Saving the form replaces them; blanks clear a field. */
export async function saveAbout(sid: string, a: About): Promise<void> {
  await ensureSchema();
  await sql()`
    INSERT INTO profiles (sid, target_role, years_experience, location, search_status, heard_from)
    VALUES (${sid}, ${a.target_role}, ${a.years_experience}, ${a.location}, ${a.search_status}, ${a.heard_from})
    ON CONFLICT (sid) DO UPDATE SET
      target_role = EXCLUDED.target_role,
      years_experience = EXCLUDED.years_experience,
      location = EXCLUDED.location,
      search_status = EXCLUDED.search_status,
      heard_from = EXCLUDED.heard_from`;
}

/** Records that this person agreed to the given Terms/Privacy version, now. */
export async function acceptTerms(sid: string, name: string, version: string): Promise<void> {
  await ensureSchema();
  await sql()`
    INSERT INTO profiles (sid, name, terms_version, terms_accepted_at)
    VALUES (${sid}, ${name}, ${version}, now())
    ON CONFLICT (sid) DO UPDATE SET terms_version = EXCLUDED.terms_version, terms_accepted_at = now()`;
}

export async function acceptedTermsVersion(sid: string): Promise<string | null> {
  await ensureSchema();
  const rows = (await sql()`SELECT terms_version FROM profiles WHERE sid = ${sid}`) as { terms_version: string | null }[];
  return rows[0]?.terms_version ?? null;
}

export async function getProfile(sid: string): Promise<Profile | null> {
  await ensureSchema();
  const rows = (await sql()`
    SELECT name, target_role, years_experience, location, search_status, heard_from
    FROM profiles WHERE sid = ${sid}`) as Profile[];
  return rows[0] ?? null;
}
