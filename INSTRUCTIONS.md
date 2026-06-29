# Instructions — How to Use Job Search Kit

A detailed, step-by-step guide. For a quick overview see `README.md`; for the project
vision/roadmap see `PLAN.md`.

---

## 0. What this kit does (30-second version)

It gives an AI agent (Claude Code / Cowork) a set of skills and slash commands to help you
**analyze jobs, build/improve/tailor your résumé, write cover letters, and rewrite your
LinkedIn** — grounded in real job descriptions, never fabricating numbers, and exporting
ATS-safe PDFs.

The mental model (read this once — it changes how you use everything):

- **Stable layer — set once, refresh quarterly:** your **LinkedIn** and your **master
  résumé**, optimized for your *target role family* using keywords shared across several JDs.
- **Per-application layer — do every time:** the **résumé you actually submit** and the
  **cover letter**, tailored to one specific job.

---

## 1. Prerequisites

- **Claude Code or Cowork** — an agent with a filesystem and shell. (A browser-only chat can
  draft text but can't render the PDF.)
- **Python 3** for PDF rendering. Install deps once:
  ```bash
  pip install -r requirements.txt
  ```
  (WeasyPrint; or the Playwright fallback noted in `requirements.txt`.)

---

## 2. Install (pick one)

**A. As a Claude Code plugin (recommended):**
```text
/plugin marketplace add mvineethr/job-search-kit
/plugin install job-search-kit@job-search-kit
```
Skills become namespaced: `/job-search-kit:resume-tailor`, `/job-search-kit:cover-letter`, etc.

**B. Local dev:**
```bash
git clone https://github.com/mvineethr/job-search-kit
claude --plugin-dir ./job-search-kit
```

**C. No install (Cowork):** keep the repo in your working folder and tell the agent
*"use the job-search-kit skills in this repo."*

Verify: run `/reload-plugins` (Claude Code) and check the skills appear under the
`job-search-kit` namespace.

---

## 3. Gather your inputs (once)

Put personal files in `inputs/` (it's gitignored — never committed). See
`templates/inputs-checklist.md`.

- **Your current résumé** (PDF or DOCX) — or skip if building from scratch.
- **3–5 target job descriptions** for the *same role family*, pasted into
  `inputs/target-jds.md`. Used to find the keywords that recur across the role.
- **A single target JD** for each specific application you tailor to.
- **Metrics scratchpad** — real numbers (%, $, counts, team size) to fill `[METRIC NEEDED]`.
- *(Optional)* `templates/voice-doc-template.md` filled in, so LinkedIn output sounds like you.

---

## 4. The capabilities (what each does + when)

| Command | Use it when | Output |
|---|---|---|
| `/job-analyzer` | You want to decode a JD into requirements + ATS keywords | Structured analysis |
| `/resume-review` | You want a brutally honest critique (no rewrite) | Diagnostic |
| `/resume-improve` | You want to strengthen your résumé overall → your **master résumé** | ATS PDF |
| `/resume-build` | You have no résumé / want to start over | ATS PDF |
| `/resume-tailor` | You're applying to one specific job | ATS PDF (per job) |
| `/resume-interview` | You want it to ask you questions to fill gaps + improve | Updated draft |
| `/cover-letter` | You need a cover letter for one job | ATS PDF + text |
| `/linkedin-rewrite` | You're optimizing your LinkedIn profile (role-level) | Profile copy |

---

## 5. Recommended end-to-end workflow

### Phase 1 — Build the stable layer (once)
1. `/job-analyzer` on your 3–5 target JDs → note the shared keywords.
2. `/resume-review` on your current résumé → see what's weak.
3. `/resume-improve` → produce your **master résumé**. Then `/resume-interview` to fill every
   `[METRIC NEEDED]` with real numbers.
4. `/linkedin-rewrite` → optimize your LinkedIn for the role family (run the 5 steps in order).
   Push it live within 24 hours; refresh quarterly, not per application.

### Phase 2 — Per application (repeat for each job)
5. `/resume-tailor` with that job's JD → a tailored **copy** of the master résumé
   (`Company_Role_Resume.pdf`). The master stays untouched.
6. `/cover-letter` with the same JD + company name → `Company_Role_CoverLetter.pdf`.
7. Submit. Keep résumé, cover letter, and LinkedIn factually consistent (same titles, dates,
   employers) — only emphasis/keywords change per job.

---

## 6. Rendering the PDF

The résumé/cover-letter skills do this for you, but to run it manually:
```bash
pip install -r requirements.txt
python scripts/render_pdf.py path/to/your.html OutputName.pdf
```
**Always do the ATS self-check:** open the PDF, select-all → copy → paste into a plain text
editor. If the text comes out in order with nothing missing, it'll parse.

---

## 7. Themes (so your output isn't identical to everyone else's)

The HTML templates (`shared/resume-html/`, `shared/cover-letter-html/`) expose a theme layer —
CSS variables for **accent color**, **font**, and **density** — with presets: **Classic**,
**Modern (navy/teal)**, **Compact**. Edit the `:root` block to switch. Use the *same* preset
for résumé and cover letter so they look like a set. Themes change only the look; the ATS-safe
structure never changes.

---

## 8. The non-negotiable rules (built into every skill)

- **Never fabricate** metrics, employers, titles, or dates → `[METRIC NEEDED]` instead.
- **Anchor to the real JD** and mirror its exact keywords (ATS matching is literal).
- **ATS-safe**: single column, standard headings, real text, no tables/columns/images, PDF out.
- **Diagnose before rewriting.**
- See `shared/ats-rules.md` for the full ruleset.

---

## 9. Troubleshooting

- **"PDF won't render"** → `pip install -r requirements.txt`; if WeasyPrint fails to install,
  use the Playwright fallback in `requirements.txt`.
- **Skill paths not resolving** → install it as a whole plugin (don't copy individual skill
  folders; they reference shared files via `${CLAUDE_PLUGIN_ROOT}`).
- **Skills don't show up** → run `/reload-plugins`, confirm the marketplace was added.
- **Résumé spills to 2 pages** → switch to the Compact theme preset, or trim to 3 bullets/role.
- **Output looks generic** → you didn't give enough real JDs or metrics. Feed more.

---

## 10. Privacy

`inputs/` and all `*.pdf` / `*.docx` are gitignored, so your résumé, JDs, and personal notes
never get committed. Keep personal files inside `inputs/`.
