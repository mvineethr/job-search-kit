import { ResumeSchema, type Resume } from './resume-schema';
import type { TailoringAudit } from './verify-tailoring';

/** Far larger than any real résumé; stops a runaway body before parsing. */
export const MAX_EDIT_BYTES = 200_000;

/**
 * A tailored row stores {note, audit} as JSON in source_text. Rows written before
 * the audit existed hold plain prose, so fall back to treating it as the note.
 */
export function readNote(raw: string | null): { note: string; audit: TailoringAudit | null } {
  if (!raw) return { note: '', audit: null };
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && 'note' in parsed) {
      return { note: String(parsed.note ?? ''), audit: (parsed.audit as TailoringAudit) ?? null };
    }
  } catch {
    // older row: plain text
  }
  return { note: raw, audit: null };
}

export type EditResult = { ok: true; resume: Resume } | { ok: false; message: string };

/** The schema's first complaint, said the way the person would understand it. */
function messageFor(path: PropertyKey[]): string {
  const [top, , field] = path;
  if (top === 'name') return "Name can't be empty.";
  if (top === 'experience' && path.length === 1) return 'Keep at least one role.';
  if (top === 'experience' && field === 'bullets') {
    return path.length === 3 ? 'A role needs at least one bullet.' : "A bullet can't be empty. Delete it instead.";
  }
  if (top === 'experience' && field === 'title') return 'A role needs a title.';
  if (top === 'experience' && field === 'company') return 'A role needs a company.';
  if (top === 'skills') return "A skill can't be empty. Delete it instead.";
  if (top === 'education') return 'Education needs a degree and a school.';
  if (top === 'certifications') return "A certification can't be empty. Delete it instead.";
  return "That change couldn't be saved. Check the field you just edited.";
}

/** Validates an edited résumé from the browser. Trims every string first, so "  " counts as empty. */
export function parseEdit(content: unknown): EditResult {
  const trimmed = JSON.parse(JSON.stringify(content ?? null), (_k, v) => (typeof v === 'string' ? v.trim() : v));
  const parsed = ResumeSchema.safeParse(trimmed);
  if (parsed.success) return { ok: true, resume: parsed.data };
  return { ok: false, message: messageFor(parsed.error.issues[0]?.path ?? []) };
}

/** Every text field, as written (not lowercased). */
function texts(r: Resume): string[] {
  const c = r.contact;
  return [
    r.name,
    r.targetTitle ?? '',
    c.location ?? '',
    c.email ?? '',
    c.phone ?? '',
    c.linkedin ?? '',
    r.summary,
    ...r.skills,
    ...r.experience.flatMap((x) => [x.title, x.company, x.location ?? '', x.start, x.end, ...x.bullets]),
    ...r.education.flatMap((e) => [e.degree, e.school, e.year ?? '']),
    ...(r.certifications ?? []),
  ].filter(Boolean);
}

/** Whole numbers only, as the on-screen flag matches: "40" is not inside "400". */
function hasNumber(text: string, n: string): boolean {
  const escaped = n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![\\d.,])${escaped}(?![\\d])`).test(text);
}

/**
 * The tailoring audit's flagged numbers after a save. Once the person has edited
 * the text a number is in, it is their claim, not the model's, so the flag goes.
 * Edits only remove flags, never add them.
 */
export function clearFlags(before: Resume, after: Resume, flags: string[]): string[] {
  const old = new Set(texts(before));
  const now = texts(after);
  const changed = now.filter((t) => !old.has(t));
  return flags.filter((n) => now.some((t) => hasNumber(t, n)) && !changed.some((t) => hasNumber(t, n)));
}

/** Moves one bullet within a role. Out-of-range moves return the résumé unchanged. */
export function moveBullet(resume: Resume, roleIndex: number, from: number, to: number): Resume {
  const role = resume.experience[roleIndex];
  const n = role?.bullets.length ?? 0;
  if (!role || from === to || from < 0 || to < 0 || from >= n || to >= n) return resume;
  const bullets = [...role.bullets];
  const [moved] = bullets.splice(from, 1);
  bullets.splice(to, 0, moved);
  return { ...resume, experience: resume.experience.map((r, i) => (i === roleIndex ? { ...r, bullets } : r)) };
}

/** True when the master changed after the fit score was verified against it. */
export function isMatchStale(masterUpdatedAt: string | Date, matchCreatedAt: string): boolean {
  const made = Date.parse(matchCreatedAt);
  if (Number.isNaN(made)) return true; // matches stored before created_at existed
  return new Date(masterUpdatedAt).getTime() > made;
}
