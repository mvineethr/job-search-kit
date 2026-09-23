import { z } from 'zod';

export const QuestionSchema = z.object({
  id: z.string().min(1).max(64),
  skill: z.string().min(1),
  question: z.string().min(1),
  why: z.string().default(''),
});

export const QuestionsSchema = z.array(QuestionSchema).min(1).max(12);

export type Question = z.infer<typeof QuestionSchema>;

/**
 * How much experience someone has with a thing. Deliberately coarse: a résumé
 * claim is binary in an interview — you either defend it or you do not — so the
 * useful distinction is "can I put this on the page" rather than a 1-10 scale.
 */
export const LEVELS = ['none', 'some', 'solid', 'deep'] as const;
export type Level = (typeof LEVELS)[number];

export const LEVEL_LABEL: Record<Level, string> = {
  none: "Never used it",
  some: 'Tried it, would not claim it',
  solid: 'Used it properly at work',
  deep: 'This is a strength',
};

export const LEVEL_HELP: Record<Level, string> = {
  none: 'Stays off your résumé, and is listed as a real gap.',
  some: 'Stays off your résumé. Worth a sentence in a cover letter if asked.',
  solid: 'Can go on your résumé for this job.',
  deep: 'Can go on your résumé and lead the Skills list.',
};

/** Levels that may appear on a résumé. Below this, a claim is not defensible. */
export function isClaimable(level: Level): boolean {
  return level === 'solid' || level === 'deep';
}

export const AnswerSchema = z.object({
  skill: z.string().min(1),
  level: z.enum(LEVELS),
  detail: z.string().default(''),
});

export type Answer = z.infer<typeof AnswerSchema>;
