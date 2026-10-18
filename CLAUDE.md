# CLAUDE.md — Job Search Kit dev brief

Standing brief for any AI agent working in this repo. Full history is in `HANDOVER.md`.
This repo is **public** (MIT) — never commit personal data, résumés, keys, connection
strings, or auth secrets.

## What this is

An open-source toolkit for fixing résumés and LinkedIn with AI. Two surfaces, one prompt
source:

1. **Claude Code plugin** — `skills/`, `commands/`, `prompts/linkedin/`, `shared/`,
   `scripts/render_pdf.py`. Installable via `.claude-plugin/`.
2. **Web app** — `web/` (Next.js), deployed on Vercel, with accounts (Better Auth: email + password, Google, LinkedIn).

Both read their prompt substance from **`core/*.md`**. A future MCP server is planned as a
third surface (free distribution, not revenue).

Philosophy, enforced everywhere: diagnose before rewriting; anchor to real job
descriptions; **never fabricate** — missing numbers are the literal `[METRIC NEEDED]`.

## Repo layout

```
core/                    agent-agnostic prompts — THE source of truth
  ats-rules.md           ATS rules (from shared/ats-rules.md minus Python mechanics)
  resume-review.md       diagnostic → prose + {section,severity,finding} JSON
  resume-parse.md        pasted text → résumé JSON (transcription only, never improves)
  resume-build.md        guided-builder answers → résumé JSON (rephrase only; [METRIC NEEDED], never a number)
  resume-tailor.md       résumé + JD → tailored JSON + {matched,missing,requirements}
  cover-letter.md        → {greeting,paragraphs,signoff,name,facts,gaps}
  job-match.md           JD vs résumé → requirements {kind,category,status,evidence,question}; replaced gap-questions
  metric-questions.md    [METRIC NEEDED] bullets → questions (array)
  metric-fill.md         answers → résumé with holes filled
skills/ commands/        plugin; skills/resume-review/SKILL.md now points at core/
web/
  app/                   routes (App Router); api/* are form-post or NDJSON endpoints
  lib/                   all logic; see module map
  components/            UI pieces
  scripts/copy-core.mjs  prebuild: copies ../core → web/core
  test/                  Vitest; fixtures/priya.json is a fictional person
docs/superpowers/        specs (design, UX, match score, onboarding, accounts) and plans
```

## Web module map (`web/lib`)

