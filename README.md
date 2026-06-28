# Job Search Kit

An open-source toolkit for fixing your **résumé** and **LinkedIn** with an AI agent.
Clone it, point your agent at it, and invoke each capability as a **skill** (auto-triggered
by intent) or a **slash command** (explicit `/command`). Works with Claude Code and Cowork.

The philosophy throughout: **diagnose before rewriting, anchor everything to your real
target jobs, and never fabricate a number.** Wherever the agent lacks your data it emits
`[METRIC NEEDED]` instead of inventing one.

## Capabilities

Each is a standalone skill **and** a slash command.

| Capability | Skill / Command | What it does |
|---|---|---|
| **Job Analyzer** | `job-analyzer` | Parse a JD into requirements + literal ATS keywords. Feeds the résumé tools. |
| **Resume Review** | `resume-review` | Brutally honest diagnostic of an existing résumé. Read-only — finds problems, doesn't rewrite. |
| **Resume Improve** | `resume-improve` | Strengthen an existing résumé overall (bullets, summary, skills, ordering). |
| **Resume Build** | `resume-build` | Build a résumé from scratch via guided intake. |
| **Resume Tailor** | `resume-tailor` | Re-aim a résumé at one specific job, matching its exact keywords. |
| **Resume Interview** | `resume-interview` | Interactive Q&A that fills `[METRIC NEEDED]` gaps and probes for improvements. |
| **LinkedIn Rewrite** | `linkedin-rewrite` | The 5-step sequenced LinkedIn profile workflow. |

All résumé outputs render to a **single-column, ATS-safe PDF** (the only output format).

## Install / attach to your agent

**Claude Code / Cowork** — clone, then make the skills and commands discoverable:

```bash
git clone <your-fork-url> job-search-kit
cd job-search-kit
```

- **Skills:** copy (or symlink) the folders in `skills/` into your project's or user
  `.claude/skills/` directory — each `skills/<name>/SKILL.md` becomes an auto-triggered skill.
- **Commands:** copy the files in `commands/` into `.claude/commands/` — each becomes a
  `/<name>` slash command.

Or just keep the repo in your working folder and tell the agent: *"use the job-search-kit
skills in this repo."*

## How to use it

1. **Gather inputs** (see `templates/inputs-checklist.md`): your résumé, your LinkedIn PDF,
   and 3–5 target job descriptions.
2. **Analyze the target:** `/job-analyzer` on your JDs.
3. **Pick your move:**
   - No résumé yet → `/resume-build`
   - Have one, want the truth → `/resume-review`
   - Want it stronger generally → `/resume-improve`
   - Targeting one posting → `/resume-tailor`
   - Fixing LinkedIn → `/linkedin-rewrite`
4. **Fill every `[METRIC NEEDED]`** with a real, defensible number.
5. **Render the PDF** (résumé tools do this for you):
   ```bash
   pip install weasyprint        # or: pip install playwright && playwright install chromium
   python scripts/render_pdf.py shared/resume-html/resume-template.html FirstLast_Resume.pdf
   ```
6. **ATS self-check:** open the PDF, select-all → copy → paste into a text editor. If the
   text comes out in order with nothing missing, it'll parse.

## ATS rules

The single source of truth is [`shared/ats-rules.md`](shared/ats-rules.md) — single
column, standard headings, literal JD keywords, real selectable text, no tables/columns/
images, PDF only. Every résumé skill follows it.

## Repo layout

```
job-search-kit/
├── README.md  ·  LICENSE (MIT)  ·  CONTRIBUTING.md  ·  .gitignore
├── skills/                 # auto-triggered skills (one folder each)
│   ├── job-analyzer/        resume-review/      resume-improve/
│   ├── resume-build/        resume-tailor/      linkedin-rewrite/
├── commands/              # /slash-command wrappers (one .md each)
├── prompts/linkedin/      # the 5 sequenced LinkedIn prompts
├── shared/
│   ├── ats-rules.md        # shared ATS reference
│   └── resume-html/        # ATS-safe single-column HTML template
├── scripts/render_pdf.py  # HTML → PDF (WeasyPrint, Playwright fallback)
├── templates/             # inputs checklist + voice doc
└── examples/              # sample output
```

## Credit

The 5-prompt LinkedIn method is adapted from Abhijay Arora Vuyyuru's *AI Action Letter
#29*, ["I rewrote my LinkedIn with 5 Claude prompts"](https://abhijayvuyyuru.substack.com/p/i-rewrote-my-linkedin-with-5-claude).
This repo packages and extends that idea with a résumé toolkit, ATS rules, and a PDF
pipeline. Original framing credit to the author.

## License

MIT — see [`LICENSE`](LICENSE). Clone it, fork it, share it.
