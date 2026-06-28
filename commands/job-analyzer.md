---
description: Analyze a job description into a structured requirements + ATS keyword profile.
---

Analyze the job description(s) I provide (in $ARGUMENTS or attached/pasted).

Follow the `job-analyzer` skill in `${CLAUDE_PLUGIN_ROOT}/skills/job-analyzer/SKILL.md`. Output exactly:
role identity, must-have requirements, nice-to-haves, ATS keyword list (literal JD
wording), implied seniority/scope, what they screen out, and coverage gaps vs my
resume if I provided one.

Use the JD's exact vocabulary. Do not invent requirements.
