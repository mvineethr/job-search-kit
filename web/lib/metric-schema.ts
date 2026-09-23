import { z } from 'zod';
import { METRIC_NEEDED, type Resume } from './resume-schema';

export const MetricQuestionSchema = z.object({
  id: z.string().min(1).max(64),
  roleIndex: z.number().int().min(0),
  bulletIndex: z.number().int().min(0),
  bullet: z.string().min(1),
  question: z.string().min(1),
  hint: z.string().default(''),
});

export const MetricQuestionsSchema = z.array(MetricQuestionSchema).max(20);
export type MetricQuestion = z.infer<typeof MetricQuestionSchema>;

/** Where the unfilled markers are. Used to decide whether to ask at all. */
export function findMarkers(resume: Resume): { roleIndex: number; bulletIndex: number; bullet: string }[] {
  const out: { roleIndex: number; bulletIndex: number; bullet: string }[] = [];
  resume.experience.forEach((role, roleIndex) => {
    role.bullets.forEach((bullet, bulletIndex) => {
      if (bullet.includes(METRIC_NEEDED)) out.push({ roleIndex, bulletIndex, bullet });
    });
  });
  return out;
}

export function countMarkers(resume: Resume): number {
  return findMarkers(resume).length;
}
