# Inline Résumé Editing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let people edit masters and tailored résumés in place on `/resume/[id]`, with saves on blur, flags that clear once the person has edited them, and a stale-score note on jobs after a master edit.

**Architecture:** Pure logic in `web/lib/resume-edit.ts` (validation messages, flag clearing, bullet moves, staleness, `readNote`). A `PUT /api/resumes/[id]` route validates the whole résumé with `ResumeSchema` and saves it. A client component `EditableResume` renders the same markup and `DOCUMENT_CSS` as today's read-only document, with `EditableText` fields and edit controls hidden in print.

**Tech Stack:** Next.js 16 App Router, React 19, Zod 4, Neon via `sql()` tagged templates, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-16-inline-editing-design.md`

## Global Constraints

- Every query filters by `sid` (`WHERE id = ${id} AND sid = ${sid}`).
- Masters are never deleted; this plan adds no delete path.
- A master's `source_text` (the original upload) is never modified by editing.
- No tool calling, no model calls in this feature (the Re-check button reuses the existing `op=match`).
- Section headings are not editable (`SECTION_HEADINGS`).
- Copy: no exclamation marks, no emoji, no "AI-powered", no outcome claims.
- Design tokens only from `web/app/globals.css`; spacing 4/8/12/16/24/32/48/64.
- Many repo files are CRLF: use exact-match edits, never scripted `\n` replacement.
- Never use real credentials in browser tests: `web-localtest` server (port 3001) and `@example.com` accounts only.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Changes from the spec, decided while planning

- **One save-status line above the document**, not one per field. It names the problem ("A bullet can't be empty. Delete it instead.") and has a Retry button. Same information, far less state.
- **The route's sid / 404 / size checks are verified with `curl.exe` in Task 6**, not Vitest: the suite has no database mocking, and adding it for one route isn't worth it. Validation itself (`parseEdit`) is unit-tested.
- **`ResumeDocument.tsx` is deleted.** Its only user is the résumé page, which now renders `EditableResume`. `Flagged` and the `[METRIC NEEDED]` marking move to `components/MarkedText.tsx`.
- **Enter commits every field** (newlines are collapsed to spaces): résumé fields never need line breaks. Textareas are used only so long bullets wrap.
- **New roles go at the end of Experience** (the spec has no role reordering).

## File map

| File | Change |
|---|---|
| `web/lib/resume-edit.ts` | create: `MAX_EDIT_BYTES`, `readNote`, `parseEdit`, `clearFlags`, `moveBullet`, `isMatchStale` |
| `web/test/resume-edit.test.ts` | create |
| `web/app/api/resumes/[id]/route.ts` | add `PUT` |
| `web/app/resume/[id]/page.tsx` | import `readNote` from lib; render `EditableResume` |
| `web/components/MarkedText.tsx` | create (moved from `ResumeDocument.tsx`) |
| `web/components/EditableText.tsx` | create |
| `web/components/EditableResume.tsx` | create |
| `web/components/ResumeDocument.tsx` | delete |
| `web/app/globals.css` | add inline-editing styles |
| `web/app/jobs/[id]/page.tsx` | stale-score note |
| `CLAUDE.md`, spec | update in Task 6 |

---

### Task 1: Pure editing logic

**Files:**
- Create: `web/lib/resume-edit.ts`
- Create: `web/test/resume-edit.test.ts`
- Modify: `web/app/resume/[id]/page.tsx` (remove local `readNote`, import it)

**Interfaces:**
- Produces:
  - `MAX_EDIT_BYTES: number` (200_000)
  - `readNote(raw: string | null): { note: string; audit: TailoringAudit | null }`
  - `type EditResult = { ok: true; resume: Resume } | { ok: false; message: string }`
  - `parseEdit(content: unknown): EditResult`
  - `clearFlags(before: Resume, after: Resume, flags: string[]): string[]`
  - `moveBullet(resume: Resume, roleIndex: number, from: number, to: number): Resume`
  - `isMatchStale(masterUpdatedAt: string | Date, matchCreatedAt: string): boolean`

- [ ] **Step 0: Install dependencies in this worktree**

Run: `cd web && npm install`
Expected: completes; `npm test` then runs the existing 117 tests green.

- [ ] **Step 1: Write the failing tests**

Create `web/test/resume-edit.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { ResumeSchema, type Resume } from '@/lib/resume-schema';
import { parseEdit, clearFlags, moveBullet, isMatchStale, readNote } from '@/lib/resume-edit';

const base: Resume = ResumeSchema.parse({
  name: 'Sam Rivera',
  contact: { email: 'sam@example.com' },
  summary: 'Platform engineer.',
  skills: ['Kubernetes', 'Go'],
  experience: [
    {
      title: 'Senior Engineer',
      company: 'Acme',
      start: 'Mar 2021',
      end: 'Present',
      bullets: ['Cut deploy time by 40%', 'Ran on-call for 12 services', 'Wrote the runbook'],
    },
    { title: 'Engineer', company: 'Globex', start: '2018', end: '2021', bullets: ['Built the billing API'] },
  ],
  education: [{ degree: 'BSc Computer Science', school: 'State University' }],
});

