---
description: Tailor my resume to a specific job description (ATS-safe, PDF out).
---

Tailor my resume to the target job description I provide (JD in $ARGUMENTS or
attached/pasted; also use my current resume).

Follow `skills/resume-tailor/SKILL.md` and `shared/ats-rules.md`.

1. Run job-analyzer on the JD.
2. Do a coverage pass (covered / buried / missing) against the must-haves.
3. Rewrite summary, reorder, and rephrase bullets using the JD's EXACT vocabulary,
   keeping `[verb]+[scope]+[outcome]+[impact]` and a number each.
4. Show before/after, a [METRIC NEEDED] list, and an HONEST GAPS list of requirements I
   genuinely lack. Never fabricate skills, tools, titles, dates, or metrics.

Then render an ATS-safe PDF (`shared/resume-html/resume-template.html` +
`scripts/render_pdf.py`). PDF only. Name it `Company_Role_Resume.pdf`.
