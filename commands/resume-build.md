---
description: Build a resume from scratch via guided intake (ATS-safe, PDF out).
---

Build me a resume from scratch.

Follow `${CLAUDE_PLUGIN_ROOT}/skills/resume-build/SKILL.md` and `${CLAUDE_PLUGIN_ROOT}/shared/ats-rules.md`.

Interview me in small batches to collect contact info, target role, each job (title,
company, dates, what I did — push hard for numbers), education, certs, and skills. If I
give a target JD, run job-analyzer first.

Draft summary + skills + experience (`[verb]+[scope]+[outcome]+[impact]`, number or
`[METRIC NEEDED]` each) + education/certs. Never invent employers, dates, or metrics.

Then fill `${CLAUDE_PLUGIN_ROOT}/shared/resume-html/resume-template.html` and render with
`${CLAUDE_PLUGIN_ROOT}/scripts/render_pdf.py` to a single-column ATS-safe PDF (only output format).
