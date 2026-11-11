import { z } from 'zod';
import { sql } from './db';
import { loadPrompt } from './prompts';
import { completeText } from './provider';
import { extractJsonObject } from './extract-json';
import { loadMaster } from './load-master';
import { getLinkedInText, getProfile, type PromptProfile } from './profile';
import { profileLines } from './messages';
import { answerDetailText, claimableSkills, loadAnswers } from './answers';
import type { Answer } from './question-schema';

/** Job functions. Fixed so the model's answer can be checked and filtered on. */
export const FIELDS = [
  'Software engineering', 'Data and analytics', 'AI and machine learning', 'Product management', 'Design',
  'Marketing', 'Sales', 'Customer support', 'Operations', 'Finance and accounting', 'People and HR', 'Legal',
  'Healthcare and clinical', 'Education and teaching', 'Security', 'Research and science', 'Other',
] as const;

/** Industries the starter company list is tagged with (lib/starter-companies.ts). */
export const INDUSTRIES = [
  'AI and data', 'Software and infrastructure', 'Business software', 'Fintech', 'Healthcare', 'Education',
  'Consumer and media', 'Travel and transport',
] as const;

export const SENIORITIES = ['Entry level', 'Mid level', 'Senior', 'Lead or principal', 'Manager or above'] as const;

/**
 * Search terms for finding and ranking openings: never shown to an employer, never
 * written into a résumé. Built by core/search-profile.md, then checked here, and the
 * person can edit every part of it.
 */
export type SearchProfile = {
  summary: string;
  roles: string[];
  nearby_roles: string[];
  fields: string[];
  industries: string[];
  seniority: string;
  skills: string[];
  built_at: string;
  edited: boolean;
};

const ModelOut = z.object({
  summary: z.string().default(''),
  roles: z.array(z.string()).default([]),
  nearby_roles: z.array(z.string()).default([]),
  fields: z.array(z.string()).default([]),
  industries: z.array(z.string()).default([]),
  seniority: z.string().default(''),
  skills: z.array(z.string()).default([]),
});

const clean = (xs: string[], max: number, len = 80) => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of xs) {
    const v = x.trim().replace(/\s+/g, ' ').slice(0, len);
    if (v && !seen.has(v.toLowerCase())) {
      seen.add(v.toLowerCase());
      out.push(v);
    }
  }
  return out.slice(0, max);
};
const pick = (xs: string[], allowed: readonly string[], max: number) =>
  clean(xs, 20).filter((x) => allowed.includes(x)).slice(0, max);

/**
 * The model's answer → a profile we keep. Fields, industries and seniority must be
 * from their lists; skills must be written on the résumé (`source`, lowercased), so a
 * likely-but-unclaimed skill never becomes a search term the person did not give.
 */
export function verifySearchProfile(raw: unknown, source: string): SearchProfile | null {
  const parsed = ModelOut.safeParse(raw);
  if (!parsed.success) return null;
  const p = parsed.data;
  const roles = clean(p.roles, 5);
  if (roles.length === 0) return null;
  return {
    summary: p.summary.trim().slice(0, 300),
    roles,
    nearby_roles: clean(p.nearby_roles, 6).filter((r) => !roles.some((x) => x.toLowerCase() === r.toLowerCase())),
    fields: pick(p.fields, FIELDS, 3),
    industries: pick(p.industries, INDUSTRIES, 3),
    seniority: (SENIORITIES as readonly string[]).includes(p.seniority) ? p.seniority : '',
    skills: clean(p.skills, 12, 60).filter((s) => source.toLowerCase().includes(s.toLowerCase())),
    built_at: new Date().toISOString(),
    edited: false,
  };
}

/** The edit form → a profile. The person's own words, so only trimmed and capped; lists still accept only their values. */
export function parseSearchProfileForm(form: FormData, before: SearchProfile | null): SearchProfile {
  const list = (key: string) => String(form.get(key) ?? '').split(/[,\n]/);
  const seniority = String(form.get('seniority') ?? '');
  return {
    summary: before?.summary ?? '',
    roles: clean(list('roles'), 5),
    nearby_roles: clean(list('nearby_roles'), 6),
    fields: pick(form.getAll('fields').map(String), FIELDS, 3),
    industries: pick(form.getAll('industries').map(String), INDUSTRIES, 3),
    seniority: (SENIORITIES as readonly string[]).includes(seniority) ? seniority : '',
    skills: clean(list('skills'), 12, 60),
    built_at: before?.built_at ?? new Date().toISOString(),
    edited: true,
  };
}

