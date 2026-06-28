---
description: Tailor my resume to a specific job description (ATS-safe, PDF out).
---

Tailor my resume to the target job description I provide (JD in $ARGUMENTS or
attached/pasted; also use my current resume).

Follow `${CLAUDE_PLUGIN_ROOT}/skills/resume-tailor/SKILL.md` and `${CLAUDE_PLUGIN_ROOT}/shared/ats-rules.md`.

1. Run job-analyzer on the JD.
2. Do a coverage pass (covered / buried / missing) against the must-haves.
3. Rewrite summary, reorder, and rephrase bullets using the JD's EXACT vocabulary,
   keeping `[verb]+[scope]+[outcome]+[impact]` and a number each.
4. Show before/after, a [METRIC NEEDED] list, and an HONEST GAPS list of requirements I
   genuinely lack. Never fabricate skills, tools, titles, dates, or metrics.

Then render an ATS-safe PDF (`${CLAUDE_PLUGIN_ROOT}/shared/resume-html/resume-template.html` +
`${CLAUDE_PLUGIN_ROOT}/scripts/render_pdf.py`). PDF only. Name it `Company_Role_Resume.pdf`.
