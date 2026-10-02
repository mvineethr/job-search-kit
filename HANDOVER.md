# Handover / Project Memory

Context for anyone (human or AI agent) picking this project up later. This file is
**public** — no personal data lives here. Personal job-search specifics are kept in a
local, gitignored notes file (see "Local notes" below).

_Last updated: 2026-10-01._ The standing dev brief (module map, hard rules, gotchas) is
`CLAUDE.md`; this file is the narrative.

## What this repo is

An open-source toolkit for fixing a résumé and LinkedIn profile with an AI agent. Each
capability is both an auto-triggered **skill** (`skills/<name>/SKILL.md`) and an explicit
**slash command** (`commands/<name>.md`). Works in Claude Code / Cowork.

Since September 2026 it is also a **web app** (`web/`, Next.js on Vercel + Neon + Kimi),
password-gated for testing (real accounts are built on a branch; see the 2026-09-27 → 10-01
session), so people without a terminal-based AI agent can use it. The plugin and the web app
read the same prompts from `core/`.

---

## Session 2026-10-01: the PR, Google sign-in, and the legal layer

Continues the 2026-09-27 → 10-01 session below on the same branch, same day: accounts were
built there; this session shipped them to a PR, got Google sign-in working, and added the
legal and account-management pieces. **Branch `claude/user-profile-linkedin-resume-b26e2b`,
PR [mvineethr/job-search-kit#3](https://github.com/mvineethr/job-search-kit/pull/3).
`a7d4b48` is committed but not pushed; nothing is deployed.**

### What was asked

1. Push and open a PR.
2. A walkthrough of Google OAuth setup (and of `BETTER_AUTH_URL`, and of where Vercel env vars
   go).
3. After Google sign-in worked: a "remove profile" option; a dropdown on the profile initials
   with settings and help pages; a privacy page, a ToS page, a proper user agreement at
   registration, and "anything legal I'm missing, just not to be sued over this website".

### Decisions

- PR rather than a direct merge (sign-in changes for everyone; previews first).
- Google OAuth: External, scopes `openid email profile` only, no logo (avoids review); redirect
  URIs for production and `localhost:3000`/`3001`; Google sign-in not tested on previews (random
  URLs). Vercel: everything Production + Preview except `BETTER_AUTH_URL` (Production only).
- "Remove profile" = **delete account and all data**, plus "Download my data".
- Operator: "Job Search Kit, a personal open-source project by Vineeth". **Contact email held
  until the project is renamed. Governing-law state not given** (clause omitted until set).
- Agreement is a proxy-enforced page every account hits, not a sign-up checkbox, because a
  first "Continue with Google" from `/login` also creates accounts.
- Minimum age 16; liability cap US$50; explicit "be honest" clause; no cookie banner (only
  necessary cookies); fonts self-hosted.

### What was built

- **Branch sync and PR**: `main` merged via the app's sync tool (`6b6e5b5`, brings `1ea5450`);
  112 tests, clean build and secret scan; pushed; PR #3 opened with a "Before merging"
  checklist.
- **Legal layer** (`a7d4b48`):
  - `lib/site.ts` — site facts (`SITE_NAME`, `OPERATOR`, `CONTACT_EMAIL` and
    `GOVERNING_STATE` from `NEXT_PUBLIC_*` env, `TERMS_VERSION` `2026-10-02`, `MIN_AGE` 16).
  - Terms gate: `lib/consent.ts` (`consentCookieValue` = version + first 16 hex of
    SHA-256(session token), `isExempt`, `safeNext`), `lib/consent-cookie.ts`, `proxy.ts` (signed
    in + stale cookie → 303 `/api/consent/sync`), `GET /api/consent/sync` (DB check once per
    session → cookie or `/agree`), `POST /api/consent` (three boxes required; records
    `profiles.terms_version`/`terms_accepted_at`), `app/agree/page.tsx` (summary + boxes +
    "I don't agree — sign out"). The sign-up form's AI checkbox moved here.
  - `/privacy`, `/terms` (16 sections), `/help` (9 Q&As), `components/LegalContact.tsx`
    (contact address when set; otherwise Settings + GitHub issues, with a "don't post personal
    details" warning); footer on every page; these three are public in the proxy matcher.
  - Profile menu: `components/TopBar.tsx` takes `me` from the root layout; native `<details>`
    with Profile, Settings, Help, Admin (admins), Sign out; closes on navigation, outside click,
    Escape. Signed-out visitors get a Sign in button and no nav.
  - `/settings`: account details, agreed terms version and date; `GET /api/account/export`
    (JSON of everything except password hashes and session tokens); `POST /api/account/delete`
    (typed "delete", checked client and server; signs out first, then one
    `sql.transaction` deleting letters, résumés, jobs, skill answers, profile, pending reset
    tokens and the user row — sessions/accounts cascade) → `/login?deleted=1`.
    `components/DeleteAccountForm.tsx`.
  - Fonts: `next/font` (`Inter`, `Source_Serif_4`) replaces the Google Fonts stylesheet;
    `--sans`/`--serif` read `--font-sans`/`--font-serif`.
  - Home card: Admin/Sign out replaced by a Settings link. `SignOutButton` takes
    `label`/`className`. `web/.env.example` gains `NEXT_PUBLIC_CONTACT_EMAIL`,
    `NEXT_PUBLIC_GOVERNING_STATE`. `CLAUDE.md` hard rules updated (account deletion is the one
    way masters are deleted; the Terms gate).
  - `test/consent.test.ts`: 5 tests.

### Found along the way

- **Phantom redirect bugs from the shell**: `curl.exe` from Git Bash lost one leading slash per
  argument (`next=/jobs` → `/`; `//evil.com` → `/evil.com`). MSYS path conversion; with
  `MSYS_NO_PATHCONV=1` the code behaved correctly.
- **Google Fonts** were loaded from Google on every page (visitor IPs to Google); moved to
  `next/font`.
- A browser-pane click failed because the pane hadn't drawn (app window behind another);
  the Google redirect was checked through `POST /api/auth/sign-in/social` instead.
- The pane lost the owner's Google session at some point during testing; the tests used a
  separate cookie jar and only throwaway accounts were deleted. Cause not pinned down.
- Privacy page opened "Job Search Kit is run by Job Search Kit, a personal…"; reworded.

### Verified (local server, port 3001)

- `.env.local` Google values present (lengths only: id 72, secret 35). "Continue with Google"
  shown; the auth API's Google URL has `redirect_uri=http://localhost:3001/api/auth/callback/google`
  and `scope=email profile openid`. **The owner signed in with Google and landed on `/start`.**
- Gate via `curl` with a throwaway account: sign-up → `/` → sync → `/agree`; blocked
  `POST /api/jobs` → sync; two boxes → error, `next` kept; three → recorded, `next=/jobs`
  honoured and `//evil.com` → `/`; sign out and back in → passes without `/agree`; export
  shows `terms_version 2026-10-02`; delete with "nope" → error; with "delete" →
  `/login?deleted=1`, export then redirects to sign-in, and sign-in returns 401.
- Browser pane with a second throwaway account: `/agree`, the profile menu, `/settings`, and
  deletion through the real form. `/privacy`: body font Inter, only stylesheet host the site,
  0 requests to Google.
- `tsc` and `next build` clean; **117 tests** (112 + 5).
- **Not verified:** anything on the PR preview or production; LinkedIn sign-in; Google sign-in
  outside localhost; the legal text by a lawyer.

### Pending

- Push `a7d4b48` to PR #3; try it on the preview; merge (remove `APP_PASSWORD` then).
- Publish the Google OAuth app out of Testing; create the LinkedIn app (needs a Company Page).
- Rename the project (`SITE_NAME`); then `NEXT_PUBLIC_CONTACT_EMAIL`; give the governing-law
  state (`NEXT_PUBLIC_GOVERNING_STATE`).
- Verify Moonshot's API terms (server location, retention, training on API data) and Neon's
  region against `/privacy`. A short lawyer review before promoting widely.
- `TERMS_VERSION` is `2026-10-02` (UTC) while the owner's local date was 1 October; harmless.
- Still open from the previous entry: domain + Resend, telling testers they start fresh, test
  rows in the database (`admin-test@example.com`, `normal-test@example.com`, two onboarding
  résumés), Moonshot spend cap.

---

## Session 2026-09-27 → 10-01: onboarding from what you have, a builder that can't invent, and real accounts

Extends both earlier sessions: the guided builder reuses the `verifyTailoring` check from
2026-09-19 → 09-22, and the LinkedIn zip reader mirrors the hand-written zip writer from
2026-09-24. **Everything here is on branch `claude/user-profile-linkedin-resume-b26e2b`
(17 commits, `bafe3e7`…`f3a41c4`), not pushed, not deployed.** Meanwhile `origin/main` gained
S2 and `1ea5450` (empty résumé sections skipped, done in a separate session spun off from this
one), so the branch is one commit behind `main` and needs it merged before a PR.

### What was asked

1. A user profile: same page structure, but a new user starts by giving their LinkedIn
   export and/or résumé, and if they have neither, the app helps them create one.
2. Then, after that worked: "having one user profile is a big problem now, people started to
   use it" — real profiles/accounts, so we know more about users and can build on it.

### Decisions (asked one at a time)

- Onboarding sits on the existing session first; accounts came second.
- No résumé and no LinkedIn → guided questions; the model rephrases the person's own words.
- LinkedIn: both the profile PDF and the data-export zip.
- Both given → résumé is the master; LinkedIn text stored on the profile, never merged.
- Plan executed inline, not one subagent per task.
- Sign-in: Google, email + password, and LinkedIn (maintainer's call: all three).
- Email: Resend, in a separate account (a second team is paid). Self-hosting with BunMail was
  evaluated and rejected: needs a VPS and outbound port 25, and a fresh IP's mail lands in
  spam. **No domain yet**, so emailed resets wait; until then, admins generate reset links.
- Existing testers: **start fresh** (old session data stays in the database, unreachable).
- Sign-up: **anyone, no limits**.
- Learn about users: career basics, "how did you find us", per-user usage, an admin page.
- Library: Better Auth 1.7.7, read from its installed source before designing (Next 16
  support, `getMigrations()`, the reset-link shape).

Specs: `docs/superpowers/specs/2026-09-27-profile-onboarding-design.md`,
`docs/superpowers/specs/2026-10-01-accounts-design.md`. Plan:
`docs/superpowers/plans/2026-09-27-profile-onboarding.md`.

### What was built

- **LinkedIn zip** (`0d310c9`): `lib/linkedin-zip.ts` — `unzip` (central directory +
  `inflateRawSync`, only wanted entries, 5 MB cap each), `parseCsv`, `linkedinZipToText`
  (Profile, Positions, Education, Skills, Email Addresses CSVs → résumé-like text;
  `NOT_LINKEDIN` error otherwise).
- **Uploads** (`529e9b6`): `/api/extract` routes `.zip`; `TextOrFileInput` takes
  `label`/`accept`/`buttonLabel` and uses `useId()` (two on one page).
- **Profiles + shared save** (`9ee52e6`): `profiles` table; `lib/save-master.ts` (parse +
  insert, used by `/api/resumes` and `/api/profile`); `lib/profile.ts`.
- **`/start`** (`5f8d6ea`): `components/StartForm.tsx`; home redirects new users there.
- **Guided builder** (`d2e246e`, `311f297`): `lib/build-answers.ts` (`BuildAnswersSchema`,
  `answersToText`), `core/resume-build.md` (in `KNOWN`), `POST /api/profile/build` (primary
  tier → `ResumeSchema` → `verifyTailoring(built, null, answersText)` → master with
  `source_text` = answers; JSON response so failures keep the answers on screen),
  `/start/build` with `components/BuildForm.tsx` (3 steps).
- **Accounts** (`859a335`): `lib/auth-server.ts` (Better Auth on a Neon `Pool`; Google/LinkedIn
  only when configured; account linking; `sendResetPassword` emails when configured, else
  parks the URL in `pendingResetLinks`), `/api/auth/[...all]`, `lib/auth.ts`
  (`currentUser`, `currentSid`/`requireSid` = user id), `lib/email.ts`, `lib/admin.ts`.
  `ensureSchema()` runs Better Auth's `getMigrations()` and now shares one in-flight promise.
  Removed `session.ts`, `cookie.ts`, `/api/login`, `test/session.test.ts`, `APP_PASSWORD`.
- **Pages** (`3509b0d`): `/login`, `/signup`, `/reset`, `components/AuthForm.tsx` (sign-up
  buttons, social included, disabled until the AI box is ticked), `ResetForm.tsx`,
  `SignOutButton.tsx`, `lib/auth-client.ts`; home card shows name/email, Sign out, Admin.
- **Career basics** (`a60bc9b`): `profiles` columns, `POST /api/profile/about` (choice fields
  allow-listed, text capped at 200), `components/AboutForm.tsx` on `/start`. Home redirect
  changed to "no résumé yet" (About-you creates a profile row).
- **Admin** (`9b47d77`): `/admin` (404 for non-admins; the one cross-`sid` query),
  `POST /api/admin/reset-link` (403 for non-admins; link returned in the body only),
  `components/ResetLinkButton.tsx`. Replaced the planned `npm run reset-link` script.
- **Proxy** (`b9df6fc`): `middleware.ts` → `proxy.ts` for Next 16; `.claude/launch.json`
  `web-localtest` server.
- Env placeholders in `web/.env.example` (`d25f249`, `859a335`); `CLAUDE.md` (`f3a41c4`).

### Found along the way

- The real `APP_PASSWORD` also signs production cookies, so it was never typed into local
  tests; a throwaway-password server was used instead (later repurposed for accounts with a
  test admin email).
- `ensureSchema()`'s run-once flag would race on Better Auth's plain `CREATE TABLE`.
- The old home redirect ("no profile and no résumé") would have broken once About-you
  created profile rows.
- Better Auth logs "Database schema mismatch — missing tables" once before the first request
  creates them; harmless.
- Next 16 deprecation warning for `middleware.ts`; a transient "must export a function"
  error appeared mid-rename.
- A scripted edit missed on a CRLF file; redone as exact-match edits.
- Empty "EDUCATION" heading on résumés without education (all three renderers): pre-existing,
  spun off; fixed on `main` as `1ea5450`.
- The desktop app quit mid-commit; edits were intact and committed after restart.

### Verified (local server, port 3001)

- Tests 108 → 116 (onboarding) → 110 (accounts: session tests removed, 4 added); `tsc` and
  `next build` clean; branch scanned for connection strings and key-shaped strings: none.
- Onboarding: new session → `/start`; a fake LinkedIn export through the real upload →
  clean text → master "From LinkedIn", all sections parsed; home showed the name.
- Builder: one café role in plain words → 5 bullets, the person's "4" kept, one
  `[METRIC NEEDED]` picked up by "Tell us the numbers"; finished within the first 10-second
  check. Empty `/start` post → back with error; bad builder JSON → 400.
- Accounts: signed out → `/login`; social buttons hidden without keys; sign-up blocked until
  the AI box is ticked; first sign-up created the auth tables and landed on `/start`;
  About-you saved and reloaded; `/admin` row correct; reset link → new password (old 401,
  new 200); non-admin: `/admin` 404, reset API 403; signed-out data route → sign-in.
- **Not verified:** Google and LinkedIn sign-in (no OAuth apps yet); a real LinkedIn export or
  profile PDF; résumé + LinkedIn together; anything on the live site.

### Pending

- Merge `main` into the branch; PR with preview deploy (recommended) or merge to `main`.
- Vercel env: new `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` = live origin, `ADMIN_EMAILS`;
  remove `APP_PASSWORD`. Google OAuth client and LinkedIn app (needs a Company Page).
- Domain → Resend verification → `EMAIL_FROM` for emailed resets.
- Tell current testers they'll start with empty accounts.
- Test data written to the database in `.env.local`: accounts `admin-test@example.com`,
  `normal-test@example.com` and two onboarding test résumés (under old session ids). Remove
  if that is production.
- Admin button only shows once an admin has a résumé (`/admin` always works).
- Moonshot spend cap is more pressing with open sign-up.

---

## Session 2026-09-24: market research, no guarantees, and a fit score built from verified evidence

Extends the 2026-09-19 → 09-22 session below: the anti-fabrication verifier, gap questions
and tailoring audit built there are what this session's fit score and fixes build on.
**Everything here is on branch `claude/resume-platform-analysis-35bb9c` (8 commits,
`9661417`…`3161c38`), not pushed to `main`, not deployed.**

### What was asked

Research competitors and the target audience, and suggest improvements. The maintainer's
goals: tailored résumés and cover letters with AI and no faking, the AI "screening" users
for the information it needs, users knowing they are using AI, an ATS résumé maker with an
"80% guarantee" of being picked, and a match-score meter before tailoring. Later: delete
buttons for résumés and jobs, and a way to mark a job as applied.

### Research and decisions

- Market research by a Sonnet subagent (sources it cited were not independently
  re-checked): competitors (Jobscan, Teal, Rezi, Kickresume, Enhancv, Resume Worded,
  Resume.io, Zety, auto-apply tools, TopResume) all sell an unvalidated score; none
  enforces anti-fabrication, which is the category's most-cited complaint. The "75% of
  résumés auto-rejected by ATS" figure traces to a 2012 Preptel sales pitch; surveyed
  recruiters mostly say their ATS doesn't auto-reject; the real screens are hard
  requirements and humans or AI rejecting generic text. The FTC has acted on inflated
  job-placement claims.
- **Decided:** no "80% guarantee" or any outcome claim; no auto-apply for now; pricing on
  hold until real accounts exist; **master résumés are never deleted** (only tailored
  copies and jobs); applied is a yes/no with a date (a full status pipeline was offered and
  declined); quick wins first.
- Match-score spec: `docs/superpowers/specs/2026-09-24-match-score.md` (now marked built,
  with acceptance results). Decisions on it: replace gap questions; bands 75/50
  ("Strong fit" / "Partial fit" / "Big gaps"); must-have weight 3, nice-to-have 1.

### What was built

- **Delete + applied** (`9661417`): `POST /api/jobs/[id]` with `op=applied|delete|match`
  (replaced an unused `DELETE` handler); job delete removes its tailored résumés in a
  transaction (letters cascade); `POST /api/resumes/[id]` deletes tailored copies only
  (`parent_id IS NOT NULL`); `jobs.applied_at`; `components/ConfirmButton.tsx`.
- **AI disclosure** (`6ebfffa`): sign-in box + required `ai_ack` checkbox, checked
  server-side before the password; `components/AiNotice.tsx` on tailored résumés and
  letters (outside `#printable`).
- **Filler phrases** (`32ad5d7`): `lib/generic-phrases.ts` parses the `## Banned` list in
  `core/ats-rules.md` (list extended by ~20 words); skips words the posting uses; whole-word
  matching; `components/GenericPhrases.tsx` on résumé and letter pages. `loadAtsRules()`
  exported from `prompts.ts`.
- **Fit score** (`1d28905` spec, `218541a` build): `core/job-match.md` replaces
  `core/gap-questions.md` (deleted; old jobs still render their stored `questions`).
  `lib/match.ts` — `verifyEvidence`, `viewMatch`, `band`, `readMatch`; `lib/run-match.ts`
  — primary tier, `TODAY:` line, stores `jobs.match`. New page `app/jobs/[id]/page.tsx`,
  `components/FitMeter.tsx`; the questions page reads `openQuestions` from the match; the
  answers route redirects to the job page with `?was=<score>` to show the change.
- **Three roadmap fixes** (`66f8dc4`): `restoreDroppedBullets` in `verify-tailoring.ts`
  (originals least like any surviving bullet are re-appended verbatim; missing roles
  re-inserted in place; roles match on company + title, or company + start date);
  `unsupportedNumbers` highlighted in `ResumeDocument` (screen only);
  `components/Elapsed.tsx` counter in `GenerateButton` and `AddJobForm`.
- **ATS check** (`b0df26e`): `/ats-check` page, `components/AtsUpload.tsx` (reuses
  `/api/extract`), `lib/ats-check.ts` (readable text, garbled chars, email, phone,
  headings, dates).
- **Word export** (`3161c38`): `lib/docx.ts` writes the .docx by hand (zip via
  `node:zlib` `crc32` + `deflateRawSync`, no dependency); `GET /api/resumes/[id]/docx`.

### Bugs found live, and how

- **Questions card never shown on /jobs**: the page never selected `questions`. Found
  while adding the applied flag.
- **Filler-phrase parser read nothing**: first test run. Causes: CRLF line endings, and the
  heading is `## Banned (these tank…)`, not `## Banned`.
- **Fit score unstable (86/83/73 on the same inputs)**: live runs with the real model,
  3× per posting on `test/fixtures/priya.json`. Round 1: "Prometheus and Grafana" split in
  one run only, so the prompt now says "and" splits, "or" doesn't. Round 2 (73/73/81):
  "7+ years" flipped partial/met because the model doesn't know the date, so `TODAY:` went
  into the message. Round 3 (67/81/69): a debug column showed the evidence
  "Jun 2019 – Present" (a span over two roles) failing `verifyEvidence`, so `years` spans
  are now accepted when both dates are on the résumé. Round 4: **81/79/79 and 17/17/17**,
  zero unverified evidence reaching the UI, 19–25s.
- **ATS check failed our own export**: a real PDF (app renderer → headless Chromium via
  Playwright → `unpdf`) reported all headings missing, because CSS uppercases them. Made
  case-insensitive. (This uppercase behaviour was already noted for the plugin template
  under "Design decisions worth remembering".)
- **Role duplication risk** in the first `restoreDroppedBullets`: a reworded title would
  have re-inserted the role. Caught in review before testing; covered by a test.

### Verified

- 108 Vitest tests passing (from 81); `tsc` and `next build` clean; build traces include
  `core/ats-rules.md` for the pages that now read it.
- Delete/applied SQL run against Neon under a throwaway `sid`, then cleaned up.
- Sign-in checkbox: `curl.exe` POST without it → `303 /login?ack=1`; with it → password
  check. Sign-in page viewed in the browser pane.
- Fit score: 4 rounds of live model runs as above (temporary test file, deleted).
- ATS check: a real PDF from the app's renderer passes all six checks (788 letters).
- .docx: Python `zipfile.testzip()` clean, 20 paragraphs; opened in Microsoft Word via COM
  (1 page, 131 words); Word's own PDF of it passes all six ATS checks.
- **Not verified:** no signed-in page (job page, meter, delete buttons, flagged numbers,
  filler panel, Word button) has been viewed in a browser, because the agent does not
  enter the test password.

### Pending

- Push to `main` and click through every feature above on the live site.
- Existing sessions won't see the disclosure checkbox until their 30-day cookie expires
  (forcing re-sign-in was offered, not done). The disclosure doesn't name Moonshot.
- Several masters are allowed and none can be deleted, so a mistaken one stays.
- No inline editing: flagged numbers, filler phrases and restored bullets can't be fixed
  in-app. Restored bullets go at the end of their role.
- Keyword coverage for tailored documents (separate from fit); cold email; LinkedIn;
  real accounts (needed before any pricing).
- Still open from the previous session: `MODEL_FAST_NAME` in Vercel, spend cap,
  friends' testing round, `web/README.md` boilerplate.

---

## Session 2026-09-19 → 09-22: the web app, and making "never fabricate" a code guarantee

This is the first session recorded in dated form. Everything below "Current state" predates
it and was written as a rolling summary (last dated 2026-06-27).

### What was asked

Turn the plugin into a website anyone can use, powered by the maintainer's own Kimi key,
with a harness around it; start free for testing, share it with friends who are job-hunting.
Later in the session: a test login and small database, a jobs hub, cover letters, and
questions that let users say what experience they have that the résumé doesn't show —
including filling `[METRIC NEEDED]` holes.

### Design (all in `docs/superpowers/`)

- `specs/2026-09-19-web-app-design.md` — one content source (`core/`), three surfaces
  (plugin, web, future MCP); **no tool calling** — models return JSON and the server
  renders, so a fallback model only has to emit text and ATS safety is a code guarantee;
  one engine, eight entry points; no file storage (uploads parsed and discarded).
- `specs/2026-09-19-ux-architecture.md` — written by a UX-architect agent: document canvas
  + assistant panel rather than chat; Jobs as the hub; streaming into the document;
  near-monochrome design tokens. Revised after mockup review: nav is
  Home · Jobs · Cold email · LinkedIn; LinkedIn has two modes (audit only when a profile
  export is supplied — auditing an unseen profile would mean inventing the criticism).
- A clickable mockup (published as a Claude Artifact, not in the repo), iterated five times.
- `plans/2026-09-20-web-app-phase-1.md` — 10 tasks, ordered so that stopping after task 9
  still leaves a usable review product.

### What was built

- `core/` extracted: `ats-rules.md`, `resume-review.md`; `skills/resume-review/SKILL.md`
  now points at them. Later added `resume-parse`, `resume-tailor`, `cover-letter`,
  `gap-questions`, `metric-questions`, `metric-fill`.
- `web/`: Next.js 16 / React 19.2, plain CSS tokens, Zod schemas, ATS renderer
  (`render-resume.ts`), `ResumeDocument`, OpenAI-compatible provider with
  `primary`/`fast`/`fallback` tiers, NDJSON streaming, PDF text extraction (`unpdf`),
  streaming review with findings anchored to sections.
- App shell matching the mockup (top nav, Home, canvas), with honest "Not built yet" pages
  for unbuilt sections.
- Shared-password test login: HMAC-signed session cookie; every query filters by `sid`, so
  testers never see each other's data.
- Neon tables `jobs`, `resumes` (tailored copies point at master **and** job), `letters`,
  `skill_answers`; created on demand by `ensureSchema()`.
- Jobs hub with add form, tailoring, cover letters (with the facts used and the gaps it
  declined to claim), gap questions, metric questions, print-to-PDF.
- `web/scripts/copy-core.mjs` as `prebuild`, because Vercel builds from `web/` and can't see
  `../core`.

### Bugs found live, and how

- **84s to first byte on reviews.** Probing the stream showed `kimi-k3` is a reasoning model
  emitting `reasoning_content` for ~28s before any `content` on a one-sentence prompt, and
  the code discarded it. Now streamed as progress (first text ~9s).
- **Default reasoning effort was `max`.** Benchmark on one résumé: max 107s / 11 findings,
  low 33s / 12 findings, `kimi-k2.6` 86s / 7, `kimi-k2.7-code-highspeed` 12s / 9. Effort is
  now set explicitly (`MODEL_*_EFFORT`).
- **Raw JSON visible mid-stream** — the strip regex only matched a closed fence.
- **Self-imposed 60s limit.** Routes set `maxDuration = 60`; Vercel Hobby with Fluid Compute
  allows 300s. An earlier claim in this session that Hobby caps at 60s was wrong. Now 180.
- **Vercel built as Python** (root `requirements.txt`), then "No Next.js version detected" —
  both were the Root Directory setting, not code.
- **Login silently broken with 53 unit tests green** — `Response.redirect()` headers are
  immutable, so `Set-Cookie` was dropped. Found by an end-to-end script.
- **Edge middleware build failure** — importing `COOKIE_NAME` from `session.ts` pulled
  `node:crypto` into the edge bundle; split into `cookie.ts`.
- **Tailoring "came back malformed" on a real résumé.** Reproduced against the actual job:
  the résumé had no Summary, the parse prompt returns `""`, the schema required `min(1)`, so
  it never parsed; tailoring then had no shape to copy and invented date keys. Schema made
  lenient on summary/dates; tailor prompt now carries the explicit schema; unparsed résumés
  re-parse on first tailor. Parsing moved to the fast tier (47s failing → 17s passing).
- **Tailoring stuffed skills from the job posting.** Audit of a real tailored résumé against
  its source: no invented numbers or employers, but **8 skills never in the résumé**
  (e.g. CloudFormation, Azure DevOps, ServiceNow) and **38 → 30 bullets**. Added
  `lib/verify-tailoring.ts` (removes unsupported skills, flags numbers/employers, counts
  dropped bullets) and a "Checked against your résumé" panel; tightened the prompt. Re-run:
  1 stuffed skill, caught and removed; 3 bullets dropped, flagged.
- **An invented "82%"** caught by the audit in a later run — flagged, still in the document.
- **User's own answer numbers flagged as invented** — answer details now count as source.
- **Metric questions silently generic** — array-returning prompts were parsed with
  `extractJsonObject`, which rejects arrays. Added `extractJsonArray`.
- Also: a live API key was pasted into the chat by mistake and rotated immediately.

### Verified

- 81 Vitest tests passing; `next build` clean.
- End-to-end scripts against local server + Neon for login, save/parse, add jobs, tailor,
  cover letter, gap questions (a confirmed skill reached the tailored résumé; a denied one
  stayed off), and metric fill ("about half" stayed "about half"; a contribution answer
  replaced the hole). Test sessions cleaned up after.
- Deployed to production from `main` several times; secret scan clean before each push.

### Pending

- Add `MODEL_FAST_NAME=kimi-k2.7-code-highspeed` in Vercel (not confirmed done).
- Spend cap on the model provider before wider testing.
- Highlight unsupported numbers inline; stop tailoring dropping bullets; progress UI for the
  ~50s tailor.
- Cold email, LinkedIn, interview prep, inline editing, real accounts, MCP server.
- Consider PRs + preview deploys instead of merging straight to `main`.
- Replace `web/README.md` (still `create-next-app` boilerplate) with real setup notes.

---

Core philosophy (applies to every capability):
1. **Diagnose before rewriting.**
2. **Anchor everything to real target job descriptions** (literal keyword matching).
3. **Never fabricate a metric** — emit `[METRIC NEEDED]` and make the user fill it.
4. **Résumé output is ATS-safe, single-column, PDF only.**

## How it was built (origin)

- Most of the kit is original: the résumé toolkit (`resume-review`, `resume-improve`,
  `resume-build`, `resume-tailor`, `resume-interview`), `job-analyzer`, the ATS ruleset,
  the HTML résumé template, the HTML→PDF pipeline, and the skill/command/plugin packaging.
- One of the seven capabilities — the LinkedIn `linkedin-rewrite` workflow — adapts a
  5-prompt sequencing *idea* from Abhijay Arora Vuyyuru's *AI Action Letter #29* (the
  prompts were rewritten; the idea is uncopyrightable). Credited in the README.
- It started as `linkedin-rewrite-kit`, then was renamed and substantially expanded into
  the broader `job-search-kit`.

## Current state (what exists)

Capabilities (skill + command each):
- `job-analyzer` — parse a JD into requirements + literal ATS keywords.
- `resume-review` — read-only diagnostic of an existing résumé.
- `resume-improve` — general strengthening of an existing résumé.
- `resume-build` — build from scratch via guided intake.
- `resume-tailor` — re-aim a résumé at one specific JD.
- `resume-interview` — interactive Q&A to fill `[METRIC NEEDED]` gaps + probe improvements.
- `linkedin-rewrite` — the 5-step sequenced LinkedIn workflow (prompts in `prompts/linkedin/`).

Shared infrastructure:
- `shared/ats-rules.md` — single source of truth for ATS formatting rules.
- `shared/resume-html/resume-template.html` — ATS-safe single-column template.
- `scripts/render_pdf.py` — HTML → PDF (WeasyPrint, Playwright fallback). Verified working.
- `templates/` — inputs checklist + voice doc.
- `examples/` — a rendered example résumé (fictional person) proving the pipeline.

The PDF pipeline has been tested end-to-end: renders one page, clean selectable text
layer, ATS keywords parse, `[METRIC NEEDED]` placeholders survive until filled.

## Design decisions worth remembering

- **Single column, standard headings, no tables/images** — ATS parse safety beats visual
  flair. A separate "designer" two-column template was discussed but deferred (see Roadmap).
- **Skills + slash commands both** — so users can auto-trigger or invoke explicitly.
- **WeasyPrint primary** for PDF because it yields a real text layer (ATS needs that);
  Playwright/Chromium is the fallback.
- **Headings render uppercase via CSS** but still parse as standard sections (SUMMARY,
  SKILLS, EXPERIENCE, EDUCATION, CERTIFICATIONS) — confirmed via text extraction.

## Roadmap / open items

- [x] **Packaged as a Claude Code plugin** (`.claude-plugin/plugin.json` + `marketplace.json`).
      Internal file refs use `${CLAUDE_PLUGIN_ROOT}` so skills work after install. Install via
      `/plugin marketplace add mvineethr/job-search-kit` then `/plugin install job-search-kit@job-search-kit`.
- [x] **Documented requirements** (shell + Python; `requirements.txt`) — résumé PDF
      rendering needs Claude Code/Cowork, not a browser-only chat.
- [x] **Theming / output variety** — résumé template now has a theme layer (CSS variables:
      accent, font, density) + presets (Classic / Modern / Compact) so users don't all
      produce identical output. ATS structure unchanged.
- [x] **Cover-letter capability** (`cover-letter` skill + command + matching template).
- [x] **Vision + roadmap captured** in `PLAN.md` (kept out of the README by request).
- [ ] **More résumé UI templates / second layout** — modern-accent (ATS-safe), compact/dense (ATS-safe),
      and an optional two-column "designer" variant (NOT ATS-safe; humans only).
      Status: discussed, put on hold by user.
- [ ] **`recommendation-request` capability** — draft a personalized LinkedIn
      recommendation ask (distinct from the skill-endorsement DM already in linkedin
      prompt 4). Status: proposed, optional.
- [ ] **Sponsor-friendly job-filtering note** — guidance on checking H-1B/LCA history
      before applying, for users who need visa sponsorship. Status: proposed.
- [ ] **Non-tech field variants** — current examples lean SRE/DevOps/PM.
- [x] **Hosted web app** (2026-09) — see the session entries above and `CLAUDE.md`.
- [ ] **`core/` extraction for the remaining plugin skills** — only `resume-review` has been
      moved; the other skills still hold their own copies of their prompts.
- [ ] **MCP server** reading `core/` (free; distribution rather than revenue).

## How to continue

- Web app: read `CLAUDE.md` first (module map, env vars, deploy steps, gotchas). Prompt
  changes go in `core/`, never in a route. (`web/README.md` is still `create-next-app`
  boilerplate — Phase 1 plan task 10 meant to replace it and never did.)
- Full usage guide: `INSTRUCTIONS.md` (detailed step-by-step).
- To use the kit: see `README.md` (gather inputs → `/job-analyzer` → pick a résumé or
  LinkedIn capability → fill `[METRIC NEEDED]` → render PDF).
- To extend it: see `CONTRIBUTING.md`. Keep the no-fabricated-metrics rule and the
  one-job-per-skill structure intact.

## Local notes (not committed)

Personal, session-specific context (the résumé that was tailored, metrics gathered,
eligibility constraints, interview answers) is intentionally kept out of this public repo.
If you are continuing a personal job-search session, look for `inputs/SESSION_NOTES.local.md`
on the local machine — it is gitignored and never pushed.
