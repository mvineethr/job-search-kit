import { z } from 'zod';

/** The literal marker used wherever a real number is missing. Never invent one. */
export const METRIC_NEEDED = '[METRIC NEEDED]';

/**
 * Exact headings required by core/ats-rules.md. The UI must never let a user
 * rename a section — ATS parsers look for these literal strings.
 */
export const SECTION_HEADINGS = [
  'Summary',
  'Skills',
  'Experience',
  'Education',
  'Certifications',
] as const;

/**
 * Strict on what makes a résumé a résumé (a name, roles with bullets), lenient on
 * what real résumés genuinely omit. Many have no summary; some give no dates for a
 * role. Rejecting those made valid résumés fail to parse entirely, which then broke
 * tailoring downstream — so absent-but-legitimate fields default to empty instead.
 */
const RoleSchema = z.object({
  title: z.string().min(1),
  company: z.string().min(1),
  location: z.string().optional(),
  start: z.string().default(''), // "Mar 2022", or empty when the résumé gives none
  end: z.string().default(''), // "Present"
  bullets: z.array(z.string().min(1)).min(1),
});

const EducationSchema = z.object({
  degree: z.string().min(1),
  school: z.string().min(1),
  year: z.string().optional(),
});

export const ResumeSchema = z.object({
  name: z.string().min(1),
  targetTitle: z.string().optional(),
  contact: z.object({
    location: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    linkedin: z.string().optional(),
  }),
  summary: z.string().default(''), // many résumés have none
  skills: z.array(z.string().min(1)).default([]),
  experience: z.array(RoleSchema).min(1),
  education: z.array(EducationSchema).default([]),
  certifications: z.array(z.string().min(1)).optional(),
});

export type Resume = z.infer<typeof ResumeSchema>;
export type Role = z.infer<typeof RoleSchema>;
