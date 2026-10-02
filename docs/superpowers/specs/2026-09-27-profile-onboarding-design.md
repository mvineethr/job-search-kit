# Profile onboarding — design

Date: 2026-09-27. Status: approved in conversation, not built.

## Goal

A new tester starts by setting up a profile: give a résumé and/or a LinkedIn export, or,
with neither, build a résumé by answering guided questions. The page structure stays as it
is (page head, sections, entry cards); this only adds pages.

Accounts stay as they are: shared password + signed session cookie (`session.ts`). The
profile hangs off `sid`. Real sign-in can replace the password later without changing this
flow.

## Decisions

| Question | Decision |
|---|---|
| What is "an account" | Onboarding on the existing session, not real sign-in |
| No résumé, no LinkedIn | Guided form; the model rephrases the person's own words |
| LinkedIn format | Both: profile PDF ("Save to PDF") and the data-export zip |
| Both résumé and LinkedIn | Résumé becomes the master; LinkedIn text stored on the profile, unused for now |

## Data

One new table, created in `ensureSchema()`:

```sql
CREATE TABLE IF NOT EXISTS profiles (
  sid           TEXT PRIMARY KEY,
  name          TEXT NOT NULL DEFAULT '',
  linkedin_text TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
)
```

Every query filters by `sid`, same as the other tables.

## Flow

### Redirect

`app/page.tsx`: if the session has no `profiles` row **and** no résumés, redirect to
`/start`. Testers who already have résumés are never forced through onboarding.

The identity card shows `profiles.name` when set (initials in the avatar), otherwise
"Test build" as now, and gains a "Profile" link to `/start`.

### `/start` — Set up your profile

A client page with two optional inputs:

1. **Your résumé**: file (PDF/txt/md) or paste, reusing `TextOrFileInput`'s extract logic.
2. **Your LinkedIn**: profile PDF or data-export `.zip`, sent to `/api/extract`.

Extracted text is shown for the person to check before saving, exactly as with PDFs today.
The page needs `TextOrFileInput` to accept a label, an `accept` list and a button label
rather than hard-coding "résumé"; that is the only change to it.

Submit posts a form to `POST /api/profile` with `resume_text` and `linkedin_text` (either
may be empty; both empty → `backWithError`):

- Upsert `profiles` with `linkedin_text` (null if not given).
- Master source = `resume_text` if given, else `linkedin_text`.
- Parse it with `resume-parse` on the fast tier, the same code as `POST /api/resumes`
  (extract that into a shared `lib/save-master.ts` used by both routes).
- Set `profiles.name` from the parsed name when present.
- Title: "My résumé", or "From LinkedIn" when built from LinkedIn.
- 303 to `/resume/[id]`.

Below the inputs: a link "I don't have either — build one with me" → `/start/build`.

### `/start/build` — guided questions

A client page, three steps, with back/next buttons and state kept in React:

1. **About you**: name (required), target title, email, phone, location, LinkedIn URL.
2. **Experience**: repeatable role blocks with title, company, start, end (all as
   typed, free text), and "What did you do there? Your own words are fine" (required,
   textarea). At least one role. "Add another role" / "Remove".
3. **Education and skills**: repeatable blocks (degree, school, year), and skills as a
   comma-separated list.

Submit posts JSON to `POST /api/profile/build`, which:

1. Validates the answers with a Zod `BuildAnswersSchema` (`lib/build-answers.ts`).
2. Flattens them to plain text with `answersToText()`: labelled lines, one block per role.
   **This text is the source of truth** for everything that follows.
3. Calls `core/resume-build.md` on the **primary** tier with the answers text, then
   `extractJsonObject` → `ResumeSchema.safeParse`.
4. Runs `verifyTailoring(built, null, answersText)`: skills not in the answers are removed,
   and unsupported numbers and employers are reported.
5. Upserts `profiles.name`, and inserts a master résumé titled "My résumé" with
   `source_text = answersText`. Later tailoring then treats the person's own words as the
   source, and their own numbers are never flagged.
6. Streams nothing; it returns `{ id }` and the client navigates to `/resume/[id]`. On
   failure it returns `{ error }`, the client shows it, and the answers stay on screen.

`maxDuration = 180`, as for other model routes. The expected time is about 30s, so the button
shows the `Elapsed` counter.

### `core/resume-build.md`

A new prompt, added to `KNOWN` in `prompts.ts`. Same JSON shape as `resume-parse.md`, with
`{{ATS_RULES}}` substituted. Rules:

- Turn each role's description into 2–5 résumé bullets: strong verb first, past tense
  for past roles, and **only facts the person wrote**.
- **Never invent a number.** Where a bullet describes impact that would normally be
  measured, end it with the literal `[METRIC NEEDED]`. Never suggest a value.
- No tools, skills, employers, titles or dates the answers do not contain. Dates:
  normalise the format only (`Mar 2022`, `Present`).
- Skills: the ones listed, plus tools named in role descriptions, verbatim.
- Summary: one or two sentences built only from the answers, or empty if there is too
  little to say.
- Education and contact are transcribed.

## LinkedIn zip

`/api/extract` accepts `.zip` (`application/zip`). New `lib/linkedin-zip.ts`:

- `unzip(buf)`: reads the central directory and inflates entries with
  `zlib.inflateRawSync` (method 8) or copies them (method 0). No dependency.
- `linkedinZipToText(buf)`: reads `Profile.csv`, `Positions.csv`, `Education.csv` and
  `Skills.csv` (matched case-insensitively, at any path depth). A small quoted-CSV parser
  handles commas and newlines inside quotes. Output is résumé-like text: the name and
  headline, a Summary block, an Experience block (`Title, Company, Started On – Finished
  On`, then the description), Education, and Skills.
- A zip with none of those files → error "That zip is not a LinkedIn data export".
- Size cap: same as PDFs in `/api/extract`.

The profile PDF needs no new code: it goes through the existing PDF path.

## Error handling

- Both inputs empty on `/start` → `backWithError`.
- A parse failure is not fatal (same as today): the text is kept and the résumé row is saved
  with `content = null`.
- A build that fails to produce valid JSON returns `{ error }`; answers are not lost.
- A bad or unrecognised zip → a clear error from `/api/extract`, shown in place.

## Tests (Vitest)

- `linkedin-zip.test.ts`: a fixture zip built in the test with `zip()` from `docx.ts`
  (deflated entries) → expected text contains the positions and skills, and a quoted
  comma and newline survive. A zip without LinkedIn files → throws.
- `build-answers.test.ts`: `answersToText()` includes every role's words and the skills.
  `verifyTailoring(built, null, answersText)` strips a skill that is not in the answers
  and keeps one that is.

## Not in scope

Real accounts, a separate profile-edit page (re-running `/start` adds another master),
merging LinkedIn into the résumé, and chat-style building. Using the stored
`linkedin_text` belongs to the "Fix my LinkedIn" feature.
