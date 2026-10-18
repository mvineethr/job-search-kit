import { METRIC_NEEDED, type Resume } from './resume-schema';
import { numbersIn, sourceText } from './verify-tailoring';

export type Fix = { before: string; after: string };

/**
 * The review panel and the editor are siblings on the page; the panel asks the editor
 * to apply fixes through this window event, so the editor's state and save queue stay
 * the only way the résumé changes.
 */
export const APPLY_EVENT = 'resume:apply-fixes';
export type ApplyRequest = { fixes: Fix[]; done: (applied: boolean[]) => void };

/** Asks the editor to apply fixes; all false when no editor is on the page. */
export function requestApply(fixes: Fix[]): boolean[] {
  let applied = fixes.map(() => false);
  const detail: ApplyRequest = { fixes, done: (r) => (applied = r) };
  window.dispatchEvent(new CustomEvent(APPLY_EVENT, { detail })); // listeners run synchronously
  return applied;
}

/** Applies fixes in order; each one sees the résumé the previous ones left. */
export function applyFixes(resume: Resume, fixes: Fix[]): { resume: Resume; applied: boolean[] } {
  const applied = fixes.map((f) => {
    const next = applyFix(resume, f);
    if (next) resume = next;
    return Boolean(next);
  });
  return { resume, applied };
}

/** The lines a review fix may replace, in document order: summary, skills, bullets, certifications. */
function lines(r: Resume): string[] {
  return [r.summary, ...r.skills, ...r.experience.flatMap((role) => role.bullets), ...(r.certifications ?? [])];
}

function withLines(r: Resume, xs: string[]): Resume {
  let i = 0;
  const next = () => xs[i++];
  const summary = next();
  const skills = r.skills.map(next);
  const experience = r.experience.map((role) => ({ ...role, bullets: role.bullets.map(next) }));
  const certifications = r.certifications?.map(next);
  return { ...r, summary, skills, experience, ...(certifications ? { certifications } : {}) };
}

/**
 * Replaces `before` with `after`: a whole line that matches exactly, or else the one line
 * that contains it. Null when it is in no line, or in more than one, so nothing is guessed.
 */
export function applyFix(resume: Resume, { before, after }: Fix): Resume | null {
  const b = before.trim();
  const xs = lines(resume);
  const whole = xs.findIndex((x) => x.trim() === b);
  if (whole >= 0) return withLines(resume, xs.map((x, i) => (i === whole ? after.trim() : x)));
  const hits = xs.flatMap((x, i) => (x.includes(b) ? [i] : []));
  if (hits.length !== 1) return null;
  return withLines(resume, xs.map((x, i) => (i === hits[0] ? x.replace(b, after.trim()) : x)));
}

/**
 * Words the rewrite introduced that look like names: capitalised, mid-sentence, and
 * not in `source` (lowercased) — a tool, client or employer the line never claimed.
 * shortcut: a lowercase invented tool ("kubernetes") passes; upgrade to a word list if one shows up.
 */
