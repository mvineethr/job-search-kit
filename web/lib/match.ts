import { z } from 'zod';
import type { Resume } from './resume-schema';
import { sourceText } from './verify-tailoring';
import { isClaimable, type Answer } from './question-schema';
import { skillKey } from './answers';

/**
 * How well a master résumé shows what a posting asks for. The model lists the
 * requirements and quotes its evidence; everything that decides the number
 * happens here, where it can be tested and cannot drift:
 *
 * - evidence that is not really in the résumé does not count,
 * - answers the person gave can raise a requirement, never lower it,
 * - the score is arithmetic on the result, computed fresh on every render.
 */

const STATUSES = ['met', 'partial', 'missing', 'unknown'] as const;
type Status = (typeof STATUSES)[number];

export const RequirementSchema = z.object({
  id: z.string().min(1).max(64),
  skill: z.string().min(1),
  text: z.string().min(1),
  kind: z.enum(['must', 'nice']).catch('must'),
  category: z
    .enum(['skill', 'experience', 'years', 'education', 'certification', 'authorization', 'location', 'other'])
    .catch('other'),
  status: z.enum(STATUSES),
  // The prompt asks for empty strings rather than absent keys; these defaults agree with it.
  evidence: z.string().default(''),
  question: z.string().default(''),
  why: z.string().default(''),
});

export const MatchOutputSchema = z.object({ requirements: z.array(RequirementSchema).min(1).max(30) });

export type Requirement = z.infer<typeof RequirementSchema>;

/** What is stored in jobs.match. */
export type StoredMatch = { requirements: Requirement[]; unverified: number; created_at: string };

const StoredMatchSchema = z.object({
  requirements: z.array(RequirementSchema),
  unverified: z.number().default(0),
  created_at: z.string().default(''),
});

/** Reads jobs.match; null for jobs added before matching existed. */
export function readMatch(raw: unknown): StoredMatch | null {
  const parsed = StoredMatchSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

/** Screens people out regardless of how well the rest matches. */
const HARD = new Set(['years', 'education', 'certification', 'authorization', 'location']);
const WEIGHT = { must: 3, nice: 1 } as const;
const CREDIT: Record<Status, number> = { met: 1, partial: 0.5, missing: 0, unknown: 0 };
const RANK: Record<Status, number> = { unknown: -1, missing: 0, partial: 1, met: 2 };

/** Lowercase words only, so a quote survives different dashes, quotes and spacing. */
export function normalize(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

/** The résumé as evidence source. Unlike sourceText alone, includes role dates for `years`. */
export function matchSource(resume: Resume | null, raw?: string | null): string {
  const dates = resume?.experience.map((r) => `${r.start} ${r.end}`).join(' \n ') ?? '';
  return normalize(`${sourceText(resume, raw)} \n ${dates}`);
}

/**
 * Downgrades any met/partial whose quote is not in the source. Run once, when
 * the match is made, against the résumé it was made from.
 */
export function verifyEvidence(reqs: Requirement[], source: string): { requirements: Requirement[]; unverified: number } {
  let unverified = 0;
  const requirements = reqs.map((r) => {
    if (r.status !== 'met' && r.status !== 'partial') return { ...r, evidence: '' };
    const quote = normalize(r.evidence);
    if (quote && source.includes(quote)) return r;
    // Years often span several roles ("Jun 2019 – Present" across two jobs), which is no
    // single line of the résumé. Accept a span when both of its ends are on it.
    const span = r.category === 'years' && r.evidence.match(/^\s*(\w{3,9} \d{4})\s*[–—-]\s*(\w{3,9} \d{4}|present)\s*$/i);
    if (span && source.includes(normalize(span[1])) && source.includes(normalize(span[2]))) return r;
    unverified++;
    return { ...r, status: 'missing' as const, evidence: '' };
  });
  return { requirements, unverified };
}

function answerStatus(a: Answer): Status {
  if (isClaimable(a.level)) return 'met';
  return a.level === 'some' ? 'partial' : 'missing';
}

export type MatchedRequirement = Requirement & { answered: boolean };

export type MatchView = {
  requirements: MatchedRequirement[];
  score: number | null;
  mustMet: number;
  mustTotal: number;
  /** Must-have hard filters the résumé does not show. */
  hardWarnings: MatchedRequirement[];
  /** Things a résumé does not normally say; the person checks these themselves. */
  checkYourself: MatchedRequirement[];
  openQuestions: MatchedRequirement[];
};

export function viewMatch(match: StoredMatch, answers: Answer[]): MatchView {
  const byKey = new Map(answers.map((a) => [skillKey(a.skill), a]));

  const requirements = match.requirements.map((r): MatchedRequirement => {
    // Answers are about skills and experience; they never decide a degree or a visa.
    const a = r.category === 'skill' || r.category === 'experience' ? byKey.get(skillKey(r.skill)) : undefined;
    if (!a) return { ...r, answered: false };
    const fromAnswer = answerStatus(a);
    return RANK[fromAnswer] > RANK[r.status]
      ? { ...r, status: fromAnswer, evidence: a.detail ? `You told us: ${a.detail}` : 'You told us you have this.', answered: true }
      : { ...r, answered: true };
  });

  const scored = requirements.filter((r) => r.status !== 'unknown');
  const total = scored.reduce((n, r) => n + WEIGHT[r.kind], 0);
  const earned = scored.reduce((n, r) => n + WEIGHT[r.kind] * CREDIT[r.status], 0);
  const musts = scored.filter((r) => r.kind === 'must');

  return {
    requirements,
    score: total > 0 ? Math.round((100 * earned) / total) : null,
    mustMet: musts.filter((r) => r.status === 'met').length,
    mustTotal: musts.length,
    hardWarnings: requirements.filter(
      (r) =>
        r.kind === 'must' &&
        HARD.has(r.category) &&
        (r.status === 'missing' || (r.status === 'partial' && (r.category === 'years' || r.category === 'education'))),
    ),
    checkYourself: requirements.filter((r) => r.status === 'unknown'),
    openQuestions: requirements.filter(
      (r) => r.question && !r.answered && (r.status === 'missing' || r.status === 'partial'),
    ),
  };
}

export function band(score: number): { label: string; tone: 'ok' | 'warn' | 'danger' } {
  if (score >= 75) return { label: 'Strong fit', tone: 'ok' };
  if (score >= 50) return { label: 'Partial fit', tone: 'warn' };
  return { label: 'Big gaps', tone: 'danger' };
}
