import type { Resume } from './resume-schema';

/**
 * Checks a tailored résumé against the original it came from.
 *
 * "Never fabricate" is an instruction to a model, and instructions drift. Measured
 * on a real résumé, tailoring added eight skills the source never mentioned —
 * CloudFormation, Azure DevOps and ServiceNow among them, lifted straight from the
 * posting. Numbers and employers were clean, but skills were being stuffed.
 *
 * So the rule is enforced here instead: anything the source does not support is
 * removed, and the person is told what was removed and why.
 */

export type TailoringAudit = {
  /** Skills removed because the source résumé does not mention them. */
  removedSkills: string[];
  /** Numbers in the tailored copy that appear nowhere in the source. */
  unsupportedNumbers: string[];
  /** Employers in the tailored copy that are not in the source. */
  unsupportedEmployers: string[];
  /** How many bullets the rewrite dropped. */
  bulletsDropped: number;
};

/** Every piece of text in a résumé, lowercased, for substring checks. */
export function sourceText(resume: Resume | null, rawText?: string | null): string {
  const parts: string[] = [];
  if (resume) {
    parts.push(resume.summary, ...resume.skills);
    for (const role of resume.experience) {
      parts.push(role.title, role.company, role.location ?? '', ...role.bullets);
    }
    for (const e of resume.education) parts.push(e.degree, e.school, e.year ?? '');
    parts.push(...(resume.certifications ?? []));
  }
  if (rawText) parts.push(rawText);
  return parts.join(' \n ').toLowerCase();
}

function countBullets(resume: Resume): number {
  return resume.experience.reduce((n, r) => n + r.bullets.length, 0);
}

/** Numbers and percentages, e.g. "34", "41%", "1,200". */
export function numbersIn(text: string): string[] {
  return [...text.matchAll(/\b\d[\d,.]*\s?%?/g)].map((m) => m[0].trim());
}

/**
 * Returns the tailored résumé with unsupported skills stripped, plus an audit of
 * what was wrong with it. Numbers and employers are reported but not edited —
 * silently rewriting a bullet would hide the problem rather than surface it.
 */
export function verifyTailoring(
  tailored: Resume,
  original: Resume | null,
  originalRaw?: string | null,
): { cleaned: Resume; audit: TailoringAudit } {
  const source = sourceText(original, originalRaw);

  const removedSkills: string[] = [];
  const keptSkills = tailored.skills.filter((skill) => {
    const s = skill.toLowerCase().trim();
    if (!s) return false;
    if (source.includes(s)) return true;
    removedSkills.push(skill);
    return false;
  });

  const tailoredText = sourceText(tailored);
  const unsupportedNumbers = [...new Set(numbersIn(tailoredText))].filter(
    (n) => !source.includes(n.toLowerCase()),
  );

  const originalCompanies = new Set(
    (original?.experience ?? []).map((r) => r.company.toLowerCase().trim()),
  );
  const unsupportedEmployers = tailored.experience
    .map((r) => r.company)
    .filter((c) => {
      const lc = c.toLowerCase().trim();
      return !originalCompanies.has(lc) && !source.includes(lc);
    });

  const bulletsDropped = original ? Math.max(0, countBullets(original) - countBullets(tailored)) : 0;

  return {
    cleaned: { ...tailored, skills: keptSkills },
    audit: { removedSkills, unsupportedNumbers, unsupportedEmployers, bulletsDropped },
  };
}