| Module | Job |
|---|---|
| `resume-schema.ts` | Zod résumé schema, `METRIC_NEEDED`, `SECTION_HEADINGS`. Lenient on summary/dates, strict on name/roles/bullets |
| `render-resume.ts` | JSON → ATS-safe HTML (export); `dateRange()`; escapes all content |
| `prompts.ts` | `loadPrompt(name)` — reads `core/`, substitutes `{{ATS_RULES}}`; `KNOWN` allowlist |
| `provider.ts` | OpenAI-compatible client; tiers `primary`/`fast`/`fallback`; `streamCompletion`, `completeText`; emits `{type:'reasoning'|'content'}` events |
| `ndjson.ts` | wire format for streamed events; buffers lines split across chunks |
| `extract-json.ts` | `extractJsonObject`, `extractJsonArray`, `proseBefore` — use the one matching the prompt's output shape |
| `verify-tailoring.ts` | **anti-fabrication**: strips skills absent from source, flags numbers/employers, restores dropped bullets/roles word for word (`restoreDroppedBullets`) |
| `match.ts` | **fit score**: `verifyEvidence` (quote must be in résumé; years spans checked end-to-end), `viewMatch` (answers raise, never lower; score = must 3 / nice 1, partial ½, unknown excluded), `band` |
| `run-match.ts` | calls `job-match` on primary with `TODAY:` in the message, verifies, stores `jobs.match` |
| `docx.ts` | hand-written .docx (zip via `node:zlib` crc32/deflate, no dependency); single-column paragraphs, same section order as the PDF |
| `ats-check.ts` | checks on extracted PDF text: readable, no font garbage, email/phone, headings (case-insensitive), dates |
| `generic-phrases.ts` | flags the `## Banned` words from `ats-rules.md` in résumés/letters, skipping words the posting uses |
| `answers.ts` | per-person skill answers; `claimableSkills`, `answersForPrompt`, `answerDetailText` |
| `question-schema.ts` / `metric-schema.ts` / `letter-schema.ts` / `findings-schema.ts` | Zod shapes for model outputs |
| `db.ts` | Neon via plain SQL; `ensureSchema()` creates tables on demand |
| `auth-server.ts` / `auth.ts` / `auth-client.ts` | Better Auth config; `currentUser()`, `requireSid()` (= user id); browser client |
| `admin.ts` / `email.ts` | `isAdmin` (`ADMIN_EMAILS`); Resend via fetch, off unless `RESEND_API_KEY` and `EMAIL_FROM` are both set |
| `profile.ts` / `save-master.ts` / `build-answers.ts` / `linkedin-zip.ts` | onboarding: profile + career basics; parse-and-save a master; guided-builder answers; LinkedIn export zip → text |
| `site.ts` | site facts quoted by the legal pages and chrome: `SITE_NAME`, `OPERATOR`, `CONTACT_EMAIL`, `GOVERNING_STATE`, `TERMS_VERSION`/`TERMS_UPDATED`, `MIN_AGE` (16) |
| `consent.ts` / `consent-cookie.ts` | Terms gate: `consentCookieValue` (version + hash of session token), `isExempt`, `safeNext` (same-site paths only); `consentSetCookie` |
| `redirect.ts` | `redirectTo`, `backWithError` for form posts |
| `resume-edit.ts` | inline editing: `parseEdit` (trim + `ResumeSchema` + plain-language errors), `clearFlags` (edits only remove flagged numbers), `moveBullet`, `isMatchStale`, `readNote` |
| `nav.ts` | top-nav items (`NAV`, `soon` flags) and `navCurrent` (which item a path belongs to) |
| `resume-groups.ts` | `groupResumes`: masters, then tailored copies grouped under their job |
| `components/AppNav.tsx` | the signed-in top bar: sections on the left, account menu on the right; on phones the sections move into the menu (client; uses `NAV`) |
| `components/PageBar.tsx` | breadcrumb row plus action rail at the top of every signed-in page |

Public home: signed out, `/` renders `components/Landing.tsx` (hero, use cases, integrations, plans) with `components/WritingDemo.tsx`, a scripted typing demo on a fictional résumé (no model call). `proxy.ts` lets exactly `/` through without a session; every other non-matcher path still goes to `/login`.

Account pages: `/agree` (clickwrap), `/settings` (export, delete), `/privacy`, `/terms`, `/help` (last three public). API: `/api/consent`, `/api/consent/sync`, `/api/account/export`, `/api/account/delete`.

Résumé editing: `/resume/[id]` renders `components/EditableResume.tsx` (fields are `EditableText`; `MarkedText` draws `[METRIC NEEDED]` and flags). Each change sends the whole résumé to `PUT /api/resumes/[id]` (JSON, not a form post). Masters' `source_text` is never touched; tailored copies get `audit.unsupportedNumbers` updated by `clearFlags`.

## Data model (Neon)

- `jobs(id, sid, company, role, description, analysis jsonb, questions jsonb, match jsonb, applied_at)`
  - `match` = verified requirements; the score is computed on render, never stored. `questions` is legacy (pre-match jobs only).
  - Deleting a job deletes its tailored résumés and letters. Masters can never be deleted.
- `resumes(id, sid, title, source_text, content jsonb, parent_id → resumes, job_id → jobs)`
  - master: `parent_id` null. Tailored: points at **both** master and job; master never modified.
  - For tailored rows, `source_text` holds JSON `{note, audit}`; older rows hold plain prose.
  - Masters from the guided builder hold the flattened answers (`answersToText`) in `source_text`: the person's words are the original.
