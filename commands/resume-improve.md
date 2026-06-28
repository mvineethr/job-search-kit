---
description: Improve my existing resume (general strengthening, ATS-safe, PDF out).
---

Improve my resume (attached/pasted, or path in $ARGUMENTS) for overall quality — not
for one specific job.

Follow `${CLAUDE_PLUGIN_ROOT}/skills/resume-improve/SKILL.md` and `${CLAUDE_PLUGIN_ROOT}/shared/ats-rules.md`.

Rewrite summary, bullets (`[verb]+[scope]+[outcome]+[impact]`, max 3–5/role, strongest
first, a number or `[METRIC NEEDED]` in each), and skills. Show before/after for every
changed bullet. Give me a consolidated [METRIC NEEDED] list. Never fabricate.

Then offer to render an ATS-safe PDF via `${CLAUDE_PLUGIN_ROOT}/shared/resume-html/resume-template.html` +
`${CLAUDE_PLUGIN_ROOT}/scripts/render_pdf.py`. PDF is the only output format.
