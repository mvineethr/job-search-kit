---
name: resume-build
description: Build a resume from scratch through guided intake when the user has no resume or wants to start over. Use when the user says "build my resume from scratch", "I don't have a resume", "start a new resume", "help me create a resume". Produces an ATS-safe PDF.
---

# Resume Build (from scratch)

Create a complete resume from nothing via a short structured interview, then render an
ATS-safe PDF. Read `shared/ats-rules.md` first.

## Step 1 — Intake (ask in small batches, not all at once)

Gather:
- Name, city/state, phone, email, LinkedIn URL.
- Target role/title (and a target JD if they have one — if so, run `job-analyzer`).
- For each job (newest first): title, company, location, start/end dates, and 3–6
  things they actually did — push for numbers (scale, %, $, users, team size, time).
- Education, certifications.
- Skills/tools they're fluent in.

Ask follow-ups specifically to surface metrics ("how many servers / users / how much
faster / how big was the team?"). This is where resume quality is won.

## Step 2 — Draft

- **Summary:** 2–3 lines, concrete, target-aligned.
- **Skills:** 2–3 comma-separated keyword lines.
- **Experience:** max 3–5 bullets per role, `[verb]+[scope]+[outcome]+[impact]`,
  strongest first, a number in every bullet (else `[METRIC NEEDED]`).
- **Education / Certifications.**
- Banned verbs/words per `shared/ats-rules.md`.

## Step 3 — Render PDF (only output format)

1. Fill `shared/resume-html/resume-template.html` with the content (duplicate the
   `.role` block per job).
2. Run `python scripts/render_pdf.py path/to/resume.html FirstLast_Resume.pdf`.
3. Tell the user to do the select-all/copy ATS check.

## Rules
- Never invent employers, dates, titles, or metrics. Use `[METRIC NEEDED]`.
- One page unless genuinely 10+ years of relevant experience.
