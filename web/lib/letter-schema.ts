import { z } from 'zod';

export const LetterSchema = z.object({
  greeting: z.string().min(1),
  paragraphs: z.array(z.string().min(1)).min(2),
  signoff: z.string().default('Sincerely,'),
  name: z.string().min(1),
  /** Every fact the letter relies on, so the person can check each one traces to their résumé. */
  facts: z.array(z.string()).default([]),
  /** Requirements the letter declined to claim because the résumé does not support them. */
  gaps: z.array(z.string()).default([]),
});

export type Letter = z.infer<typeof LetterSchema>;

export function wordCount(letter: Letter): number {
  return letter.paragraphs.join(' ').split(/\s+/).filter(Boolean).length;
}
