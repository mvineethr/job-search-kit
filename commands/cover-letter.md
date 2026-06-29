---
description: Write a tailored one-page cover letter for a specific job (PDF + text).
---

Write a one-page cover letter for the job I provide (JD in $ARGUMENTS or attached; also use
my resume and the company name).

Follow `${CLAUDE_PLUGIN_ROOT}/skills/cover-letter/SKILL.md` and
`${CLAUDE_PLUGIN_ROOT}/shared/ats-rules.md`.

Ask me for the company name and any specific company achievement / recent news / values if I
haven't given them — those make it non-generic. Run job-analyzer on the JD first.

Structure: opening hook (specific, no flattery) → value match (top 3 JD needs ↔ my real
achievements with metrics) → one situation-action-outcome proof → close (specific values
alignment + clear next step). Never fabricate; missing numbers become [METRIC NEEDED]. Keep
it consistent with my resume facts.

Output a PDF via `${CLAUDE_PLUGIN_ROOT}/shared/cover-letter-html/cover-letter-template.html`
+ `${CLAUDE_PLUGIN_ROOT}/scripts/render_pdf.py`, and also paste the plain text in chat.
