# Project Plan / PRD — Job Search Kit

> Internal planning doc (vision, scope, roadmap). Not user-facing usage — see
> `INSTRUCTIONS.md` for the full step-by-step guide, `README.md` for the overview, and
> `HANDOVER.md` for session-by-session memory.

## Vision

An **agent-agnostic** toolkit that any AI agent — Claude Code, Cowork, Hermes, or others —
can plug into to help a person **build, improve, tailor, and ship their résumé and LinkedIn**.
You connect it to your agent, and it does your résumé/LinkedIn work for you, grounded in
real job descriptions and your real accomplishments.

This is an **early phase (v0.x)**. The method for the LinkedIn workflow was *inspired by*
a public post (credited in the README); everything else — the résumé toolkit, job analyzer,
ATS ruleset, HTML/PDF pipeline, theming, packaging, and the two-tier strategy — is original.

## Principles (non-negotiable)

1. **Never fabricate.** Missing numbers become `[METRIC NEEDED]`, never invented.
2. **Diagnose before rewriting.**
3. **Anchor to real job descriptions** (literal keyword matching for ATS).
4. **ATS-safe by default** for résumés (single column, real text, PDF out).
5. **Two-tier strategy:** LinkedIn + master résumé are role-level and stable; the submitted
   résumé is job-level and tailored. Keep all three factually consistent.

## Current capabilities (v0.1)

- `job-analyzer`, `resume-review`, `resume-improve`, `resume-build`, `resume-tailor`,
  `resume-interview`, `linkedin-rewrite`, `cover-letter`.
- Shared ATS ruleset, themeable ATS-safe HTML résumé template, HTML→PDF pipeline.
- Packaged as a Claude Code plugin + marketplace.

## Roadmap

### Near term
- [ ] **Output variety / theming** — so users of the same repo don't all produce an
      identical-looking résumé. Approach: one ATS-safe structure + a theme layer (CSS
      variables: accent color, font family, density) with named presets (Classic, Modern,
      Compact). Started in v0.1; extend with more presets and an optional second layout.
- [x] **Cover letter** capability (`cover-letter`).
- [ ] Medium/low fixes from the audit: `examples/*.pdf` gitignore exception,
      `inputs/.gitkeep`, refreshed `CONTRIBUTING.md`, a CI check that renders the example.

### Toward true agent-agnosticism (later phase)
- [ ] **Portable core + thin adapters.** Today the skills/commands use Claude-Code
      conventions (`${CLAUDE_PLUGIN_ROOT}`, plugin manifest). To run on *any* agent, refactor
      so the substance (ATS rules, workflows, prompt content) lives as plain, tool-agnostic
      Markdown in a `core/`, with thin per-agent adapters on top:
      - Claude Code plugin (exists)
      - Plain-prompts folder (copy/paste into any chat)
      - Optional MCP server exposing the workflows as tools
- [ ] Non-tech-field variants (current examples lean SRE/DevOps/PM).
- [ ] JSON-driven résumé generation (`resume.json` → HTML) to reduce hand-editing.

### Possible future capabilities
- [ ] `recommendation-request` (LinkedIn written recommendation ask).
- [ ] `interview-prep` from a JD.
- [ ] Sponsor-friendly job-filtering guidance (H-1B/LCA history checks).
- [ ] Outreach / referral-mapping helpers.

## Non-goals (for now)

- Auto-applying to jobs or scraping recruiter data.
- Non-PDF résumé outputs as the default (PDF stays primary for ATS).
- Fancy multi-column "designer" résumés as the default (offered only as a clearly-labeled,
  non-ATS option if added later).
