---
name: job-analyzer
description: Parse one or more job descriptions into a structured requirements + keyword profile that other resume skills consume. Use when the user pastes a job description (JD) and wants it analyzed, wants to know what a role is really asking for, or before tailoring a resume to a specific job. Trigger on "analyze this job description", "what does this role want", "extract keywords from this JD", "what should I match".
---

# Job Analyzer

Turn a raw job description into a structured target the rest of the kit can optimize
against. Run this before `resume-tailor`.

## Input
One or more job descriptions (pasted text or a file). If multiple, analyze each and
also produce a combined view (terms shared across 3+ JDs are highest priority).

## Output (produce exactly these sections)

1. **Role identity** — one sentence: what this role actually is, beneath the title.
2. **Must-have hard requirements** — tools, languages, platforms, years, certs.
   Quote the JD's exact strings (e.g. "CI/CD", "Kubernetes", not "K8s").
3. **Nice-to-haves** — secondary signals.
4. **Keyword list for ATS** — flat, comma-separated, using the JD's literal wording.
   Mark which appear in 3+ JDs when multiple were given.
5. **Implied seniority & scope** — IC vs lead, team size, scale signals.
6. **What they're screening out** — red flags / disqualifiers implied by the JD.
7. **Coverage gaps** — if a resume was also provided, list required terms it is
   missing. Otherwise note "provide a resume to see coverage gaps."

## Rules
- Use the JD's exact vocabulary. Do not paraphrase tool names.
- Do not invent requirements that aren't in the text.
- Keep it scannable; this is a working artifact, not prose.

Hand this output to `resume-tailor` (or the user) to drive targeted edits.
