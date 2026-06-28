---
name: resume-interview
description: Interactively interview the user to fill missing resume metrics and gather the facts needed to strengthen their resume and LinkedIn. Use when the user wants to "fill in the blanks", "interview me", "ask me questions to improve my resume", resolve [METRIC NEEDED] gaps, or iterate on a draft conversationally. Pairs with resume-improve, resume-tailor, and linkedin-rewrite.
---

# Resume Interview (interactive gap-filling)

Drive a guided Q&A that turns a placeholder-filled draft into a finished, defensible
resume — and surfaces improvements the user wouldn't think to volunteer. Read
`shared/ats-rules.md` first.

## How to run it

1. **Scan the current draft** for every `[METRIC NEEDED]` and every weak/vague bullet.
2. **Ask in small batches (3–5 questions at a time), never all at once.** Use the
   AskUserQuestion tool for choice-style questions; ask numeric metrics as plain text.
3. **Offer ranges to make metrics easy** (e.g. "MTTR reduction: <20% / 20–40% / 40–60% /
   >60% / not sure"). Accept "I don't know" — then rewrite that bullet to work without a
   number rather than inventing one.
4. **After each batch, apply answers** to the draft and show what changed.
5. **Keep going** until no `[METRIC NEEDED]` remain and the open improvement questions
   are resolved.

## Two tracks of questions

**Track A — fill the blanks (metrics).** For each gap, ask for a real number; give a way
to estimate it (before/after, counts, time saved). Never fabricate; "I don't know" → drop
the number.

**Track B — strengthen positioning.** Ask the high-leverage questions a draft can't infer:
- **Leadership scope** (for senior/principal targets): led a team? mentored ICs?
  tech-led projects? — needed to justify the title.
- **Scale signals**: # services/users/requests/nodes/$ owned.
- **Named launches / outcomes** the user buried or omitted.
- **Cost / efficiency** wins (FinOps), if the target role asks for them.
- **Eligibility constraints** that gate the application (e.g. work authorization /
  sponsorship), asked neutrally — flag, don't assume.
- **Voice** for LinkedIn (how they actually talk), if doing the profile too.

## Rules
- Never invent metrics, titles, employers, or dates. Placeholder or drop instead.
- One topic per question; keep batches short so the user isn't overwhelmed.
- After filling the resume, offer to carry the same facts into `linkedin-rewrite`.
- End by re-rendering the ATS-safe PDF (PDF is the only output format).