export function readSearchProfile(v: unknown): SearchProfile | null {
  const p = v as SearchProfile | null;
  return p && Array.isArray(p.roles) ? p : null;
}

/** Every title worth matching openings against: the profile's roles and nearby roles, plus what they typed. */
export function wantedRoles(sp: SearchProfile | null, profile: PromptProfile | null): string[] {
  return clean(
    [profile?.target_role ?? '', ...(profile?.preferences?.target_roles ?? []), ...(sp?.roles ?? []), ...(sp?.nearby_roles ?? [])],
    20,
  );
}

// shortcut: LinkedIn text is cut at this length; raise if long profiles lose roles.
const LINKEDIN_MAX = 6000;

/** Everything the person has told the app, so it never has to ask again. */
export function searchProfileMessage(
  resumeText: string,
  profile: PromptProfile | null,
  answers: Answer[] = [],
  linkedinText = '',
): string {
  const told = answers.map((a) => `- ${a.skill}: ${a.level}${a.detail ? ` (${a.detail})` : ''}`).join('\n');
  return [
    profileLines(profile),
    '',
    `MY RESUME:\n${resumeText}`,
    told && `\nWHAT I TOLD YOU ABOUT MY SKILLS (my level, in my words):\n${told}`,
    linkedinText.trim() && `\nMY LINKEDIN:\n${linkedinText.trim().slice(0, LINKEDIN_MAX)}`,
  ]
    .filter((x) => x !== '')
    .join('\n');
}

/**
 * Builds and stores the search profile from the active master and the profile's own
 * words. Sponsorship, pay, places and dealbreakers never reach the model (profileLines
 * leaves them out). Returns null when there is no résumé or the answer is unusable.
 */
export async function buildSearchProfile(sid: string): Promise<SearchProfile | null> {
  const [master, profile, answers, linkedin] = await Promise.all([
    loadMaster(sid),
    getProfile(sid),
    loadAnswers(sid),
    getLinkedInText(sid),
  ]);
  if (!master) return null;
  // A skill counts as theirs if the résumé, their LinkedIn or a skill they said they can defend names it.
  const defended = answers.filter((a) => claimableSkills([a]).length > 0);
  const source = [master.source, linkedin ?? '', answerDetailText(defended)]
    .join('\n')
    .toLowerCase();
  try {
    const { text } = await completeText({
      system: loadPrompt('search-profile'),
      tier: 'fast', // search terms, not claims: the fast model is enough, and skills are checked below
      messages: [{ role: 'user', content: searchProfileMessage(master.text, profile, answers, linkedin ?? '') }],
    });
    const sp = verifySearchProfile(extractJsonObject(text), source);
    if (!sp) {
      console.error('[search-profile] output did not match the schema');
      return null;
    }
    await saveSearchProfile(sid, sp);
    return sp;
  } catch (err) {
    console.error('[search-profile] failed', err);
    return null;
  }
}

/**
 * Keeps the profile current without asking anything: called after the person adds a
 * résumé, answers skill questions or changes their profile. A profile they edited by
 * hand is left alone; the Openings page offers a rebuild instead.
 */
export async function refreshSearchProfile(sid: string): Promise<void> {
  const rows = (await sql()`SELECT search_profile FROM profiles WHERE sid = ${sid}`) as { search_profile: unknown }[];
  if (readSearchProfile(rows[0]?.search_profile)?.edited) return;
  await buildSearchProfile(sid);
}

/** True when the résumé or the skill answers changed after the profile was built. */
export function isSearchProfileBehind(sp: SearchProfile, latestChange: string | null): boolean {
  return Boolean(latestChange && new Date(latestChange).getTime() > new Date(sp.built_at).getTime());
}

export async function saveSearchProfile(sid: string, sp: SearchProfile): Promise<void> {
  await sql()`
    INSERT INTO profiles (sid, search_profile) VALUES (${sid}, ${JSON.stringify(sp)}::jsonb)
    ON CONFLICT (sid) DO UPDATE SET search_profile = EXCLUDED.search_profile`;
}
