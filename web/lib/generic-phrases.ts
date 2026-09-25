import type { Resume } from './resume-schema';

/**
 * Finds the filler words that core/ats-rules.md bans. The prompts already tell the
 * model to avoid them; this checks whether it did. The list lives only in
 * ats-rules.md so the prompt and the check can never disagree.
 */

export type PhraseHit = { phrase: string; where: string; text: string };

/** Reads the comma-separated `Verbs:` and `Words:` bullets under `## Banned`. */
export function bannedPhrases(rules: string): string[] {
  const section = rules.replace(/\r\n/g, '\n').split(/^## Banned\b.*$/m)[1]?.split(/^## /m)[0] ?? '';
  // Bullets wrap onto indented lines; join those back onto their bullet.
  const bullets = section.replace(/\n[ \t]+/g, ' ').split('\n');
  return bullets
    .map((line) => line.match(/^-\s*(?:Verbs|Words):\s*(.*)$/)?.[1])
    .filter((list): list is string => Boolean(list))
    .flatMap((list) => list.split(','))
    .map((p) => p.trim().replace(/\.$/, '').toLowerCase())
    .filter(Boolean);
}

function escape(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Whole-word, case-insensitive: "dynamic" must not match "Dynamics 365". */
function contains(text: string, phrase: string): boolean {
  return new RegExp(`(?<![\\w-])${escape(phrase)}(?![\\w-])`, 'i').test(text);
}

/**
 * Phrases the posting itself uses are skipped: if the job asks for "strategic
 * planning", echoing it is keyword matching, not filler.
 */
export function findGenericPhrases(
  parts: { where: string; text: string }[],
  phrases: string[],
  posting = '',
): PhraseHit[] {
  const active = phrases.filter((p) => !contains(posting, p));
  const hits: PhraseHit[] = [];
  for (const part of parts) {
    for (const phrase of active) {
      if (contains(part.text, phrase)) hits.push({ phrase, ...part });
    }
  }
  return hits;
}

/** The prose parts of a résumé, labelled so a hit can say where it is. */
export function resumeParts(resume: Resume): { where: string; text: string }[] {
  const parts = [{ where: 'Summary', text: resume.summary ?? '' }];
  for (const role of resume.experience) {
    for (const bullet of role.bullets) parts.push({ where: `${role.title}, ${role.company}`, text: bullet });
  }
  return parts;
}
