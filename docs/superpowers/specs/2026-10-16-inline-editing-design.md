# Inline résumé editing — spec

**Status:** designed · 2026-10-16. Not built.

## Why

Every check the app runs points at text the person cannot change: `[METRIC NEEDED]`,
flagged numbers, filler phrases, restored bullets that land at the end of their role. Every
competitor lets people edit. This is the first of a series of improvements (next: a prompt
test set and rewrite of `core/`, the output template, a UI pass, outcome tracking).

**Internal goal, never shown to users:** résumés made here get picked more than 50% of the
time. No copy claims it (FTC risk, and no tool controls hiring). It is the yardstick
outcome tracking will measure later; editing is a prerequisite, not a measure.

## How people use the master

The master is the clean base. For each job, the person starts a copy from the master and
edits that copy for the job; they never reuse an edited copy for the next job. So:

- **Edits to a tailored copy stay in that copy.** Nothing moves into the master on its own.
- **A fact worth reusing is typed into the master**, and every later copy starts with it.

## What can be edited

Masters and tailored copies, on `/resume/[id]`, in place on the rendered document. Click a
field and it becomes an input in the same spot; clicking away saves.

| Part | Edit | Add / remove | Reorder |
|---|---|---|---|
| Name, target title, email, phone, location, LinkedIn | text | — | — |
| Summary | text (multi-line) | — | — |
| Skills | text | yes | no |
| Role: title, company, location, start, end | text (dates free text, as now) | role: yes | no |
| Bullets | text (multi-line) | yes | up / down within the role |
| Education: degree, school, year | text | yes | no |
| Certifications | text | yes | no |

Not editable: section headings (ATS parsers look for the literal `SECTION_HEADINGS`), cover
letters, rich text (bold, links). Résumés that could not be parsed (`content` fails
`ResumeSchema`, shown as plain text) are not editable in this version.

Removing a bullet, role or education entry asks for confirmation. Clearing a field's text
does not delete it; a required field left empty is rejected (below).

## Saving

- A client component holds the whole résumé. When a field loses focus with changed text,
  or after add / remove / reorder, it sends the **whole** résumé:
  `PUT /api/resumes/[id]` with JSON `{ content }`.
- The route: `requireSid()`; rejects bodies over 200 KB; `ResumeSchema.safeParse(content)`;
  `UPDATE resumes SET content = …, updated_at = now() WHERE id = … AND sid = …`. No row
  updated → 404. Returns `{ ok: true, updatedAt, unsupportedNumbers }` as JSON (this is a
  fetch from a client component, not a browser form, so JSON is correct here).
- Invalid → 400 with a plain message naming the field ("A role needs at least one bullet",
  "Name can't be empty"). The client keeps the person's text in the field, shows the
  message beside it, and does not update its saved state.
- Status beside the field: "Saving…", "Saved", "Couldn't save — retry". A failed save keeps
  the edit on screen so nothing typed is lost.
- After a successful save the client calls `router.refresh()`, so server-rendered panels
  (missing-number count, filler phrases, review input) reflect the new text.
- Last write wins. One person, possibly two tabs; no locking in this version.
- The existing `POST /api/resumes/[id]` (delete tailored copy) is unchanged. Masters still
  can never be deleted.

## The checks after an edit

**Tailored copies: what the person types is theirs.** The audit in `source_text`
(`{note, audit}`) keeps its history, except `unsupportedNumbers`, which is updated on
every save by a pure function:

```
clearFlags(before: Resume, after: Resume, flags: string[]): string[]
```

A flagged number stays flagged only if it still appears somewhere in `after`, and no
string the person changed in this save contains it. "Changed" = a text field in `after`
that does not appear verbatim in `before`. Edits only ever **remove** flags; they never add
them, and skills the person types are never stripped. `verifyTailoring` still runs on
everything the model writes, unchanged.

**Masters: edits become evidence.** `sourceText` and `matchSource` already read the
master's `content`, so future tailoring and fit scores use the edited master with no change.
Existing tailored copies are not touched.

The original upload (`source_text` on a master) is never modified by editing. Side effect,
accepted: a claim deleted from the master still counts as evidence through the raw text.

**Stale fit score.** A stored match (`jobs.match.created_at`) was verified against the
master as it was. On `/jobs/[id]`, if the master's `updated_at` is later than
`match.created_at`, show: "Your master résumé changed since this score was made." with a
**Re-check** button that posts the existing `op=match` (about 20 seconds). The old score
stays visible until then.

**`[METRIC NEEDED]`:** typing a number over the marker fills it. The "Tell us the numbers"
page stays.

## Print and export

Edit controls (add, remove, up/down, save status) are hidden in print (`@media print`) and
sit outside the document's text, so print-to-PDF, the Word export and the ATS check see
the same document as today. Exports read the saved `content`, as now.

## Accessibility

Inputs are real `<input>` / `<textarea>` elements with labels (`aria-label` naming the
field, e.g. "Bullet 2, Senior Engineer at Acme"). Every control is reachable by keyboard.
Escape cancels an edit and restores the saved text. Save status is announced
(`aria-live="polite"`). Design tokens and spacing as in `globals.css`.

## Units

| Unit | Job |
|---|---|
| `lib/resume-edit.ts` | `clearFlags`, `moveBullet(resume, roleIndex, from, to)`, `isMatchStale(masterUpdatedAt, matchCreatedAt)`, plain-language messages for schema errors |
| `app/api/resumes/[id]/route.ts` | add `PUT` beside the existing `POST` |
| `components/EditableResume.tsx` | client component: holds state, renders the document with editable fields, sends saves |
| `app/resume/[id]/page.tsx` | renders `EditableResume` instead of `ResumeDocument` when the résumé parses |
| `app/jobs/[id]/page.tsx` | stale-score note and Re-check button |

`ResumeDocument` stays for read-only uses.

## Testing

- Vitest: `clearFlags` (edited bullet clears its number; untouched flagged number stays;
  number removed from the document clears; typed new numbers never flagged), `moveBullet`
  bounds, `isMatchStale` (missing `created_at` on old matches counts as stale), schema error
  messages.
- Route: rejects another person's résumé id (404), invalid content (400), oversized body.
- Click-through on the `web-localtest` server (port 3001) with an `@example.com` account:
  edit a master and a tailored copy, reload and confirm the change stayed, delete and
  reorder bullets, fill a `[METRIC NEEDED]`, watch a flag clear, download Word and print to
  PDF, confirm the stale note appears on a job after a master edit and Re-check clears it.

## Out of scope

Cover-letter editing, undo history, rich text, live collaboration, editing unparsed
résumés, a "copy this into the master" action.