const withBullets = (bullets: string[]): Resume => ({
  ...base,
  experience: [{ ...base.experience[0], bullets }, base.experience[1]],
});

describe('parseEdit', () => {
  it('accepts a valid résumé and trims every string', () => {
    const r = parseEdit({ ...base, name: '  Sam Rivera ' });
    expect(r.ok && r.resume.name).toBe('Sam Rivera');
  });

  it('drops keys the schema does not know', () => {
    const r = parseEdit({ ...base, evil: 'x' });
    expect(r.ok).toBe(true);
    expect(r.ok && 'evil' in r.resume).toBe(false);
  });

  it('names an empty name', () => {
    expect(parseEdit({ ...base, name: '   ' })).toEqual({ ok: false, message: "Name can't be empty." });
  });

  it('names an emptied bullet, and says to delete it instead', () => {
    expect(parseEdit(withBullets(['  ', 'x']))).toEqual({
      ok: false,
      message: "A bullet can't be empty. Delete it instead.",
    });
  });

  it('names a role with no bullets', () => {
    expect(parseEdit(withBullets([]))).toEqual({ ok: false, message: 'A role needs at least one bullet.' });
  });

  it('names a résumé with no roles', () => {
    expect(parseEdit({ ...base, experience: [] })).toEqual({ ok: false, message: 'Keep at least one role.' });
  });

  it('names an empty skill', () => {
    expect(parseEdit({ ...base, skills: ['Go', ''] })).toEqual({
      ok: false,
      message: "A skill can't be empty. Delete it instead.",
    });
  });

  it('gives a general message for anything else, including no content', () => {
    expect(parseEdit(undefined)).toEqual({
      ok: false,
      message: "That change couldn't be saved. Check the field you just edited.",
    });
  });
});

describe('clearFlags', () => {
  const flags = ['40%', '12'];

  it('clears a number once the person has edited the text it is in', () => {
    const after = withBullets(['Cut deploy time by 40% across 3 teams', 'Ran on-call for 12 services', 'Wrote the runbook']);
    expect(clearFlags(base, after, flags)).toEqual(['12']);
  });

  it('clears a number that is no longer anywhere in the document', () => {
    const after = withBullets(['Cut deploy time', 'Ran on-call for 12 services', 'Wrote the runbook']);
    expect(clearFlags(base, after, flags)).toEqual(['12']);
  });

  it('keeps flags when nothing they are in was edited, e.g. a reorder', () => {
    expect(clearFlags(base, moveBullet(base, 0, 0, 2), flags)).toEqual(flags);
  });

  it('never adds a flag for a number the person typed', () => {
    const after = withBullets([...base.experience[0].bullets, 'Saved 99 hours a month']);
    expect(clearFlags(base, after, [])).toEqual([]);
  });

  it('matches whole numbers only: "4" is not kept alive by "40%"', () => {
    expect(clearFlags(base, base, ['4'])).toEqual([]);
  });
});

describe('moveBullet', () => {
  it('moves a bullet down and up within its role', () => {
    expect(moveBullet(base, 0, 0, 1).experience[0].bullets).toEqual([
      'Ran on-call for 12 services',
      'Cut deploy time by 40%',
      'Wrote the runbook',
    ]);
    expect(moveBullet(base, 0, 2, 1).experience[0].bullets[1]).toBe('Wrote the runbook');
  });

  it('leaves other roles alone', () => {
    expect(moveBullet(base, 0, 0, 1).experience[1]).toBe(base.experience[1]);
  });

  it('returns the same résumé for out-of-range moves', () => {
    expect(moveBullet(base, 0, 0, -1)).toBe(base);
    expect(moveBullet(base, 0, 2, 3)).toBe(base);
    expect(moveBullet(base, 5, 0, 1)).toBe(base);
  });
});

describe('isMatchStale', () => {
  it('is stale when the master changed after the score', () => {
    expect(isMatchStale('2026-10-16T12:00:00Z', '2026-10-16T11:00:00Z')).toBe(true);
  });

  it('is fresh when the score is newer', () => {
    expect(isMatchStale(new Date('2026-10-16T10:00:00Z'), '2026-10-16T11:00:00Z')).toBe(false);
  });

  it('treats matches stored before created_at existed as stale', () => {
    expect(isMatchStale('2026-10-16T10:00:00Z', '')).toBe(true);
  });
});

