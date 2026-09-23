# Handover / Project Memory

Context for anyone (human or AI agent) picking this project up later. This file is
**public** — no personal data lives here. Personal job-search specifics are kept in a
local, gitignored notes file (see "Local notes" below).

_Last updated: 2026-09-22._ The standing dev brief (module map, hard rules, gotchas) is
`CLAUDE.md`; this file is the narrative.

## What this repo is

An open-source toolkit for fixing a résumé and LinkedIn profile with an AI agent. Each
capability is both an auto-triggered **skill** (`skills/<name>/SKILL.md`) and an explicit
**slash command** (`commands/<name>.md`). Works in Claude Code / Cowork.

Since September 2026 it is also a **web app** (`web/`, Next.js on Vercel + Neon + Kimi),
password-gated for testing, so people without a terminal-based AI agent can use it. The
plugin and the web app read the same prompts from `core/`.

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
- [x] **Hosted web app** (2026-09) — see the session entry above and `CLAUDE.md`.
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
