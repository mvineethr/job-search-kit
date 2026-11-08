import { z } from 'zod';
import { numbersIn } from './verify-tailoring';

/** Cold emails and LinkedIn rewrites: model output shapes and the checks run on them. */

export const SITUATIONS = {
  'after-applying': 'I applied and want to reach the team',
  referral: 'Ask someone there for a referral',
  recruiter: 'Follow up with a recruiter',
  'no-posting': 'No job posted, ask about the team',
} as const;
export type Situation = keyof typeof SITUATIONS;
export const isSituation = (s: string): s is Situation => Object.hasOwn(SITUATIONS, s);

export const EmailSchema = z.object({
  subject: z.string().min(1),
  paragraphs: z.array(z.string().min(1)).min(1),
  facts: z.array(z.string()).default([]),
  gaps: z.array(z.string()).default([]),
});

const Current = z.string().default('');

export const LinkedInSchema = z.object({
  identity: z.string().default(''),
  audit: z
    .array(z.object({ area: z.string().default('other'), problem: z.string().min(1), quote: Current }))
    .default([]),
  headline: z.object({ current: Current, suggested: z.array(z.string().min(1)).min(1) }),
  about: z.object({ current: Current, suggested: z.string().min(1) }),
  experience: z
    .array(z.object({ title: z.string(), company: z.string(), bullets: z.array(z.string()).default([]) }))
    .default([]),
  skills: z.array(z.string()).default([]),
});

export type Email = z.infer<typeof EmailSchema>;
export type LinkedIn = z.infer<typeof LinkedInSchema>;

/** What is stored: the model's output plus what the code checked. */
export type StoredEmail = Email & {
  situation: Situation;
  greeting: string;
  name: string;
  unsupportedNumbers: string[];
};
export type StoredLinkedIn = LinkedIn & {
  fromLinkedIn: boolean;
  unsupportedNumbers: string[];
  removedSkills: string[];
  removedRoles: string[];
};

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();

/** Numbers in the text that the person's own material never states. Flagged, never rewritten. */
export function unsupportedNumbers(texts: string[], source: string): string[] {
  const src = source.toLowerCase();
  return [...new Set(texts.flatMap(numbersIn))].filter((n) => !src.includes(n.toLowerCase()));
}

/** The app writes the greeting so the model can never invent a name: only the first word the person typed. */
export function greetingFor(to: string): string {
  const first = to.trim().split(/[\s,(]/)[0]?.replace(/[^\p{L}'-]/gu, '');
  return first ? `Hi ${first},` : 'Hello,';
}

export function emailWords(e: Pick<Email, 'paragraphs'>): number {
  return e.paragraphs.join(' ').split(/\s+/).filter(Boolean).length;
}

/**
 * Enforced in code, not left to the prompt: skills and roles absent from the person's material
 * are removed, audit quotes that are not in their LinkedIn text are dropped (it must quote them,
 * not paraphrase), and numbers they never stated are flagged.
 */
export function verifyLinkedIn(
  out: LinkedIn,
  source: string,
  linkedinText: string,
): Omit<StoredLinkedIn, 'fromLinkedIn'> {
  const src = norm(source);
  const li = norm(linkedinText);
  const removedSkills = out.skills.filter((s) => !src.includes(norm(s)));
  const removedRoles = out.experience.filter((r) => !src.includes(norm(r.company))).map((r) => `${r.title}, ${r.company}`);
  const experience = out.experience.filter((r) => src.includes(norm(r.company)));
  const audit = out.audit.map((a) => (a.quote && !li.includes(norm(a.quote)) ? { ...a, quote: '' } : a));
  // "Current" text shown back to the person must really be theirs.
  const headline = { ...out.headline, current: li.includes(norm(out.headline.current)) ? out.headline.current : '' };
  const about = { ...out.about, current: li.includes(norm(out.about.current)) ? out.about.current : '' };

  const written = [...headline.suggested, about.suggested, ...experience.flatMap((r) => r.bullets)];
  return {
    ...out,
    audit,
    headline,
    about,
    experience,
    skills: out.skills.filter((s) => src.includes(norm(s))),
    unsupportedNumbers: unsupportedNumbers(written, source),
    removedSkills,
    removedRoles,
  };
}
