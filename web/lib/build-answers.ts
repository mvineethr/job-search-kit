import { z } from 'zod';
import { METRIC_NEEDED, type Resume } from './resume-schema';
import type { TailoringAudit } from './verify-tailoring';

const text = z.string().trim();

/**
 * What the guided builder collects. Flattened by answersToText, that text is the
 * source of truth for the built résumé: the verifier checks the model's output
 * against it, and later tailoring treats it as the original.
 */
export const BuildAnswersSchema = z.object({
  name: text.min(1),
  targetTitle: text.default(''),
  email: text.default(''),
  phone: text.default(''),
  location: text.default(''),
  linkedin: text.default(''),
  roles: z
    .array(
      z.object({
        title: text.min(1),
        company: text.min(1),
        start: text.default(''),
        end: text.default(''),
        did: text.min(10),
      }),
    )
    .min(1),
  education: z
    .array(z.object({ degree: text.min(1), school: text.min(1), year: text.default('') }))
    .default([]),
  skills: text.default(''),
});

export type BuildAnswers = z.infer<typeof BuildAnswersSchema>;
export type BuildAnswersInput = z.input<typeof BuildAnswersSchema>;

export function answersToText(a: BuildAnswers): string {
  const lines = [`Name: ${a.name}`];
  const opt = (label: string, v: string) => {
    if (v) lines.push(`${label}: ${v}`);
  };
  opt('Target title', a.targetTitle);
  opt('Email', a.email);
  opt('Phone', a.phone);
  opt('Location', a.location);
  opt('LinkedIn', a.linkedin);

  for (const r of a.roles) {
    lines.push('', `Role: ${r.title}`, `Company: ${r.company}`);
    const dates = [r.start, r.end].filter(Boolean).join(' – ');
    if (dates) lines.push(`Dates: ${dates}`);
    lines.push(`What I did: ${r.did}`);
  }

  if (a.education.length) lines.push('');
  for (const e of a.education) {
    lines.push(`Education: ${[e.degree, e.school, e.year].filter(Boolean).join(', ')}`);
  }

  if (a.skills) lines.push('', `Skills: ${a.skills}`);
  return lines.join('\n');
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * For a built résumé the answers are the only source, so claims the verifier
 * could not find in them are removed rather than reported: a master shows no
 * audit, and anything left in becomes "the original" for every later tailoring.
 * An unsupported number becomes the [METRIC NEEDED] marker (the metric questions
 * then ask for the real one); an unsupported employer means an invented role,
 * which is dropped. Throws if that leaves no role, so nothing invented is saved.
 */
export function stripUnsupportedClaims(resume: Resume, audit: TailoringAudit): Resume {
  const numbers = audit.unsupportedNumbers.map(
    // Whole tokens only: "40" must not mark the "40" inside "400".
    (n) => new RegExp(`(?<![\\d.,])${escapeRe(n)}(?![\\d%])`, 'g'),
  );
  const mark = (text: string) => numbers.reduce((t, re) => t.replace(re, METRIC_NEEDED), text);
  const invented = new Set(audit.unsupportedEmployers.map((c) => c.toLowerCase().trim()));

  const experience = resume.experience
    .filter((r) => !invented.has(r.company.toLowerCase().trim()))
    .map((r) => ({ ...r, bullets: r.bullets.map(mark) }));
  if (!experience.length) throw new Error('every role in the built résumé names an employer not in the answers');

  return { ...resume, summary: mark(resume.summary), experience };
}
