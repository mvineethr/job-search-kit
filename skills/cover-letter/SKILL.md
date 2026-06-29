---
name: cover-letter
description: Write a tailored, one-page cover letter for a specific job — hook, value-match, proof, and close — grounded in the user's real resume and the job description, never fabricating metrics or flattery. Use when the user asks for a cover letter, "write a cover letter", "cover letter for this job", or a letter of interest. Produces a PDF.
---

# Cover Letter

Write a focused, one-page cover letter tailored to a single job. Read
`${CLAUDE_PLUGIN_ROOT}/shared/ats-rules.md` first (same no-fabrication and keyword rules apply).

## Inputs
- The user's resume (the tailored one for this job is ideal; otherwise the master).
- The target **job description** (run `job-analyzer` on it if not already done).
- **Company name**, and if available: a specific company achievement/challenge, recent
  news, or stated values. Ask for these if missing — they make the difference between a
  real letter and a generic one.
- Hiring manager name if known (address them directly; otherwise a clean "Dear [Company]
  Hiring Team").

## Structure (4 short paragraphs, ~250–350 words, one page)

1. **Opening hook** — open with genuine, specific interest: reference a real
   `[Company]` achievement, product, or challenge, and bridge naturally to why the user is
   a fit. Curiosity → connection → what they'd contribute. **No flattery, no "I am writing
   to apply for…".**
2. **Value match** — pull the **top 3 needs** from the JD and match each to a specific
   accomplishment from the resume, with real metrics. Use the JD's exact vocabulary.
3. **Proof** — one concrete situation → action → outcome that demonstrates the most
   relevant capability (show, don't claim). If the user is changing fields, frame the
   transition as deliberate and connect past experience to the role's needs here.
4. **Close** — brief alignment with the company's direction/values (specific, not generic
   enthusiasm), a confident-but-humble sign-off, and a clear next step.

## Hard rules
- **ATS format (same as the résumé):** single column, standard fonts, real selectable
  text, no tables/columns/images/text-boxes/page-headers. Follow `${CLAUDE_PLUGIN_ROOT}/shared/ats-rules.md`.
  Many systems parse the cover letter too — keep it as clean as the résumé.
- **Never fabricate** metrics, employers, projects, or relationships. Missing number →
  `[METRIC NEEDED]`, or write the sentence without it.
- **Match the resume facts** exactly (titles, dates, employers) — the letter and resume
  must agree.
- **No flattery and no generic enthusiasm** ("I'm passionate about…", "world-class team").
  Specifics only. Avoid the banned words/verbs in `${CLAUDE_PLUGIN_ROOT}/shared/ats-rules.md`.
- One page. Tight paragraphs. Plain, direct voice.

## Output (PDF)
1. Fill `${CLAUDE_PLUGIN_ROOT}/shared/cover-letter-html/cover-letter-template.html`
   (it shares the résumé theme variables, so it visually matches the résumé).
2. Render: `python ${CLAUDE_PLUGIN_ROOT}/scripts/render_pdf.py <file>.html Company_Role_CoverLetter.pdf`.
3. Also show the plain text in chat so the user can paste it into application forms/email.
