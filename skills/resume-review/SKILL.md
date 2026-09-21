---
name: resume-review
description: Diagnose what is weak or broken in an existing resume — gaps, vague bullets, missing metrics, ATS parse risks, ordering and formatting problems. Read-only assessment; does NOT rewrite. Use when the user wants a resume critique, audit, "what's wrong with my resume", "review my resume", "why am I not getting callbacks", or a brutal honest assessment.
---

# Resume Review (diagnose, don't rewrite)

Read and follow `${CLAUDE_PLUGIN_ROOT}/core/resume-review.md`. That file is the single source
of truth for this capability and is shared with the web app, so improvements to it reach both.

Where it says `{{ATS_RULES}}`, read `${CLAUDE_PLUGIN_ROOT}/core/ats-rules.md`.

## Additional instructions for Claude Code only

- Read the user's resume from the filesystem when they name a path; ask for it otherwise.
- *(Optional)* If the user supplies target job descriptions, run `job-analyzer` first and
  review against them. If they don't, review against general standards and say so.
- Present the prose verdict directly. You may render the findings as a readable list rather
  than as raw JSON — the JSON shape exists for the web UI, which anchors each finding to a
  section of the rendered document. There is no such UI here.
- Flag inconsistencies (company names, dates, education) across any documents you were given.
