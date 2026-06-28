# Handover / Project Memory

Context for anyone (human or AI agent) picking this project up later. This file is
**public** — no personal data lives here. Personal job-search specifics are kept in a
local, gitignored notes file (see "Local notes" below).

_Last updated: 2026-06-27._

## What this repo is

An open-source toolkit for fixing a résumé and LinkedIn profile with an AI agent. Each
capability is both an auto-triggered **skill** (`skills/<name>/SKILL.md`) and an explicit
**slash command** (`commands/<name>.md`). Works in Claude Code / Cowork.

Core philosophy (applies to every capability):
1. **Diagnose before rewriting.**
2. **Anchor everything to real target job descriptions** (literal keyword matching).
3. **Never fabricate a metric** — emit `[METRIC NEEDED]` and make the user fill it.
4. **Résumé output is ATS-safe, single-column, PDF only.**

## How it was built (origin)

- The LinkedIn half adapts the 5-prompt method from Abhijay Arora Vuyyuru's *AI Action
  Letter #29* ("I rewrote my LinkedIn with 5 Claude prompts"). Credited in the README.
- The résumé half + ATS rules + PDF pipeline + skill/command packaging were added on top.
- It started as `linkedin-rewrite-kit`, then was renamed and expanded to `job-search-kit`.

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

- [ ] **More résumé UI templates** — modern-accent (ATS-safe), compact/dense (ATS-safe),
      and an optional two-column "designer" variant (NOT ATS-safe; humans only).
      Status: discussed, put on hold by user.
- [ ] **`recommendation-request` capability** — draft a personalized LinkedIn
      recommendation ask (distinct from the skill-endorsement DM already in linkedin
      prompt 4). Status: proposed, optional.
- [ ] **Sponsor-friendly job-filtering note** — guidance on checking H-1B/LCA history
      before applying, for users who need visa sponsorship. Status: proposed.
- [ ] **Non-tech field variants** — current examples lean SRE/DevOps/PM.

## How to continue

- To use the kit: see `README.md` (gather inputs → `/job-analyzer` → pick a résumé or
  LinkedIn capability → fill `[METRIC NEEDED]` → render PDF).
- To extend it: see `CONTRIBUTING.md`. Keep the no-fabricated-metrics rule and the
  one-job-per-skill structure intact.

## Local notes (not committed)

Personal, session-specific context (the résumé that was tailored, metrics gathered,
eligibility constraints, interview answers) is intentionally kept out of this public repo.
If you are continuing a personal job-search session, look for `inputs/SESSION_NOTES.local.md`
on the local machine — it is gitignored and never pushed.
