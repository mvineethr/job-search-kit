---
name: resume-improve
description: Take an existing resume and produce an improved version — stronger bullets, better summary, tighter ordering, ATS-clean formatting — without targeting one specific job. Use when the user says "improve my resume", "make my resume better", "punch up my bullets", "rewrite my summary". For job-specific tailoring use resume-tailor instead.
---

# Resume Improve (general strengthening)

Improve an existing resume for overall quality and ATS-safety, not for one specific JD.
(For one-job targeting, use `resume-tailor`.)

## Inputs
- The user's current resume. Optionally the output of `resume-review` if already run.

## Read `${CLAUDE_PLUGIN_ROOT}/shared/ats-rules.md` first.

## Workflow

1. **Summary** — rewrite the professional summary to 2–3 lines: what they do, scale,
   and strongest proof point. No "passionate/seasoned/results-driven".
2. **Experience bullets** — for each role, max 3–5 bullets in the form
   `[strong verb] + [scope/scale] + [measurable outcome] + [business impact]`
   (this is the STAR idea — Situation/Task compressed into scope, Action into the verb,
   Result into the metric). Lead each role with its strongest bullet.
   - Every bullet needs a number; where the user hasn't supplied one, output
     `[METRIC NEEDED]` and collect these into a gap list at the end.
   - Banned verbs: spearheaded, championed, drove alignment, leveraged synergies,
     owned the vision, delivered on.
3. **Skills** — group into 2–3 clean comma-separated lines of real keywords.
4. **Ordering/length** — reverse-chron, one page if <10 yrs, consistent date format.
5. **Show before/after** for each changed bullet so the user can choose.

## Output
- The improved content, section by section, with before/after for bullets.
- A consolidated **[METRIC NEEDED] gap list**.
- Then offer to render a PDF: fill `${CLAUDE_PLUGIN_ROOT}/shared/resume-html/resume-template.html` and run
  `python ${CLAUDE_PLUGIN_ROOT}/scripts/render_pdf.py <file>.html`. **PDF is the only output format.**

## Rules
- Never fabricate metrics, employers, dates, or skills.
- Preserve the user's real voice; improve clarity, don't inflate.
