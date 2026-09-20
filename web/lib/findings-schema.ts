import { z } from 'zod';

export const FindingSchema = z.object({
  section: z.enum([
    'summary',
    'skills',
    'experience',
    'education',
    'certifications',
    'document',
  ]),
  severity: z.enum(['critical', 'worth-fixing']),
  finding: z.string().min(1),
});

export type Finding = z.infer<typeof FindingSchema>;

const FENCE = /```json\s*([\s\S]*?)```/;

/**
 * Findings arrive at the end of a streamed prose answer, inside a fenced json block.
 * Anything unparseable yields an empty array — the prose is still useful on its own,
 * and throwing here would blank a review the user already watched arrive.
 */
export function parseFindings(text: string): Finding[] {
  const match = text.match(FENCE);
  if (!match) return [];
  try {
    const raw = JSON.parse(match[1]);
    const parsed = z.array(FindingSchema).safeParse(raw);
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

/** The prose half, with the json block removed, for display. */
export function stripFindings(text: string): string {
  return text.replace(FENCE, '').trim();
}