export function newNames(source: string, after: string): string[] {
  const text = after.replaceAll(METRIC_NEEDED, ' ');
  const found: string[] = [];
  // "/" splits, so "Python/Django" is checked as two names the résumé already has.
  for (const m of text.matchAll(/[A-Za-z][\w+#.-]*/g)) {
    const word = m[0].replace(/[./-]+$/, '');
    const sentenceStart = /^\s*$|[.:;!?]\s*$/.test(text.slice(0, m.index));
    if (!/[A-Z]/.test(word) || (sentenceStart && !/[A-Z]/.test(word.slice(1)))) continue;
    const lower = word.toLowerCase();
    if (!source.includes(lower) && !source.includes(lower.replace(/'?s$/, ''))) found.push(word); // "APIs" for "API"
  }
  return found;
}

/** Outcome claims. A bullet that never said what improved must not gain one ("cutting deploy time"). */
const OUTCOMES = /\b(reduc|cut|improv|increas|decreas|sav|eliminat|boost|grow|grew|lower|rais|accelerat|speed|sped|doubl|tripl|generat|driv|drove|convert|captur)\w*/gi;
// Grouped by direction, so "Reduced load time 35%" may become "Cut load time 35%".
const FAMILY: Record<string, string> = {
  reduc: 'down', cut: 'down', decreas: 'down', lower: 'down', eliminat: 'down', sav: 'down',
  increas: 'up', boost: 'up', grow: 'up', grew: 'up', rais: 'up', doubl: 'up', tripl: 'up',
  accelerat: 'faster', speed: 'faster', sped: 'faster',
  generat: 'produced', driv: 'produced', drove: 'produced', convert: 'produced', captur: 'produced',
};
const outcomesIn = (s: string) => new Set([...s.matchAll(OUTCOMES)].map((m) => FAMILY[m[1].toLowerCase()] ?? m[1].toLowerCase()));

/**
 * Holes a person cannot fill with one number: more than two in a line, two in a row
 * ("reducing [METRIC NEEDED] by [METRIC NEEDED]"), a unit ("per [METRIC NEEDED]"), or a
 * trailing one that measures nothing ("…to Docker, [METRIC NEEDED].").
 */
const HOLE = String.raw`\[METRIC NEEDED\]`;
const BAD_HOLE = new RegExp(String.raw`${HOLE}\s*(?:by\s*)?${HOLE}|\bper ${HOLE}|,\s*${HOLE}\s*\.?\s*$`, 'i');
export function badHoles(after: string): boolean {
  return after.split(METRIC_NEEDED).length - 1 > 2 || BAD_HOLE.test(after);
}

const MONTHS = 'janfebmaraprmayjunjulaugsepoctnovdec';

/** "Mar 2021" → months since year 0. A bare year counts as December, so the span is never overstated. */
function monthOf(date: string): number | null {
  const m = date.match(/(?:([a-z]{3})[a-z]*\.?\s+)?(\d{4})/i);
  if (!m) return null;
  const month = m[1] ? MONTHS.indexOf(m[1].toLowerCase()) / 3 : 11;
  return Number(m[2]) * 12 + (Number.isInteger(month) && month >= 0 ? month : 11);
}

/** Whole years from the earliest role start to today; null when no start date can be read. */
export function careerYears(resume: Resume, today: Date): number | null {
  const starts = resume.experience.map((r) => monthOf(r.start)).filter((n): n is number => n !== null);
  if (starts.length === 0) return null;
  return Math.floor((today.getUTCFullYear() * 12 + today.getUTCMonth() - Math.min(...starts)) / 12);
}

/**
 * A fix is offered only when it can be applied and adds nothing its line does not
 * support: every number, name and outcome in `after` is already in `before`, and every
 * hole is one number. The summary sums up the whole résumé, so it may draw on all of it,
 * and may claim "N years" when the role dates span at least N. A bullet may use its own
 * role's employer and title; anything else from elsewhere ("Docker on AWS", another
 * bullet's number) claims a skill or result for work it never touched.
 */
export function checkFix(resume: Resume, fix: Fix, today = new Date()): boolean {
  if (fix.before.trim() === fix.after.trim()) return false;
  if (badHoles(fix.after)) return false;
  const next = applyFix(resume, fix);
  if (!next) return false;
  const isSummary = next.summary !== resume.summary;
  const role = resume.experience.find((r, i) => r.bullets.join('\n') !== next.experience[i].bullets.join('\n'));
  const source = isSummary
    ? sourceText(resume)
    : [fix.before, role?.company ?? '', role?.title ?? ''].join(' \n ').toLowerCase();

  let after = fix.after.replaceAll(METRIC_NEEDED, ' ');
  if (isSummary) {
    const span = careerYears(resume, today);
    after = after.replace(/\b(\d+)\+?\s*(?:years|yrs)\b/gi, (m, n) => (span !== null && Number(n) <= span ? 'years' : m));
  }
  const had = new Set(numbersIn(source));
  if (numbersIn(after).some((n) => !had.has(n))) return false;
  const claimed = outcomesIn(source);
  if ([...outcomesIn(fix.after)].some((o) => !claimed.has(o))) return false;
  return newNames(source, fix.after).length === 0;
}
