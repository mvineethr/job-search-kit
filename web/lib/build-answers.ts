import { z } from 'zod';

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
