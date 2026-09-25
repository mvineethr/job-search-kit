# CLAUDE.md — Job Search Kit dev brief

Standing brief for any AI agent working in this repo. Full history is in `HANDOVER.md`.
This repo is **public** (MIT) — never commit personal data, résumés, keys, connection
strings, or the test password.

## What this is

An open-source toolkit for fixing résumés and LinkedIn with AI. Two surfaces, one prompt
source:

1. **Claude Code plugin** — `skills/`, `commands/`, `prompts/linkedin/`, `shared/`,
   `scripts/render_pdf.py`. Installable via `.claude-plugin/`.
2. **Web app** — `web/` (Next.js), deployed on Vercel behind a shared test password.

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
docs/superpowers/        specs (design, UX architecture) and the Phase 1 plan
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
| `session.ts` / `cookie.ts` / `auth.ts` | shared password + HMAC-signed session cookie; `requireSid()` |
| `redirect.ts` | `redirectTo`, `backWithError` for form posts |

## Data model (Neon)

- `jobs(id, sid, company, role, description, analysis jsonb, questions jsonb, match jsonb, applied_at)`
  - `match` = verified requirements; the score is computed on render, never stored. `questions` is legacy (pre-match jobs only).
  - Deleting a job deletes its tailored résumés and letters. Masters can never be deleted.
- `resumes(id, sid, title, source_text, content jsonb, parent_id → resumes, job_id → jobs)`
  - master: `parent_id` null. Tailored: points at **both** master and job; master never modified.
  - For tailored rows, `source_text` holds JSON `{note, audit}`; older rows hold plain prose.
- `letters(id, sid, kind, job_id, resume_id, content jsonb)`
- `skill_answers(sid, skill_key, skill, level, detail)` — **per person, not per job**

## Hard rules

- **Every query filters by `sid`.** It is the only thing separating testers' data.
- **No tool calling.** Models return text/JSON; the server renders.
- **`core/` is the source of truth.** Change prompts there, never in a route. New capability = new `core/<name>.md` + add to `KNOWN` in `prompts.ts`.
- **Fabrication is enforced in code, not just prompts.** Tailored output must go through `verifyTailoring`. Unsupported skills are removed; numbers/employers are flagged, never silently rewritten.
- **Prompts never suggest a number** to the user.
- **Secrets only in `web/.env.local`** (gitignored) and the Vercel dashboard. Never print a key; scripts that need one read it and report lengths only.
- **Scan commits for key-shaped strings and `postgresql://user:pass@` before every push.**
- **Form posts redirect with `backWithError`,** never return raw JSON to a browser form.
- Design tokens in `web/app/globals.css` are fixed by the UX spec; spacing 4/8/12/16/24/32/48/64, type 12–28px, no gradients/emoji/"AI-powered" copy, no exclamation marks.

## Models (Moonshot Kimi, OpenAI-compatible)

| Tier | Env | Model | Used for |
|---|---|---|---|
| primary | `MODEL_PRIMARY_*` | `kimi-k3`, `MODEL_PRIMARY_EFFORT=low` | review, job match, tailoring, cover letter |
| fast | `MODEL_FAST_NAME` (shares primary URL/key) | `kimi-k2.7-code-highspeed` | parse, metric questions/fill |
| fallback | `MODEL_FALLBACK_*` | `kimi-k2.7-code-highspeed` | only on 429/5xx from primary |

Unset fast tier silently uses primary. Tailoring stays on primary: the fast model over-claimed
matches (found 2 gaps where k3 found 4). Base URL `https://api.moonshot.ai/v1`; check model ids
with `GET /v1/models` — `kimi-k3` reports `think_efforts` default `max`.

Other env: `DATABASE_URL` (Neon **pooled** string), `APP_PASSWORD`.

## Run / test / deploy

```bash
cd web && npm install && npm run dev      # needs web/.env.local
cd web && npm test                         # Vitest, 108 tests
cd web && npm run build                    # prebuild copies ../core first
```

- **Vercel:** Root Directory **`web`**, preset Next.js, default build command (a custom one skips `prebuild`). `main` deploys to production.
- `main` is checked out in the primary worktree, so from this worktree merge via a detached temp worktree: `git worktree add --detach <tmp> origin/main`, merge, `git push origin HEAD:main`, remove it.
- Timings (k3 low): review ~24s, parse ~17s (fast), tailor ~50s (~95s if it must parse first), cover letter ~30s, job match ~20–25s.

## Gotchas (found live)

- `Response.redirect()` returns **immutable headers** — can't add `Set-Cookie`. Build the 303 by hand (`redirect.ts`).
- Edge middleware can't import anything that pulls in `node:crypto`; keep `COOKIE_NAME` alone in `cookie.ts`.
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
- `core/ats-rules.md` headings carry text after the name (`## Banned (these tank…)`) and the file is CRLF on Windows. Parsers of it must allow both.

## Status

**Live (test build):** login, add résumé (paste/PDF → parsed), streaming review with anchored
findings, jobs hub, fit score with evidence and hard-filter warnings (`/jobs/[id]`), questions
from the match, tailoring with audit panel, cover letters with facts/gaps, metric questions,
filler-phrase check, AI disclosure at sign-in, delete jobs/tailored copies, applied flag,
print-to-PDF, Word (.docx) download, "what an ATS sees" PDF check (`/ats-check`),
dropped bullets restored word for word, unsupported numbers marked inline, elapsed-time counters.

**Not built:** cold email, LinkedIn (two modes designed), interview prep (mocked up), inline
résumé editing, real accounts, MCP server. Pages exist as honest "Not built yet" placeholders.

**Known weaknesses:** no in-app editing, so flagged numbers, filler phrases and restored
bullets can only be fixed by re-tailoring or after export; restored bullets go at the end of
their role, not in their original position; the ATS check uses one extractor (unpdf), and real
ATSs vary.

## Next

1. Click-through test of everything above on the live site (not yet seen in a signed-in browser).
2. Inline résumé editing: every check we add points at text the person cannot yet change.
3. Keyword coverage on the tailored document (literal posting terms present), as a separate number from fit.
4. Cold email, then LinkedIn.
5. Real accounts (Google sign-in) to replace the shared password.
6. Consider PRs + Vercel preview deploys instead of merging straight to `main`.

## Session History

- **Pre-log** (up to 2026-06-27, commits `b6f309f`…`7b44846`) - Built the plugin: eight skills + commands, ATS rules, themeable HTML template, WeasyPrint PDF pipeline, plugin packaging, `INSTRUCTIONS.md`. Not recorded as dated sessions; see HANDOVER "Current state" and "Roadmap".
- **S1** (2026-09-19 → 09-22) - Built and deployed the web app: specs + mockup, `core/` extraction, Next.js/Neon/Kimi, test login, jobs, tailoring, cover letters; code-enforced anti-fabrication after an audit found 8 skills stuffed from a JD; gap and metric questions.
