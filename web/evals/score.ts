import { METRIC_NEEDED, ResumeSchema, type Resume } from '../lib/resume-schema';
import { extractJsonObject } from '../lib/extract-json';
import { sourceText, verifyTailoring, numbersIn } from '../lib/verify-tailoring';
import { bannedPhrases, findGenericPhrases, resumeParts } from '../lib/generic-phrases';
import { loadAtsRules } from '../lib/prompts';
import { LetterSchema, wordCount } from '../lib/letter-schema';
import { MatchOutputSchema, verifyEvidence, matchSource, viewMatch, band } from '../lib/match';
import { parseFindings } from '../lib/findings-schema';
import type { Fixture } from './fixtures';

export type Score = { gates: Record<string, boolean>; metrics: Record<string, number> };

const STOP = new Set(
  'the and for with from that this was were are has have had into over per our its their your you all not but than then also via who which been will can out'.split(' '),
);

/** The parse prompt normalises dates to "Mon YYYY", so a month word it adds is formatting, not invention. */
export const DATE_WORDS = new Set('jan feb mar apr may jun jul aug sep oct nov dec present'.split(' '));

/** Lowercased runs of letters/digits, 3+ long, minus stopwords. Diacritics count as letters. */
export function contentWords(text: string): Set<string> {
  return new Set((text.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? []).filter((w) => !STOP.has(w)));
}

