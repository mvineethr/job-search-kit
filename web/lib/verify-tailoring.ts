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
  /** How many bullets the rewrite dropped that could not be put back. */
  bulletsDropped: number;
  /** Original bullets the rewrite dropped, put back word for word. Absent on older rows. */
  bulletsRestored?: number;
};

const words = (s: string) => new Set(s.toLowerCase().match(/[a-z0-9%]{3,}/g) ?? []);

function overlap(a: Set<string>, b: Set<string>): number {
  let shared = 0;
  for (const w of a) if (b.has(w)) shared++;
  return shared / Math.max(1, Math.min(a.size, b.size));
}

const lc = (s: string) => s.toLowerCase().trim();

/** Same role even if the rewrite reworded the title: same company and start date. */
function sameRole(a: Resume['experience'][number], b: Resume['experience'][number]): boolean {
  return lc(a.company) === lc(b.company) && (lc(a.title) === lc(b.title) || (a.start !== '' && a.start === b.start));
}

/**
 * Puts back experience the rewrite dropped. The prompt says keep every bullet,
 * and it still drops some. A rewritten bullet cannot be matched to its original
 * exactly, so within each role the originals least like any tailored bullet are
 * taken as the dropped ones, and appended word for word — the person's own text
 * is always safe to restore. A whole missing role goes back in its original place.
 */
export function restoreDroppedBullets(tailored: Resume, original: Resume): { resume: Resume; restored: number } {
  let restored = 0;
  const experience = tailored.experience.map((role) => {
    const source = original.experience.find((o) => sameRole(o, role));
    const missing = source ? source.bullets.length - role.bullets.length : 0;
    if (!source || missing <= 0) return role;
    const rewritten = role.bullets.map(words);
    const dropped = source.bullets
      .map((b, i) => ({ b, i, best: Math.max(0, ...rewritten.map((t) => overlap(words(b), t))) }))
      .sort((x, y) => x.best - y.best)
      .slice(0, missing)
      .sort((x, y) => x.i - y.i)
      .map((x) => x.b);
    restored += dropped.length;
    return { ...role, bullets: [...role.bullets, ...dropped] };
  });

  const present = [...experience];
  original.experience.forEach((o, i) => {
    if (present.some((t) => sameRole(o, t))) return;
    experience.splice(Math.min(i, experience.length), 0, o);
    restored += o.bullets.length;
  });

  return { resume: { ...tailored, experience }, restored };
}

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
  /**
   * Skills the person confirmed they can defend, in answer to a question. These
   * are legitimate even though the written résumé never mentions them — recovering
   * them is exactly why we ask.
   */
  confirmedSkills: string[] = [],
): { cleaned: Resume; audit: TailoringAudit } {
  let bulletsRestored = 0;
  if (original) {
    const r = restoreDroppedBullets(tailored, original);
    tailored = r.resume;
    bulletsRestored = r.restored;
  }
  const source = sourceText(original, originalRaw);
  const confirmed = new Set(confirmedSkills.map((s) => s.toLowerCase().trim()));

  const removedSkills: string[] = [];
  const keptSkills = tailored.skills.filter((skill) => {
    const s = skill.toLowerCase().trim();
    if (!s) return false;
    if (confirmed.has(s)) return true;
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
    audit: { removedSkills, unsupportedNumbers, unsupportedEmployers, bulletsDropped, bulletsRestored },
  };
}
