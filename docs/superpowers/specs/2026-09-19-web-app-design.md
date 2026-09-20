# Job Search Kit — Web App Design

**Date:** 2026-09-19
**Status:** Approved design, not yet implemented

## Problem

The kit works only for people who already run Claude Code or Cowork, can clone a repo,
and have Python installed. That is a tiny audience. The workflows themselves are the
valuable part and they are locked behind a developer toolchain.

A hosted website removes every prerequisite: no install, no key, no Python. The user
uploads a résumé, picks a capability, and gets a PDF.

## Goal

Ship all eight capabilities as a web app, free during a demo phase, with accounts and
saved work so that charging later is a config change rather than a rewrite.

Non-goal for v1: payments, teams, mobile apps, job scraping, auto-apply.

## Core principle: one content source, three surfaces

The workflow content stays the single source of truth and is consumed by every surface:

```
core/<capability>.md          ← the substance, agent-agnostic
├── skills/<name>/SKILL.md    ← Claude Code plugin (exists today)
├── web harness               ← the website (this spec)
└── MCP server                ← later, free, a distribution funnel
```

Today's `SKILL.md` files mix substance with agent-specific mechanics —
`${CLAUDE_PLUGIN_ROOT}` paths, "run `render_pdf.py`", filesystem assumptions. Those
cannot serve as web system prompts directly.

So the first implementation step is the "portable core + thin adapters" refactor already
on the roadmap in `PLAN.md`: move the substance into `core/`, leave agent mechanics in the
thin adapter above it. The website consumes `core/` unchanged. A prompt improvement then
lands on all three surfaces in one commit.

## Architecture

```
Next.js on Vercel (app + API routes, one deployment)
├── /                    eight entry points → one shared chat UI
├── /api/chat            the harness: core/<cap>.md as system prompt,
│                        streams from Kimi, falls back on 429/5xx
├── /api/render          résumé JSON → ATS-safe HTML
├── Neon                 Postgres: users, résumés, runs, usage
└── Better Auth          Google OAuth, tables in Neon, code in repo
```

**No file storage.** Uploads are parsed to text on arrival and the original discarded.
Résumés persist as JSON; PDFs regenerate on demand because rendering is deterministic.
No bucket, no vendor, nothing extra to secure.

**No servers.** Vercel functions only. Fly/Railway/containers are not needed and would add
ops for no gain.

### The harness

One function, not eight. It selects the core markdown file by route, prepends it as the
system prompt, appends conversation history, and streams the reply.

The difference between `resume-review` and `resume-tailor` lives entirely in markdown.
Zero branching in code. Adding a ninth capability means adding a markdown file and a route.

### No tool calling, anywhere

For any flow ending in a document, the model's final message is structured résumé JSON.
The server turns JSON → HTML → PDF in plain code.

Three reasons this matters:

1. **Fallback models only have to emit text.** A free-tier model with weak tool support
   cannot break the PDF step, because there is no tool step.
2. **Output is diffable and re-renderable** without paying for another model run.
3. **ATS safety is enforced by the template,** not trusted to the model. The single-column
   structure in `shared/ats-rules.md` becomes a code guarantee rather than an instruction
   the model might drift from.

### PDF rendering

v1 renders HTML and uses the browser's print pipeline. The output is real selectable text,
which is the only thing ATS parsing requires, at zero infrastructure cost.

*Simplification with a known ceiling:* mobile browsers print inconsistently, and there is
no server-side PDF to email or store. Upgrade path is serverless Chromium behind
`/api/render` — a contained change, since the JSON → HTML step is already server-side.

### Model routing

Kimi K2 primary over the OpenAI-compatible API shape. Base URL and model name in env vars,
so swapping providers is configuration.

Free tiers fire **only** on 429/5xx, never as primary. When a run is served by a fallback,
the UI says so plainly — a user is owed an explanation for degraded output.

Every run logs token counts and which provider served it, so real cost per user is measured
rather than estimated.

### Streaming

Responses stream token-by-token. This is both better UX and what keeps generation inside
Vercel's 60s function limit. A flow that genuinely needs minutes would need a queue; none
currently does.

## Data model

| Table | Holds |
|---|---|
| `users` | Better Auth's tables (Google OAuth identity) |
| `resumes` | résumé JSON per user, versioned; master vs tailored copies |
| `runs` | capability, timestamp, tokens, provider, cost |
| `usage` | per-user monthly run count against quota |

`runs` and `usage` exist from day one even though nothing is charged yet. The quota **is**
the billing meter — enabling payments later raises a number rather than adding a subsystem.

### Personal data obligations

Résumés are personal data. Built in, not retrofitted:

- encrypted at rest (Neon provides this)
- a working delete-my-account path that actually removes résumés and runs
- a privacy policy stating what is stored, for how long, and that content is sent to a
  model provider
- uploaded files discarded after parsing, never persisted

## The two interactive flows

`resume-build` and `resume-interview` are multi-turn Q&A by nature. They are the reason the
harness is a chat loop rather than a form-submit.

This is a simplification, not a complication: once a chat loop exists for two flows, the
other six ride on it for free. All eight become entry points into one engine.

Cost consequence: chat turns resend context, so a ten-turn intake runs roughly 10–15¢
against a single-shot run's 2–3¢. Acceptable.

## Cost

| | Demo phase | When charging |
|---|---|---|
| Vercel | Hobby, $0 | Pro, $20/mo (Hobby forbids commercial use) |
| Neon | free tier | free tier, likely for a long while |
| Better Auth | free, it is a library | free |
| Model | ~2–3¢ per single-shot run | same, and it is the dominant line item |

A thousand demo runs costs roughly $25. Infrastructure is not the expense; inference is.

## Testing

- **Render pipeline:** golden-file test — fixed résumé JSON renders to expected HTML.
  Deterministic, so it either matches or the template regressed.
- **Harness:** one test per capability asserting the right core file loads and that a
  document-producing flow returns parseable JSON.
- **Fallback:** force a 429 from the primary, assert the fallback serves the run and the
  response is flagged degraded.
- **Quota:** assert a user over quota is refused server-side, not merely hidden in the UI.

No framework beyond what Next.js ships with.

## Sequencing

1. `core/` refactor — extract substance from the eight `SKILL.md` files
2. Harness + chat UI, one capability end to end (`resume-review`, no PDF needed)
3. JSON → HTML → PDF render path
4. Remaining seven capabilities (markdown plus a route each)
5. Better Auth, Neon, saved résumés
6. Quota and run logging
7. Deploy, use it personally, then show people

Payments and the MCP server come after the site has real users. The MCP server is free
forever and exists as a funnel, not a revenue line — there is no billing rail in MCP and
the content is MIT-licensed and public, so nobody will pay for access to prompts they can
clone.

## Honest risks

- **The market is crowded.** Teal, Rezi, Kickresume, Enhancv. The prompts are not a moat —
  they are public and MIT-licensed. Distribution decides this, not features.
- **Scope.** Eight flows is weeks of evenings, most of it UI for the interactive intakes.
  Step 2 in the sequencing exists so there is something real and shippable early.
- **The model is the cost.** Free usage stops being affordable in the low thousands of
  runs. The quota exists from day one for this reason.