- `letters(id, sid, kind, job_id, resume_id, content jsonb)`
- `skill_answers(sid, skill_key, skill, level, detail)` — **per person, not per job**
- `profiles(sid PK, name, linkedin_text, target_role, years_experience, location, search_status, heard_from, terms_version, terms_accepted_at)` — LinkedIn text is stored, never merged into the résumé; the terms columns are the record of agreement
- Better Auth's `user`, `session`, `account`, `verification` (camelCase quoted columns: `"userId"`, `"providerId"`, `"createdAt"`). `sid` everywhere = `user.id`. Rows from the old shared-password sessions remain, unreachable.

## Hard rules

- **Every query filters by `sid`** (the account's user id). It is the only thing separating people's data. The one exception is `/admin`, gated by `isAdmin`.
- **No tool calling.** Models return text/JSON; the server renders.
- **`core/` is the source of truth.** Change prompts there, never in a route. New capability = new `core/<name>.md` + add to `KNOWN` in `prompts.ts`.
- **Fabrication is enforced in code, not just prompts.** Tailored and guided-builder output must go through `verifyTailoring` (the builder passes its answers text as the source). Unsupported skills are removed; numbers/employers are flagged, never silently rewritten.
- **Prompts never suggest a number** to the user.
- **The fit score is arithmetic in `match.ts`, never a model output.** Evidence quotes must pass `verifyEvidence`; answers may raise a requirement, never lower it; no score is shown for tailored copies.
- **Master résumés are never deleted** — except by deleting the whole account (`/api/account/delete`, everything for that `sid` in one transaction). Other delete routes filter `parent_id IS NOT NULL` in SQL.
- **Terms gate:** every signed-in request needs the current `TERMS_VERSION` accepted (`lib/consent.ts`, enforced in `proxy.ts`, recorded in `profiles.terms_version/terms_accepted_at`). Change the Terms or Privacy Policy in substance → bump `TERMS_VERSION` and `TERMS_UPDATED` in `lib/site.ts`. New stored data or a new processor → update `/privacy` and `/api/account/export` in the same change.
- **No outcome guarantees** in copy ("X% interviews", "beats the ATS"): not deliverable, and an FTC risk.
- **Marketing copy states only what the code and this deployment do,** like legal copy: the landing page's Google card shows only when `enabledProviders().google`, unbuilt things say Planned / Not offered yet. **Zero monetization** (owner's H-1B status): no prices or paid plans in copy.
- **Secrets only in `web/.env.local`** (gitignored) and the Vercel dashboard. Never print a key; scripts that need one read it and report lengths only.
- **Scan commits for key-shaped strings and `postgresql://user:pass@` before every push.**
- **Never use real credentials in local browser tests.** Use the `web-localtest` server in `.claude/launch.json` (port 3001, own `BETTER_AUTH_URL`, test `ADMIN_EMAILS`) and `@example.com` accounts; `.env.local` may point at the production database.
- **Never accept terms or delete data on the owner's signed-in session** while testing; use throwaway accounts (a separate `curl` cookie jar works).
- **Legal copy states only what the code does.** No guessed facts about providers (location, retention): flag them for the owner to verify.
- **Password-reset links travel only in response bodies** — never in URLs, query strings or logs; whoever holds one can set the password.
- **Form posts redirect with `backWithError`,** never return raw JSON to a browser form.
- Design tokens in `web/app/globals.css` follow the Workbench spec (`docs/superpowers/specs/2026-10-17-workbench-redesign-design.md`): spacing 4/8/12/16/24/32/48/64, type 12–28px, radii 6/8/12, two neutral shadows, accent purple `#6d28d9` / dark `#a78bfa` since S6 (overrides the spec's cobalt; `test/tokens.test.ts` checks AA contrast), top navigation not a sidebar, no gradients/emoji/"AI-powered" copy, no exclamation marks.

## Models (Moonshot Kimi, OpenAI-compatible)

| Tier | Env | Model | Used for |
|---|---|---|---|
| primary | `MODEL_PRIMARY_*` | `kimi-k3`, `MODEL_PRIMARY_EFFORT=low` | review, job match, tailoring, cover letter |
| fast | `MODEL_FAST_NAME` (shares primary URL/key) | `kimi-k2.7-code-highspeed` | parse, metric questions/fill |
| fallback | `MODEL_FALLBACK_*` | `kimi-k2.7-code-highspeed` | only on 429/5xx from primary |

Unset fast tier silently uses primary. Tailoring stays on primary: the fast model over-claimed
matches (found 2 gaps where k3 found 4). Base URL `https://api.moonshot.ai/v1`; check model ids
with `GET /v1/models` — `kimi-k3` reports `think_efforts` default `max`.

Other env: `DATABASE_URL` (Neon **pooled** string), `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`
(must be the deployed origin), `GOOGLE_CLIENT_ID/SECRET`, `LINKEDIN_CLIENT_ID/SECRET` (blank hides
that button), `ADMIN_EMAILS`, `RESEND_API_KEY` + `EMAIL_FROM` (both needed; no domain yet, so
reset links come from the Reset link button on `/admin`).

## Run / test / deploy

```bash
cd web && npm install && npm run dev      # needs web/.env.local
cd web && npm test                         # Vitest, 178 tests
cd web && npm run build                    # prebuild copies ../core first
```

- **Vercel:** Root Directory **`web`**, preset Next.js, default build command (a custom one skips `prebuild`). `main` deploys to production.
- `main` is checked out in the primary worktree, so from this worktree merge via a detached temp worktree: `git worktree add --detach <tmp> origin/main`, merge, `git push origin HEAD:main`, remove it.
- Timings (k3 low): review ~24s, parse ~17s (fast), tailor ~50s (~95s if it must parse first), cover letter ~30s, job match ~20–25s.

## Gotchas (found live)

- `Response.redirect()` returns **immutable headers** — can't add `Set-Cookie`. Build the 303 by hand (`redirect.ts`).
- Next 16 renamed `middleware.ts` → `proxy.ts` (export `proxy`), and proxy runs on Node by default. It only checks the session cookie exists; `requireSid()` validates.
- Better Auth's migrations issue plain `CREATE TABLE`, so `ensureSchema()` shares one in-flight promise; a run-once flag set at the end let concurrent first requests race. Its "Database schema mismatch — missing tables" log on first boot is its check running before the tables exist.
- "Sign in with LinkedIn" returns name, email and photo only — never work history. A LinkedIn developer app needs a Company Page.
- Resend sends only to the account owner until a domain is verified; a `vercel.app` address can't be. Email is off unless `RESEND_API_KEY` and `EMAIL_FROM` are both set.
- Many repo files are CRLF; scripted string replacement with `\n` silently misses. Use exact-match edits.
- Git Bash rewrites arguments that look like paths (`next=/jobs` → lost slash, `//evil.com` → `/evil.com`) before `curl.exe` sees them. Set `MSYS_NO_PATHCONV=1` when testing redirects, or you'll chase phantom bugs.
- A sign-up checkbox doesn't bind social sign-ups: "Continue with Google" on `/login` creates accounts too. That's why agreement is the proxy-enforced `/agree` page.
- `redirect_uri_mismatch` = `BETTER_AUTH_URL` + `/api/auth/callback/google` isn't character-for-character in the Google client's list. Vercel previews get random URLs, so test Google locally or on production. Google OAuth apps in Testing mode admit only listed users, for 7 days.
- Loading Google Fonts from Google sends visitors' IPs to Google; fonts are self-hosted via `next/font` (`--font-sans`/`--font-serif` set on `<html>`).
- The root layout calls `currentUser()` on every page (for the menu), so every page is dynamic. `currentUser()` must call `headers()` **before** any DB access, or `next build` pre-renders static pages (`/_not-found`, `/ats-check`) against the database and the Vercel build fails. Reproduce with `DATABASE_URL=postgresql://x:x@127.0.0.1:1/x npm run build`.
- Built résumés go through `stripUnsupportedClaims` after `verifyTailoring`: a master shows no audit, so invented numbers become `[METRIC NEEDED]` and invented employers' roles are dropped.
- Reasoning models stream thinking on `delta.reasoning_content`; reading only `content` shows a blank screen for 80s+.
- `kimi-k3` defaults to `max` effort: 107s → 33s at `low`, with more findings. Always set effort.
- Vercel Hobby + Fluid Compute allows **300s**; `export const maxDuration = 60` *lowers* it. Model routes use 180.
- A prompt saying "use an empty string" + a schema with `.min(1)` silently broke parsing for every résumé without a summary. Keep prompt and schema defaults in agreement.
- Array-returning prompts need `extractJsonArray`; `extractJsonObject` rejects arrays and callers then silently fall back.
- Vercel picks the runtime from the repo root: root `requirements.txt` → "No python entrypoint found". Root Directory must be `web`.
- `create-next-app` pins `@types/node@^20`, which Vitest 5 rejects; use `^24` on Node 24.
- PowerShell `curl` is `Invoke-WebRequest`; use `curl.exe`.
- The verifier matches skills by literal text; it can strip a skill described differently. Gap questions + `claimableSkills` are the escape hatch.
- User-typed answer details must count as source (`answerDetailText`), or their own numbers get flagged as invented.
- The model does not know today's date: "Jun 2019 – Present" flip-flopped between under and over 7 years until `TODAY:` went into the match message.
- "Prometheus and Grafana" was split in one run and merged in others, a 13-point score swing. The match prompt now fixes the rule: "and" splits, "or" doesn't.
- The match check rejected a true years quote ("Jun 2019 – Present" spanning two roles) because it isn't one line of the résumé; `years` spans are verified end-to-end instead. Don't loosen the literal check for other categories.
- The PDF export uppercases headings via CSS, so extracted text says "EXPERIENCE"; anything checking headings in extracted text must be case-insensitive.
- A page that never SELECTs a column renders nothing and throws nothing: the jobs-page questions card never appeared because `questions` wasn't selected.
- `core/ats-rules.md` headings carry text after the name (`## Banned (these tank…)`) and the file is CRLF on Windows. Parsers of it must allow both.
- "The master" is the most recently **updated** one (`ORDER BY updated_at DESC` in the job page, `run-match`, letters). With inline editing, editing an older master makes it the active one and marks every job's score stale. Accepted while people keep one master; order by `created_at` if that changes.
- `fetch` follows the proxy's redirects to `/agree` or `/login`, which answer 200 HTML. A client must check the body (`data.ok === true`), not just `res.ok`, or a blocked save reads as saved.
- In the desktop app's browser pane, clicks by screen position can land on the wrong element, and `blur()` does not fire while the pane is in the background. Drive inline-edit tests through the elements themselves (`click()`, then a `focusout` event).
- A page's `if (!user)` branch is dead code unless `proxy.ts` lets that path through signed out: the proxy redirects before the page runs. The home page's `return null` sat unreachable until the landing page.
- The signed-in top bar (`AppNav`) is 56px and sticky; the page bar sticks at `top:56px` under it. Change both together. Five tabs plus a full name overflow below 1024px, which is why the tabs fold into the account menu there.
- New worktrees have no `web/node_modules`: run `npm ci` in `web` (~2 min) before `tsc` or tests.
- New worktrees get no `web/.env.local`. A `.worktreeinclude` in the main checkout (untracked) lists it, so Claude Code copies the main checkout's copy into each new worktree.

## Status

**On `main` (deploys to production):**
- **S1–S4**, via PRs #3 and #4 (merged by 2026-10-09):
  - résumés: add, streaming review, tailoring with audit, cover letters, metric questions, filler-phrase check, `/ats-check`, Word/PDF
  - jobs hub and fit score
  - onboarding: `/start` and the guided builder
  - accounts: real accounts (Better Auth), `/admin`, the `/agree` terms gate, `/privacy`, `/terms`, `/help`, `/settings` with export and deletion
- **S5:**
  - inline résumé editing plus a stale-score note: [mvineethr/job-search-kit#5](https://github.com/mvineethr/job-search-kit/pull/5)
  - sign-in and create-account side by side, with dark-mode inputs and links fixed: [mvineethr/job-search-kit#6](https://github.com/mvineethr/job-search-kit/pull/6)
  - the full **Workbench** redesign (sidebar layout, Geist, cobalt; spec `docs/superpowers/specs/2026-10-17-workbench-redesign-design.md`): [mvineethr/job-search-kit#7](https://github.com/mvineethr/job-search-kit/pull/7), merged 2026-10-17

Production was not checked after these merges. LinkedIn sign-in is untested (no app yet).

**Open PR (S6):** [mvineethr/job-search-kit#9](https://github.com/mvineethr/job-search-kit/pull/9), branch `claude/ai-writing-assistant-landing-17d468`. It adds the public landing page at `/`, fixes Codex's two copy findings, makes purple the accent, and replaces the sidebar with the top bar (`AppNav`). 178 tests; checked locally in light and dark at 375/800/1440px. Not merged. Its Plans section still has a "Pro — Not offered yet" card, which conflicts with zero monetization: remove it before merging unless the owner says otherwise.

**Held off `main` (S5):**
- `claude/profile-location-dropdowns` (`73a15cd`, unpushed; the owner asked to hold it): a state dropdown plus a city `datalist` (`lib/places.ts`, `components/LocationFields.tsx`), and a "how did you find us" list. It was written against the pre-Workbench `AboutForm.tsx` and `globals.css`, so it needs a rebase.
- `claude/distracted-mendeleev-256d1d` (16 local commits, another session): the prompt test set (a runner, scoring, a before/after table, blind A/B pages). It waits for the owner's yes before its first paid run.

**Legal gaps:** no contact email yet (waits on the project rename; pages fall back to Settings +
GitHub), no governing-law state, Moonshot and Neon facts in `/privacy` unverified, no lawyer
review.

**Not built:** cold email, LinkedIn fixer (two modes designed; `profiles.linkedin_text` is
waiting for it), interview prep (mocked up), cover-letter editing, outcome tracking, MCP server. Pages exist as
honest "Not built yet" placeholders.

**Known weaknesses:** restored bullets still land at the end of their role, though people can
now move them; cover letters can't be edited in the app; editing has no undo (deletes ask
first, and a master's original upload stays in `source_text`); the ATS check uses one extractor
(unpdf), and real ATSs vary.

## Next

0. PR #9: remove the Pro card (or the whole Plans section), merge, check signed-out `/` and the top bar on production, delete the S6 throwaway account (`navtest-…@example.com`, "Nav Test Person"), and update the Workbench spec to purple + top nav.
1. Check production after PRs #5–#7, and compare a résumé's print preview with the export: the redesign must not change the document. Then rebase and push `claude/profile-location-dropdowns`, and delete the S5 throwaway accounts (`edit-test-1017@example.com`, `edit-test-other-1017@example.com`).
2. Publish the Google OAuth app out of Testing. LinkedIn app (needs a Company Page).
3. Rename the project (`SITE_NAME` in `lib/site.ts`), then set `NEXT_PUBLIC_CONTACT_EMAIL` and `NEXT_PUBLIC_GOVERNING_STATE`; verify Moonshot (location, retention, training) and Neon region against `/privacy`.
4. Moonshot spend cap — sign-up is open with no limits.
5. Buy a domain, verify it in Resend, set `EMAIL_FROM`: turns on emailed password resets.
6. Quality series, in order (decided 2026-10-16):
   - inline editing: done
   - a prompt test set of fictional résumé/job pairs scored for invented content, keyword coverage, bullet strength and filler: built, held; then rewrite `core/` against it
   - the output template
   - a UI pass: done as the Workbench redesign
   - outcome tracking (applied → heard back → interview). **Internal goal, never in copy:** résumés made here get picked more than 50% of the time, measured by outcome tracking.
7. Keyword coverage on the tailored document, as a separate number from fit.
8. Cold email, then the LinkedIn fixer (reads `profiles.linkedin_text`).

## Session History

- **Pre-log** (up to 2026-06-27, commits `b6f309f`…`7b44846`) - Built the plugin: eight skills + commands, ATS rules, themeable HTML template, WeasyPrint PDF pipeline, plugin packaging, `INSTRUCTIONS.md`. Not recorded as dated sessions; see HANDOVER "Current state" and "Roadmap".
- **S1** (2026-09-19 → 09-22) - Built and deployed the web app: specs + mockup, `core/` extraction, Next.js/Neon/Kimi, test login, jobs, tailoring, cover letters; code-enforced anti-fabrication after an audit found 8 skills stuffed from a JD; gap and metric questions.
- **S2** (2026-09-24) - Market research (no competitor enforces anti-fabrication; "75% auto-rejected by ATS" is a 2012 sales pitch) → dropped the planned "80% guarantee", no auto-apply, pricing on hold. Built: fit score from verified evidence (`core/job-match.md` replaces gap-questions; spread 13 → 2 pts over 4 live rounds), AI disclosure, delete/applied, filler-phrase check, restored bullets, inline number flags, elapsed counters, `/ats-check`, hand-written .docx. 81 → 108 tests; not pushed.
- **S3** (2026-09-27 → 10-01) - Onboarding at `/start` from a résumé and/or LinkedIn (PDF or export zip via a hand-written zip/CSV reader); guided builder for people with neither (`core/resume-build.md`, answers as source, checked by `verifyTailoring`); then real accounts on Better Auth (email + password, Google, LinkedIn; user id fills `sid`), career basics, `/admin` with reset links (no domain yet for email; self-hosted BunMail rejected). 108 → 110 tests; 17 commits, not pushed.
- **S4** (2026-10-01) - Merged `main`, pushed, opened PR #3; Google OAuth client + Vercel env, Google sign-in working locally. Legal layer: proxy-enforced `/agree` clickwrap (Terms + Privacy, AI, 16+; version recorded), `/privacy` written against the code, `/terms`, `/help`, profile menu, `/settings` with data export and one-transaction account deletion, fonts self-hosted. Contact email and state wait on a rename. 110 → 117 tests; `a7d4b48` not pushed.
- **S5** (2026-10-16 → 10-17) - Competitor refresh (Sonnet subagent; prices unverified): still no rival checks for invented content; the table stakes we lack are a job tracker/extension, a LinkedIn optimizer and interview prep; recruiters distrust AI résumés. Owner wants every part improved; prompts are drafts; a 50% picked rate is the internal goal, never a claim. Built inline editing subagent-driven (spec → plan → 5 reviewed tasks → whole-branch review, which caught redirected saves showing "Saved"), clicked through live, merged (PR #5); auth switch + dark-mode fixes (PR #6); location/source dropdowns (held branch); the Workbench redesign ran in a parallel session (PR #7). 120 → 141 tests here, 178 after the redesign.
- **S6** (2026-10-17) - Public landing page at `/` for signed-out visitors (proxy exempts exactly `/`; scripted typing demo, use cases, integrations, plans); Codex review caught two over-claims (Google card on deployments without keys, "export any résumé"), both fixed; then purple became the app accent and the sidebar became a sticky top bar (`AppNav`, name top-right, tabs fold into the menu below 1024px). PR #9, 178 tests, not merged; the Pro card conflicts with zero monetization.
