import type { PromptProfile } from './profile';

/**
 * The user message each prompt receives. Kept in one place so the routes and the
 * prompt test set (web/evals) send exactly the same text: a test that builds its
 * own copy would silently measure a different message the day a route changes.
 */

const monthYear = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });

const resumeAndJob = (resumeText: string, title: string, description: string) =>
  `MY RESUME:\n${resumeText}\n\nTHE JOB (${title}):\n${description}`;

export function tailorMessage(resumeText: string, title: string, description: string, answersBlock = ''): string {
  return resumeAndJob(resumeText, title, description) + answersBlock;
}

export function letterMessage(resumeText: string, title: string, description: string): string {
  return resumeAndJob(resumeText, title, description);
}

/** Dated for the same reason as the match: the summary rewrite may say how many years. */
export function reviewMessage(resumeText: string, today = new Date()): string {
  return `TODAY: ${monthYear(today)}\n\n${resumeText}`;
}

/**
 * Today's date is included because the model does not know it: without it, "Jun 2019 –
 * Present" was counted as under seven years in some runs and over in others.
 */
export function matchMessage(resumeText: string, title: string, description: string, today = new Date()): string {
  return `TODAY: ${monthYear(today)}\n\n${resumeAndJob(resumeText, title, description)}`;
}

const line = (label: string, value: string | null | undefined) => `${label}: ${value?.trim() || '(blank)'}`;

/** The person's own words about themselves, for the prompts that write in their voice. */
export function profileLines(p: PromptProfile | null): string {
  const pr = p?.preferences;
  const aiming = [p?.target_role, ...(pr?.target_roles ?? [])].filter(Boolean).join('; ');
  return [
    line('AIMING FOR', aiming),
    line('FIELD', pr?.field),
    line('SENIORITY', pr?.seniority),
    line('GOALS', pr?.goals),
    line('INTERESTS', pr?.interests),
    line('STRENGTHS IN THEIR WORDS', pr?.strengths),
  ].join('\n');
}

export function emailMessage(o: {
  situation: string;
  to: string;
  why: string;
  profile: PromptProfile | null;
  resumeText: string;
  job?: { title: string; description: string } | null;
}): string {
  const head = [line('SITUATION', o.situation), line('TO', o.to), line('WHY THEM', o.why), profileLines(o.profile)].join('\n');
  const body = o.job ? resumeAndJob(o.resumeText, o.job.title, o.job.description) : `MY RESUME:\n${o.resumeText}`;
  return `${head}\n\n${body}`;
}

export function linkedinMessage(o: {
  profile: PromptProfile | null;
  savedRoles: string[];
  linkedinText: string;
  resumeText: string;
}): string {
  return [
    profileLines(o.profile),
    line('ROLES THEY SAVED', o.savedRoles.join('; ')),
    '',
    `MY LINKEDIN:\n${o.linkedinText.trim() || '(blank)'}`,
    '',
    `MY RESUME:\n${o.resumeText}`,
  ].join('\n');
}
