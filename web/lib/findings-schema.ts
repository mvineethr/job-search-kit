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
 * A fence that has opened but not yet closed. Mid-stream the closing ``` has not
 * arrived, so FENCE does not match and the raw JSON would otherwise be displayed
 * to the user as it arrives.
 */
const OPEN_FENCE = /```json[\s\S]*$/;

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

/**
 * The prose half, for display. Removes a completed findings block, and also any
 * fence still being streamed — otherwise the user watches raw JSON scroll past.
 */
export function stripFindings(text: string): string {
  return text.replace(FENCE, '').replace(OPEN_FENCE, '').trim();
}