/** Every word a résumé holds: body text plus the name, contact and dates that sourceText leaves out. */
export function resumeWords(r: Resume): Set<string> {
  const dates = r.experience.map((e) => `${e.start} ${e.end}`).join(' ');
  const contact = Object.values(r.contact).filter(Boolean).join(' ');
  return contentWords([sourceText(r), r.name, r.targetTitle ?? '', contact, dates].join(' \n '));
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Whole-word, case-insensitive: "go" must not match "ago". */
export function hasTerm(text: string, term: string): boolean {
  return new RegExp(`(?<![\\p{L}\\p{N}])${escape(term)}(?![\\p{L}\\p{N}])`, 'iu').test(text);
}

export function coverage(text: string, terms: string[]): number {
  if (terms.length === 0) return 1;
  return terms.filter((t) => hasTerm(text, t)).length / terms.length;
}

/**
 * Share of bullets that open with a plain verb (not banned, not a gerund) and carry a
 * number or the [METRIC NEEDED] marker. Crude on purpose; the blind pick covers the rest.
 */
export function bulletStrength(bullets: string[], banned: string[]): number {
  if (bullets.length === 0) return 0;
  const strong = bullets.filter((b) => {
    const first = (b.trim().split(/\s+/)[0] ?? '').toLowerCase().replace(/[^\p{L}]/gu, '');
    const verbOk = first.length > 0 && !banned.includes(first) && !first.endsWith('ing');
    return verbOk && (/\d/.test(b) || b.includes(METRIC_NEEDED));
  });
  return strong.length / bullets.length;
}

let banned: string[] | null = null;
const bannedList = () => (banned ??= bannedPhrases(loadAtsRules()));

const NOT_PARSED: Score = { gates: { parses: false }, metrics: {} };
const count = (text: string, needle: string) => text.split(needle).length - 1;

const normNum = (n: string) => n.toLowerCase().replace(/[.,]+$/, '').replace(/(?<=\d),(?=\d)/g, '').replace(/\s+%/, '%');

/** Numbers in `text` that appear in none of the sources. Set membership, so "4" is not excused by "2024". */
export function newNumbers(text: string, ...sources: string[]): string[] {
  const known = new Set(sources.flatMap((s) => numbersIn(s)).map(normNum));
  return numbersIn(text).filter((n) => !known.has(normNum(n)));
}

/** All the text of a résumé, including the name, contact and dates that sourceText leaves out. */
function allText(r: Resume): string {
  const dates = r.experience.map((e) => `${e.start} ${e.end}`).join(' ');
  return [sourceText(r), r.name, r.targetTitle ?? '', Object.values(r.contact).filter(Boolean).join(' '), dates].join(' \n ');
}

export function scoreParse(text: string, fx: Fixture): Score {
  const parsed = ResumeSchema.safeParse(extractJsonObject(text));
  if (!parsed.success) return NOT_PARSED;
  const out = resumeWords(parsed.data);
  const src = contentWords(fx.resumeText);
  const expected = resumeWords(fx.resume);
  // The word tokenizer ignores 1-2 char tokens, so numbers like "40%" are checked separately.
  const invented =
    [...out].filter((w) => !src.has(w) && !DATE_WORDS.has(w)).length + newNumbers(allText(parsed.data), fx.resumeText).length;
  const bullets = (r: typeof fx.resume) => r.experience.reduce((n, e) => n + e.bullets.length, 0);
  return {
    gates: { parses: true, noInventedWords: invented === 0 },
    metrics: {
      invented,
      lost: [...expected].filter((w) => !out.has(w)).length,
      rolesDiff: Math.abs(parsed.data.experience.length - fx.resume.experience.length),
      bulletsDiff: Math.abs(bullets(parsed.data) - bullets(fx.resume)),
    },
  };
}

export function scoreTailor(text: string, fx: Fixture): Score {
  const parsed = ResumeSchema.safeParse(extractJsonObject(text));
  if (!parsed.success) return NOT_PARSED;
  const { cleaned, audit } = verifyTailoring(parsed.data, fx.resume, fx.resumeText);
  const out = sourceText(parsed.data); // before cleaning: a trap anywhere in the output counts
  return {
    gates: {
      parses: true,
      noRemovedSkills: audit.removedSkills.length === 0,
      noUnsupportedNumbers: newNumbers(sourceText(parsed.data), fx.resumeText, sourceText(fx.resume)).length === 0,
      noUnsupportedEmployers: audit.unsupportedEmployers.length === 0,
      noTrap: !fx.truth.traps.some((t) => hasTerm(out, t)),
    },
    metrics: {
      coverage: coverage(sourceText(cleaned), fx.truth.supported),
      metricNeeded: count(sourceText(cleaned), METRIC_NEEDED.toLowerCase()),
      filler: findGenericPhrases(resumeParts(cleaned), bannedList(), fx.description).length,
      bulletStrength: bulletStrength(cleaned.experience.flatMap((e) => e.bullets), bannedList()),
      bulletsRestored: audit.bulletsRestored ?? 0,
    },
  };
}

export function scoreLetter(text: string, fx: Fixture): Score {
  const parsed = LetterSchema.safeParse(extractJsonObject(text));
  if (!parsed.success) return NOT_PARSED;
  const body = parsed.data.paragraphs.join('\n');
  // Quoting the posting's own numbers ("your team of 12") is not invention.
  return {
    gates: {
      parses: true,
      noTrap: !fx.truth.traps.some((t) => hasTerm(body, t)),
      noNewNumbers: newNumbers(body, sourceText(fx.resume, fx.resumeText), fx.description).length === 0,
    },
    metrics: {
      filler: findGenericPhrases(parsed.data.paragraphs.map((p) => ({ where: 'Letter', text: p })), bannedList(), fx.description).length,
      coverage: coverage(body, fx.truth.supported),
      words: wordCount(parsed.data),
    },
  };
}

const BAND_LABEL = { high: 'Strong fit', mid: 'Partial fit', low: 'Big gaps' } as const;

export function scoreMatch(text: string, fx: Fixture): Score {
  const parsed = MatchOutputSchema.safeParse(extractJsonObject(text));
  if (!parsed.success) return NOT_PARSED;
  const { requirements, unverified } = verifyEvidence(parsed.data.requirements, matchSource(fx.resume, fx.resumeText));
  const trapClaimed = requirements.some(
    (r) => (r.status === 'met' || r.status === 'partial') && fx.truth.traps.some((t) => hasTerm(r.skill, t) || hasTerm(r.text, t)),
  );
  const score = viewMatch({ requirements, unverified, created_at: '' }, []).score;
  return {
    gates: { parses: true, noTrapClaimed: !trapClaimed },
    metrics: {
      // No score when every requirement is unknown: 0 would read as a real, bad result.
      ...(score === null ? {} : { score, bandHit: band(score).label === BAND_LABEL[fx.truth.fitBand] ? 1 : 0 }),
      unverified,
      requirements: requirements.length,
    },
  };
}

export function scoreReview(text: string, _fx: Fixture): Score {
  const findings = parseFindings(text);
  if (findings.length === 0) return NOT_PARSED;
  return {
    gates: { parses: true },
    metrics: { findings: findings.length, critical: findings.filter((f) => f.severity === 'critical').length },
  };
}
