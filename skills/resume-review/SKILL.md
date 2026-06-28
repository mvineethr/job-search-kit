---
name: resume-review
description: Diagnose what is weak or broken in an existing resume — gaps, vague bullets, missing metrics, ATS parse risks, ordering and formatting problems. Read-only assessment; does NOT rewrite. Use when the user wants a resume critique, audit, "what's wrong with my resume", "review my resume", "why am I not getting callbacks", or a brutal honest assessment.
---

# Resume Review (diagnose, don't rewrite)

A no-flattery diagnostic of an existing resume. **Do not rewrite anything** — this skill
only finds problems. (Use `resume-improve` or `resume-tailor` to fix them.)

## Inputs
- The user's resume (PDF/DOCX/text).
- *(Optional)* target job descriptions — if given, run `job-analyzer` first and review
  against them. If not, review against general standards and say so.

## Read `${CLAUDE_PLUGIN_ROOT}/shared/ats-rules.md` and judge against it.

## Output — a scored diagnostic

1. **Verdict in one line** — would this resume pass a 6-second recruiter scan + an ATS
   parse? Yes/No and why.
2. **Identity** — what role this resume currently reads as vs. the target (if JDs given).
3. **Bullet quality** — quote the 3–5 weakest bullets verbatim and say why (no number,
   vague verb, no impact, responsibility-not-achievement).
4. **Metric coverage** — what % of bullets contain a real number. List the biggest
   missing-metric opportunities.
5. **ATS risks** — concrete parse problems (columns, tables, images, non-standard
   headings, abbreviations, fonts).
6. **Keyword gaps** — required JD terms absent from the resume (needs JDs).
7. **Formatting/length/ordering** — one page? reverse-chron? consistent dates?
8. **Top 5 fixes, ranked by impact.**

## Rules
- Quote the user's actual lines back. Do not soften.
- Flag inconsistencies (company names, dates, education) across documents.
- Never fabricate; where a metric is missing, say so rather than inventing one.