describe('readNote', () => {
  it('reads {note, audit} JSON', () => {
    const audit = { removedSkills: [], unsupportedNumbers: ['3'], unsupportedEmployers: [], bulletsDropped: 0, bulletsRestored: 0 };
    expect(readNote(JSON.stringify({ note: 'n', audit }))).toEqual({ note: 'n', audit });
  });

  it('treats older plain-text rows as the note', () => {
    expect(readNote('plain words')).toEqual({ note: 'plain words', audit: null });
    expect(readNote(null)).toEqual({ note: '', audit: null });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd web && npx vitest run test/resume-edit.test.ts`
Expected: FAIL, cannot resolve `@/lib/resume-edit`.

- [ ] **Step 3: Implement `web/lib/resume-edit.ts`**

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd web && npx vitest run test/resume-edit.test.ts`
Expected: PASS, all tests in the file.

- [ ] **Step 5: Use the moved `readNote` on the résumé page**

In `web/app/resume/[id]/page.tsx`, delete the local `readNote` function and its doc comment (the block starting `/**\n * A tailored row stores {note, audit}` through the closing `}` before `export const dynamic`). Replace the import line

```ts
import type { TailoringAudit } from '@/lib/verify-tailoring';
```

with

```ts
import { readNote } from '@/lib/resume-edit';
```

Run: `cd web && npx tsc --noEmit -p . && npm test`
Expected: no type errors; all tests pass (117 + the new file).

- [ ] **Step 6: Commit**

```bash
git add web/lib/resume-edit.ts web/test/resume-edit.test.ts "web/app/resume/[id]/page.tsx"
git commit -m "feat(web): editing logic — validation messages, flag clearing, bullet moves, stale scores

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: `PUT /api/resumes/[id]`

**Files:**
- Modify: `web/app/api/resumes/[id]/route.ts` (add a second export beside `POST`)

**Interfaces:**
- Consumes: `MAX_EDIT_BYTES`, `parseEdit`, `clearFlags`, `readNote` from Task 1; `ResumeSchema`.
- Produces: `PUT /api/resumes/[id]`, body `{ content: Resume }`. Responses (JSON):
  - 200 `{ ok: true, updatedAt: string, unsupportedNumbers: string[] }`
  - 400 / 401 / 404 / 413 `{ error: string }`

- [ ] **Step 1: Add the route**

Replace the import block at the top of `web/app/api/resumes/[id]/route.ts`:

```ts
import { requireSid } from '@/lib/auth';
import { ensureSchema, sql } from '@/lib/db';
import { redirectTo } from '@/lib/redirect';
```

with

```ts
import { requireSid } from '@/lib/auth';
import { ensureSchema, sql } from '@/lib/db';
import { redirectTo } from '@/lib/redirect';
import { ResumeSchema } from '@/lib/resume-schema';
import { MAX_EDIT_BYTES, clearFlags, parseEdit, readNote } from '@/lib/resume-edit';
```

Append to the end of the file:

```ts
/**
 * Saves an edited résumé (master or tailored copy). A fetch from the editor, not a
 * browser form, so it answers in JSON. On a tailored copy, flagged numbers the
 * person has edited are cleared from the audit; a master's original upload text
 * is never touched.
 */
export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  let sid: string;
  try {
    sid = await requireSid();
  } catch {
    return Response.json({ error: 'Sign in again to save.' }, { status: 401 });
  }

  const raw = await req.text();
  if (raw.length > MAX_EDIT_BYTES) {
    return Response.json({ error: 'That résumé is too long to save.' }, { status: 413 });
  }
  let body: { content?: unknown };
  try {
    body = JSON.parse(raw);
  } catch {
    return Response.json({ error: "That change couldn't be saved. Check the field you just edited." }, { status: 400 });
  }
  const edit = parseEdit(body?.content);
  if (!edit.ok) return Response.json({ error: edit.message }, { status: 400 });

  const { id } = await ctx.params;
  await ensureSchema();
  const q = sql();
  const row = ((await q`
    SELECT content, source_text, parent_id FROM resumes WHERE id = ${id} AND sid = ${sid}`) as unknown as {
    content: unknown;
    source_text: string | null;
    parent_id: string | null;
  }[])[0];
  if (!row) return Response.json({ error: 'Résumé not found.' }, { status: 404 });

  let sourceText = row.source_text;
  let flags: string[] = [];
  if (row.parent_id) {
    const { note, audit } = readNote(row.source_text);
    if (audit) {
      const before = ResumeSchema.safeParse(row.content);
      flags = before.success ? clearFlags(before.data, edit.resume, audit.unsupportedNumbers) : audit.unsupportedNumbers;
      sourceText = JSON.stringify({ note, audit: { ...audit, unsupportedNumbers: flags } });
    }
  }

  const saved = (await q`
    UPDATE resumes SET content = ${JSON.stringify(edit.resume)}, source_text = ${sourceText}, updated_at = now()
    WHERE id = ${id} AND sid = ${sid}
    RETURNING updated_at`) as unknown as { updated_at: string | Date }[];

  return Response.json({ ok: true, updatedAt: new Date(saved[0].updated_at).toISOString(), unsupportedNumbers: flags });
}
```

- [ ] **Step 2: Type-check and run the suite**

Run: `cd web && npx tsc --noEmit -p . && npm test`
Expected: no type errors; all tests pass. (The route's behaviour against the database is checked with `curl.exe` in Task 6.)

- [ ] **Step 3: Commit**

```bash
git add "web/app/api/resumes/[id]/route.ts"
git commit -m "feat(web): PUT /api/resumes/[id] saves an edited résumé

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: `MarkedText` and `EditableText`, plus styles

**Files:**
- Create: `web/components/MarkedText.tsx`
- Create: `web/components/EditableText.tsx`
- Modify: `web/app/globals.css` (append a section)

**Interfaces:**
- Produces:
  - `MarkedText({ text: string; numbers: string[] })`: draws `[METRIC NEEDED]` markers and flagged numbers (moved verbatim from `ResumeDocument.tsx`'s `Flagged` + `Bullet` body).
  - `EditableText(props: { value: string; label: string; onCommit: (v: string) => void; onCancel?: () => void; multiline?: boolean; placeholder?: string; render?: (v: string) => ReactNode; startEditing?: boolean })` (default export).
  - CSS classes: `editable`, `edit-field`, `edit-placeholder`, `edit-ctl`, `edit-status`, `edit-form`, `edit-form-row`, `edit-only` (hidden in print).

- [ ] **Step 1: Create `web/components/MarkedText.tsx`**

```tsx
import { METRIC_NEEDED } from '@/lib/resume-schema';

/**
 * Marks numbers the audit could not find in the original, where they sit, so they
 * cannot be missed in a side panel. Whole numbers only: flagging "40" must not
 * mark the "40" inside "400".
 */
function Flagged({ text, numbers }: { text: string; numbers: string[] }) {
  if (numbers.length === 0) return <>{text}</>;
  const escaped = numbers.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const re = new RegExp(`(?<![\\d.,])(${escaped.join('|')})(?![\\d])`, 'g');
  return (
    <>
      {text.split(re).map((part, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="unsupported-number" title="Not in your original résumé. Check it before sending.">
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  );
}

/** Text with [METRIC NEEDED] markers and flagged numbers drawn in. */
export default function MarkedText({ text, numbers }: { text: string; numbers: string[] }) {
  const parts = text.split(METRIC_NEEDED);
  return (
    <>
      {parts.map((part, i) => (
        <span key={i}>
          <Flagged text={part} numbers={numbers} />
          {i < parts.length - 1 && <span className="metric-needed">{METRIC_NEEDED}</span>}
        </span>
      ))}
    </>
  );
}
```

- [ ] **Step 2: Create `web/components/EditableText.tsx`**

```tsx
'use client';

import { useRef, useState, type ChangeEvent, type KeyboardEvent, type ReactNode } from 'react';

/**
 * Text that becomes an input in the same spot when clicked. Enter or clicking away
 * commits; Escape restores the saved text. Line breaks are collapsed: no résumé
 * field needs one, and textareas are only there so long bullets wrap.
 */
export default function EditableText({
  value,
  label,
  onCommit,
  onCancel,
  multiline = false,
  placeholder = '',
  render,
  startEditing = false,
}: {
  value: string;
  label: string;
  onCommit: (v: string) => void;
  onCancel?: () => void;
  multiline?: boolean;
  placeholder?: string;
  render?: (v: string) => ReactNode;
  startEditing?: boolean;
}) {
  const [editing, setEditing] = useState(startEditing);
  const [draft, setDraft] = useState(value);
  const cancelled = useRef(false);

  if (!editing) {
    const start = () => {
      setDraft(value);
      setEditing(true);
    };
    return (
      <span
        className="editable"
        role="button"
        tabIndex={0}
        title={`Edit ${label}`}
        onClick={start}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            start();
          }
        }}
      >
        {value ? (render ? render(value) : value) : <span className="edit-placeholder edit-only">{placeholder}</span>}
      </span>
    );
  }

  const finish = () => {
    setEditing(false);
    if (cancelled.current) {
      cancelled.current = false;
      onCancel?.();
      return;
    }
    const v = draft.replace(/\s+/g, ' ').trim();
    if (v !== value) onCommit(v);
    else onCancel?.();
  };

  const props = {
    autoFocus: true,
    'aria-label': label,
    className: 'edit-field',
    value: draft,
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft(e.target.value),
    onBlur: finish,
    onKeyDown: (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        cancelled.current = true;
        e.currentTarget.blur();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        e.currentTarget.blur();
      }
    },
  };
  return multiline ? <textarea {...props} rows={Math.max(2, Math.ceil(draft.length / 80))} /> : <input {...props} />;
}
```

- [ ] **Step 3: Append styles to `web/app/globals.css`**

Append at the end of the file (exact text, keeping the file's existing line endings):

```css

/* ============ inline résumé editing ============ */
.editable{cursor:text; border-radius:2px}
.editable:hover, .editable:focus-visible{outline:1px dashed var(--accent); outline-offset:2px}
.edit-field{font:inherit; color:inherit; background:var(--doc-bg); border:1px solid var(--accent); border-radius:4px; padding:var(--s-1) var(--s-2); width:100%; resize:vertical}
input.edit-field{width:auto; min-width:12ch}
.edit-placeholder{color:var(--text-faint); font-style:italic}
.edit-ctl{font:inherit; font-size:var(--text-xs); color:var(--text-muted); background:none; border:1px solid var(--border); border-radius:4px; padding:0 var(--s-1); margin-left:var(--s-1); cursor:pointer}
.edit-ctl:disabled{opacity:.4; cursor:default}
.edit-status{font-size:var(--text-sm); color:var(--text-muted); margin:0 0 var(--s-2)}
.edit-form{display:grid; gap:var(--s-2); margin-top:var(--s-3); max-width:420px}
.edit-form-row{display:grid; gap:var(--s-1); font-size:var(--text-sm)}
@media print{
  .edit-only{display:none!important}
  .editable{outline:none!important}
}
```

- [ ] **Step 4: Type-check**

Run: `cd web && npx tsc --noEmit -p .`
Expected: no errors. (`ResumeDocument.tsx` still exists and is still used; it is removed in Task 4.)

- [ ] **Step 5: Commit**

```bash
git add web/components/MarkedText.tsx web/components/EditableText.tsx web/app/globals.css
git commit -m "feat(web): editable text field and shared number/marker highlighting

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: `EditableResume` on the résumé page

**Files:**
- Create: `web/components/EditableResume.tsx`
- Modify: `web/app/resume/[id]/page.tsx`
- Delete: `web/components/ResumeDocument.tsx`

**Interfaces:**
- Consumes: `moveBullet` (Task 1); `PUT /api/resumes/[id]` (Task 2); `MarkedText`, `EditableText`, CSS classes (Task 3); `DOCUMENT_CSS` from `@/styles/document`.
- Produces: `EditableResume({ id: string; initial: Resume; flags: string[] })` (default export).

- [ ] **Step 1: Create `web/components/EditableResume.tsx`**

```tsx
'use client';

import { useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { Resume, Role } from '@/lib/resume-schema';
import { moveBullet } from '@/lib/resume-edit';
import { DOCUMENT_CSS } from '@/styles/document';
import EditableText from './EditableText';
import MarkedText from './MarkedText';

type Education = Resume['education'][number];
type Status = { kind: 'idle' } | { kind: 'saving' } | { kind: 'saved' } | { kind: 'error'; message: string };

const replaceAt = <T,>(xs: T[], i: number, v: T) => xs.map((x, j) => (j === i ? v : x));
const removeAt = <T,>(xs: T[], i: number) => xs.filter((_, j) => j !== i);
const confirmRemove = (what: string) => window.confirm(`Delete this ${what}?`);

/** A small edit control. Hidden in print, so the PDF matches the export. */
function Ctl({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button type="button" className="edit-ctl edit-only" aria-label={label} title={label} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

/** "+ Add …" that becomes an empty field; an empty commit adds nothing. */
function AddText({ label, multiline, onAdd }: { label: string; multiline?: boolean; onAdd: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  if (!open) return <Ctl label={label} onClick={() => setOpen(true)}>+ {label}</Ctl>;
  return (
    <EditableText
      value=""
      label={label}
      multiline={multiline}
      startEditing
      onCommit={(v) => {
        setOpen(false);
        if (v) onAdd(v);
      }}
      onCancel={() => setOpen(false)}
    />
  );
}

/**
 * A role needs a title, a company and a bullet before it is valid, so it is added
 * through a small form rather than with placeholder text that could be saved.
 */
function AddRole({ onAdd }: { onAdd: (r: Role) => void }) {
  const empty = { title: '', company: '', start: '', end: '', bullet: '' };
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(empty);
  if (!open) return <Ctl label="Add a role" onClick={() => setOpen(true)}>+ Add a role</Ctl>;
  const ready = Boolean(f.title.trim() && f.company.trim() && f.bullet.trim());
  const field = (k: keyof typeof empty, label: string) => (
    <label className="edit-form-row">
      {label}
      <input className="edit-field" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
    </label>
  );
  return (
    <div className="edit-form edit-only">
      {field('title', 'Title')}
      {field('company', 'Company')}
      {field('start', 'Start')}
      {field('end', 'End')}
      {field('bullet', 'First bullet')}
      <div>
        <button
          type="button"
          className="edit-ctl"
          disabled={!ready}
          onClick={() => {
            onAdd({ title: f.title.trim(), company: f.company.trim(), start: f.start.trim(), end: f.end.trim(), bullets: [f.bullet.trim()] });
            setF(empty);
            setOpen(false);
          }}
        >
          Add role
        </button>
        <button type="button" className="edit-ctl" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function AddEducation({ onAdd }: { onAdd: (e: Education) => void }) {
  const empty = { degree: '', school: '', year: '' };
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(empty);
  if (!open) return <Ctl label="Add education" onClick={() => setOpen(true)}>+ Add education</Ctl>;
  const ready = Boolean(f.degree.trim() && f.school.trim());
  const field = (k: keyof typeof empty, label: string) => (
    <label className="edit-form-row">
      {label}
      <input className="edit-field" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
    </label>
  );
  return (
    <div className="edit-form edit-only">
      {field('degree', 'Degree')}
      {field('school', 'School')}
      {field('year', 'Year')}
      <div>
        <button
          type="button"
          className="edit-ctl"
          disabled={!ready}
          onClick={() => {
            onAdd({ degree: f.degree.trim(), school: f.school.trim(), ...(f.year.trim() ? { year: f.year.trim() } : {}) });
            setF(empty);
            setOpen(false);
          }}
        >
          Add education
        </button>
        <button type="button" className="edit-ctl" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </div>
  );
}

/**
 * The résumé as it prints, editable in place. Shares DOCUMENT_CSS with the export
 * renderer so what is on screen is what prints. Every change sends the whole
 * résumé; the server validates it. Saves run one at a time, and only the latest
 * waiting one is sent.
 */
export default function EditableResume({ id, initial, flags: initialFlags }: { id: string; initial: Resume; flags: string[] }) {
  const router = useRouter();
  const [resume, setResume] = useState(initial);
  const [flags, setFlags] = useState(initialFlags);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const inFlight = useRef(false);
  const queued = useRef<Resume | null>(null);

  async function save(next: Resume) {
    if (inFlight.current) {
      queued.current = next;
      return;
    }
    inFlight.current = true;
    setStatus({ kind: 'saving' });
    try {
      const res = await fetch(`/api/resumes/${id}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ content: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus({ kind: 'error', message: data.error ?? "That change couldn't be saved." });
      } else {
        setFlags(data.unsupportedNumbers ?? []);
        setStatus({ kind: 'saved' });
        router.refresh(); // side panels (missing numbers, filler phrases) read the saved text
      }
    } catch {
      setStatus({ kind: 'error', message: "Couldn't reach the server." });
    } finally {
      inFlight.current = false;
      const waiting = queued.current;
      queued.current = null;
      if (waiting) void save(waiting);
    }
  }

  function change(next: Resume) {
    setResume(next);
    void save(next);
  }

  const setRole = (i: number, patch: Partial<Role>) =>
    change({ ...resume, experience: replaceAt(resume.experience, i, { ...resume.experience[i], ...patch }) });
  const marked = (t: string) => <MarkedText text={t} numbers={flags} />;

  const c = resume.contact;
  const contactFields = [
    ['location', 'Location'],
    ['phone', 'Phone'],
    ['email', 'Email'],
    ['linkedin', 'LinkedIn'],
  ] as const;
  const firstFilled = contactFields.findIndex(([k]) => c[k]);
  const certs = resume.certifications ?? [];

  return (
    <>
      <p className="edit-status edit-only" aria-live="polite">
        {status.kind === 'idle' && 'Click any text to edit it. Changes save when you click away.'}
        {status.kind === 'saving' && 'Saving…'}
        {status.kind === 'saved' && 'Saved'}
        {status.kind === 'error' && (
          <>
            {`Couldn't save: ${status.message}`}
            <button type="button" className="edit-ctl" onClick={() => void save(resume)}>
              Retry
            </button>
          </>
        )}
      </p>

      <article className="resume">
        <style>{DOCUMENT_CSS}</style>
        <h1>
          <EditableText value={resume.name} label="Name" onCommit={(v) => change({ ...resume, name: v })} />
        </h1>
        <p className={resume.targetTitle ? 'target' : 'target edit-only'}>
          <EditableText
            value={resume.targetTitle ?? ''}
            label="Target title"
            placeholder="+ Target title"
            onCommit={(v) => change({ ...resume, targetTitle: v })}
          />
        </p>
        <p className="contact">
          {contactFields.map(([k, label], i) => {
            const v = c[k] ?? '';
            return (
              <span key={k} className={v ? undefined : 'edit-only'}>
                {v ? (i > firstFilled ? ' | ' : '') : ' '}
                <EditableText
                  value={v}
                  label={label}
                  placeholder={`+ ${label}`}
                  onCommit={(nv) => change({ ...resume, contact: { ...c, [k]: nv } })}
                />
              </span>
            );
          })}
        </p>

        <section id="sec-summary" className={resume.summary ? undefined : 'edit-only'}>
          <h2>Summary</h2>
          <p>
            <EditableText
              multiline
              value={resume.summary}
              label="Summary"
              placeholder="+ Add a summary"
              render={marked}
              onCommit={(v) => change({ ...resume, summary: v })}
            />
          </p>
        </section>

        <section id="sec-skills" className={resume.skills.length ? undefined : 'edit-only'}>
          <h2>Skills</h2>
          <p>
            {resume.skills.map((s, i) => (
              <span key={i}>
                {i > 0 && ', '}
                <EditableText
                  value={s}
                  label={`Skill ${i + 1}`}
                  onCommit={(v) => change({ ...resume, skills: replaceAt(resume.skills, i, v) })}
                />
                <Ctl label={`Remove skill ${s}`} onClick={() => change({ ...resume, skills: removeAt(resume.skills, i) })}>
                  ×
                </Ctl>
              </span>
            ))}
            <AddText label="Add a skill" onAdd={(v) => change({ ...resume, skills: [...resume.skills, v] })} />
          </p>
        </section>

        <section id="sec-experience">
          <h2>Experience</h2>
          {resume.experience.map((role, i) => (
            <div className="role" key={i}>
              <div className="role-line">
                <span className="role-title">
                  <EditableText value={role.title} label={`Role ${i + 1} title`} onCommit={(v) => setRole(i, { title: v })} />
                </span>
                <span className="role-meta">
                  <EditableText
                    value={role.start}
                    label={`Role ${i + 1} start date`}
                    placeholder="+ Start"
                    onCommit={(v) => setRole(i, { start: v })}
                  />
                  {role.start && role.end ? ' – ' : ' '}
                  <EditableText
                    value={role.end}
                    label={`Role ${i + 1} end date`}
                    placeholder="+ End"
                    onCommit={(v) => setRole(i, { end: v })}
                  />
                </span>
              </div>
              <div className="role-line">
                <span className="company">
                  <EditableText value={role.company} label={`Role ${i + 1} company`} onCommit={(v) => setRole(i, { company: v })} />
                </span>
                <span className="role-meta">
                  <EditableText
                    value={role.location ?? ''}
                    label={`Role ${i + 1} location`}
                    placeholder="+ Location"
                    onCommit={(v) => setRole(i, { location: v })}
                  />
                </span>
              </div>
              <ul>
                {role.bullets.map((b, j) => (
                  <li key={j}>
                    <EditableText
                      multiline
                      value={b}
                      label={`Bullet ${j + 1}, ${role.title} at ${role.company}`}
                      render={marked}
                      onCommit={(v) => setRole(i, { bullets: replaceAt(role.bullets, j, v) })}
                    />
                    <Ctl label="Move bullet up" disabled={j === 0} onClick={() => change(moveBullet(resume, i, j, j - 1))}>
                      ↑
                    </Ctl>
                    <Ctl
                      label="Move bullet down"
                      disabled={j === role.bullets.length - 1}
                      onClick={() => change(moveBullet(resume, i, j, j + 1))}
                    >
                      ↓
                    </Ctl>
                    <Ctl
                      label="Delete bullet"
                      disabled={role.bullets.length === 1}
                      onClick={() => confirmRemove('bullet') && setRole(i, { bullets: removeAt(role.bullets, j) })}
                    >
                      ×
                    </Ctl>
                  </li>
                ))}
                <li className="edit-only">
                  <AddText label="Add a bullet" multiline onAdd={(v) => setRole(i, { bullets: [...role.bullets, v] })} />
                </li>
              </ul>
              <Ctl
                label={`Delete role ${role.title} at ${role.company}`}
                disabled={resume.experience.length === 1}
                onClick={() => confirmRemove('role') && change({ ...resume, experience: removeAt(resume.experience, i) })}
              >
                Delete role
              </Ctl>
            </div>
          ))}
          <AddRole onAdd={(r) => change({ ...resume, experience: [...resume.experience, r] })} />
        </section>

        <section id="sec-education" className={resume.education.length ? undefined : 'edit-only'}>
          <h2>Education</h2>
          {resume.education.map((e, i) => {
            const set = (patch: Partial<Education>) =>
              change({ ...resume, education: replaceAt(resume.education, i, { ...e, ...patch }) });
            return (
              <p key={i}>
                <strong>
                  <EditableText value={e.degree} label={`Degree ${i + 1}`} onCommit={(v) => set({ degree: v })} />
                </strong>
                {', '}
                <EditableText value={e.school} label={`School ${i + 1}`} onCommit={(v) => set({ school: v })} />
                <span className={e.year ? undefined : 'edit-only'}>
                  {', '}
                  <EditableText value={e.year ?? ''} label={`Year ${i + 1}`} placeholder="+ Year" onCommit={(v) => set({ year: v })} />
                </span>
                <Ctl
                  label={`Delete ${e.degree}`}
                  onClick={() => confirmRemove('education entry') && change({ ...resume, education: removeAt(resume.education, i) })}
                >
                  ×
                </Ctl>
              </p>
            );
          })}
          <AddEducation onAdd={(e) => change({ ...resume, education: [...resume.education, e] })} />
        </section>

        <section id="sec-certifications" className={certs.length ? undefined : 'edit-only'}>
          <h2>Certifications</h2>
          <ul>
            {certs.map((x, i) => (
              <li key={i}>
                <EditableText
                  value={x}
                  label={`Certification ${i + 1}`}
                  onCommit={(v) => change({ ...resume, certifications: replaceAt(certs, i, v) })}
                />
                <Ctl label={`Remove ${x}`} onClick={() => change({ ...resume, certifications: removeAt(certs, i) })}>
                  ×
                </Ctl>
              </li>
            ))}
            <li className="edit-only">
              <AddText label="Add a certification" onAdd={(v) => change({ ...resume, certifications: [...certs, v] })} />
            </li>
          </ul>
        </section>
      </article>
    </>
  );
}
```

- [ ] **Step 2: Render it on the résumé page**

In `web/app/resume/[id]/page.tsx`, replace

```ts
import ResumeDocument from '@/components/ResumeDocument';
```

with

```ts
import EditableResume from '@/components/EditableResume';
```

and replace

```tsx
              <ResumeDocument resume={resume} unsupportedNumbers={audit?.unsupportedNumbers ?? []} />
```

with

```tsx
              <EditableResume id={row.id} initial={resume} flags={audit?.unsupportedNumbers ?? []} />
```

- [ ] **Step 3: Delete the old read-only renderer**

Run: `git rm web/components/ResumeDocument.tsx`
Then: `cd web && grep -rn "ResumeDocument" app components lib test`
Expected: no output.

- [ ] **Step 4: Type-check, test, build**

Run: `cd web && npx tsc --noEmit -p . && npm test && npm run build`
Expected: no type errors, all tests pass, build succeeds.

- [ ] **Step 5: Commit**

```bash
git add web/components/EditableResume.tsx "web/app/resume/[id]/page.tsx"
git commit -m "feat(web): edit résumés in place on the résumé page

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Stale fit score on the job page

**Files:**
- Modify: `web/app/jobs/[id]/page.tsx`

**Interfaces:**
- Consumes: `isMatchStale` (Task 1); existing `GenerateButton` with `op="match"`.

- [ ] **Step 1: Read the master's `updated_at`**

Add to the imports:

```ts
import { isMatchStale } from '@/lib/resume-edit';
```

Replace

```ts
  const master = ((await q`
    SELECT id FROM resumes WHERE sid = ${sid} AND parent_id IS NULL
```

with

```ts
  const master = ((await q`
    SELECT id, updated_at FROM resumes WHERE sid = ${sid} AND parent_id IS NULL
```

After the line `const match = readMatch(job.match);` add:

```ts
  // The score was verified against the master as it was; an edit since then can change it.
  const stale = Boolean(match && master && isMatchStale(master.updated_at, match.created_at));
```

- [ ] **Step 2: Show the note with its Re-check button**

Directly after the existing paragraph that ends `It is not a prediction of whether you will get an interview.` and its closing `</p>`, add:

```tsx
            {stale && (
              <div className="note" style={{ marginTop: 'var(--s-3)', borderLeft: '3px solid var(--warn)' }}>
                <p style={{ marginBottom: 'var(--s-2)' }}>Your master résumé changed since this score was made.</p>
                <GenerateButton
                  action={`/api/jobs/${job.id}`}
                  op="match"
                  jobId={job.id}
                  label="Re-check fit"
                  busyLabel="Checking… about 30 seconds"
                  primary
                />
              </div>
            )}
```

and change the lower button's condition from

```tsx
        {view && master && (
```

to

```tsx
        {view && master && !stale && (
```

so only one Re-check button shows.

- [ ] **Step 3: Type-check and build**

Run: `cd web && npx tsc --noEmit -p . && npm run build`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add "web/app/jobs/[id]/page.tsx"
git commit -m "feat(web): say when a fit score predates the latest master edit

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Verify live and update docs

**Files:**
- Modify: `CLAUDE.md`, `docs/superpowers/specs/2026-10-16-inline-editing-design.md`

- [ ] **Step 1: Start the local test server**

This worktree needs `web/.env.local`. Copy it from the primary checkout (`D:\src\job-search-kit\web\.env.local`) without printing it; it is gitignored. It may point at the production database, so use only a new `@example.com` account. Start `web-localtest` (preview_start, port 3001).

- [ ] **Step 2: Click through (built-in browser)**

With a fresh account `edit-test-<n>@example.com`: accept `/agree`, add a résumé at `/review` (paste the text of `web/test/fixtures/priya.json`'s person or any fictional résumé), then on `/resume/[id]`:

1. Edit a bullet, click away: "Saved". Reload: the edit stayed.
2. Empty a bullet: "Couldn't save: A bullet can't be empty. Delete it instead." and the text stays on screen; type it back: "Saved".
3. Move a bullet up and down; delete one (confirm dialog); add one.
4. Add and remove a skill; add a role through the form; add education.
5. Type a number over a `[METRIC NEEDED]` marker (if the résumé has one): the "missing a number" panel count drops after save.
6. Add a job, Check my fit, then edit the master: the job page shows "Your master résumé changed since this score was made."; Re-check clears it.
7. Tailor to the job; on the tailored copy, edit a bullet containing a yellow-flagged number: the flag goes after save; other flags stay. Check the master is unchanged.
8. Download Word and Print preview: no edit controls, no placeholders, same layout as before.
9. Keyboard only: Tab to a field, Enter to edit, Escape restores the saved text.

- [ ] **Step 3: Route checks with `curl.exe`**

Using a second throwaway account's cookie jar (`curl.exe -c jar2 …` sign-in), `PUT /api/resumes/<first account's résumé id>` with valid content → expect 404. With a 250 KB body → 413. With `{"content":{}}` → 400 and a message. Set `MSYS_NO_PATHCONV=1` if running from Git Bash.

- [ ] **Step 4: Update docs**

- `CLAUDE.md` module map: add `resume-edit.ts` (`parseEdit`, `clearFlags`, `moveBullet`, `isMatchStale`, `readNote`); API list: `PUT /api/resumes/[id]`; remove "no in-app editing" and "restored bullets go at the end of their role" from Known weaknesses (bullets can be moved now); test count; remove item 5 from Next.
- Spec: change Status to built, record the planning-time changes listed at the top of this plan, and note what the click-through verified.

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md docs/superpowers/specs/2026-10-16-inline-editing-design.md
git commit -m "docs: inline editing built and verified

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
