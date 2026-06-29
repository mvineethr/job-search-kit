---
name: resume-tailor
description: Edit an existing resume to target a specific job description — reorder and rewrite to match the role's exact requirements and keywords for ATS, without fabricating experience. Use when the user pastes a JD and says "tailor my resume to this", "edit my resume for this job", "make my resume match this role", "optimize for this posting". Produces an ATS-safe PDF.
---

# Resume Tailor (one job at a time)

Re-aim an existing resume at a single target job. Read `${CLAUDE_PLUGIN_ROOT}/shared/ats-rules.md` first.

**Work from the user's "master resume"** (the stable role-level base from `resume-improve`)
and produce a **separate per-application copy** — never overwrite the master. This is the
per-application layer; the master resume and LinkedIn stay stable. Save tailored output as
`Company_Role_Resume.pdf` so each application has its own file.

## Inputs
- The user's master resume (or current resume).
- The target job description.

## Workflow

1. **Run `job-analyzer`** on the JD to get the requirements + literal keyword list.
2. **Coverage pass** — map the resume against the JD's must-haves. Mark each:
   covered / present-but-buried / missing.
3. **Tailor (truthfully):**
   - Rewrite the **summary** to mirror the role's identity and top 3 keywords.
   - **Reorder** bullets/skills so JD-relevant ones lead.
   - Rewrite bullets to use the JD's **exact vocabulary** (JD says "CI/CD" → write
     "CI/CD"), keeping `[verb]+[scope]+[outcome]+[impact]` and a number each.
   - Surface genuinely-relevant buried experience; **do not invent** anything the user
     hasn't actually done. If a required skill is truly absent, flag it as a real gap
     rather than fabricating it.
   - Add missing-but-true keywords into Skills.
4. **Show before/after** and a list of:
   - `[METRIC NEEDED]` gaps to fill.
   - **Honest gaps** — JD requirements the user genuinely lacks (so they decide
     whether to apply / how to address in a cover note).

## Output
- Tailored content section by section with before/after.
- Then render: fill `${CLAUDE_PLUGIN_ROOT}/shared/resume-html/resume-template.html`, run
  `python ${CLAUDE_PLUGIN_ROOT}/scripts/render_pdf.py <file>.html Company_Role_Resume.pdf`. **PDF only.**

## Rules
- Tailoring = reframing + reprioritizing **real** experience to match the JD. Never
  fabricate skills, tools, titles, dates, or metrics.
- Keyword matching is literal for ATS — match the JD's strings exactly.
