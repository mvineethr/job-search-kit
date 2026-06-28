---
name: linkedin-rewrite
description: Rewrite a LinkedIn profile using a 5-step sequenced workflow grounded in the user's real target job descriptions and real metrics. Use when the user wants to audit, rewrite, or optimize their LinkedIn profile, headline, About section, experience bullets, featured section, skills, or wants a LinkedIn content/posting plan. Trigger on "LinkedIn rewrite", "fix my profile", "headline", "About section", "LinkedIn content plan".
---

# LinkedIn Rewrite Workflow

A sequenced, no-fabrication workflow for the LinkedIn *profile* (distinct from the resume
skills in this kit). Run the five steps **in order** — never collapse them into one
mega-prompt, which produces shallow, generic output for every section.

## Before starting — gather inputs
1. LinkedIn profile **PDF export** (Profile → Resources → Save to PDF).
2. **3–5 target job descriptions** (run `job-analyzer` on them if useful).
3. *(Optional)* a voice sample (`templates/voice-doc-template.md`).

If JDs are missing, say so and either wait or proceed with a clearly-flagged role
archetype — never silently pretend to have targets.

## Hard rules (every step)
- **Never invent metrics** — output `[METRIC NEEDED]` and collect a gap list.
- **Use the JDs' exact vocabulary.**
- **Diagnose before rewriting** (Step 1 first).
- **Mobile-first formatting** for profile copy: short lines, frequent breaks.
- Flag inconsistencies between the user's documents.

## The five steps (full prompts in `prompts/linkedin/`)
1. `01-brutal-audit.md` — diagnostic only (identity, keyword, credibility, search,
   one-line). Quote the user's actual lines back.
2. `02-headline-and-about.md` — 3 ranked headlines (≤120 chars) + 2 About versions
   (≤2000 chars, hook first, single CTA).
3. `03-experience-bullets.md` — `[verb]+[scope]+[outcome]+[impact]`, before/after,
   number or `[METRIC NEEDED]` in each.
4. `04-featured-and-skills.md` — Featured layout, top-3 pinned skills, missing-skill
   gaps, endorsement DM templates.
5. `05-content-plan.md` — 12-post, 4-week plan with hooks, angles, formats, questions.

## After the run
Compile all `[METRIC NEEDED]` gaps. Remind the user of the 24-hour rule: push live,
then iterate from real analytics.
