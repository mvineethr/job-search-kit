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

## Requirements

- **An agent with a filesystem and shell** — Claude Code or Cowork. The résumé skills run
  a script to produce the PDF, so a plain browser chat (no shell) can do the *writing* but
  **cannot render the PDF**.
- **Python 3** with the rendering deps: `pip install -r requirements.txt`
  (WeasyPrint; or the Playwright fallback — see `requirements.txt`).

The LinkedIn prompts and all the *text* work need none of the above; only PDF rendering does.

## Install

This repo is a self-contained **Claude Code plugin** and a single-plugin **marketplace**,
so it installs as one unit (don't cherry-pick individual skill folders — internal paths
resolve via `${CLAUDE_PLUGIN_ROOT}` and only work when installed whole).

**Option A — install as a plugin (recommended):**

```text
/plugin marketplace add mvineethr/job-search-kit
/plugin install job-search-kit@job-search-kit
```

Skills are then namespaced, e.g. `/job-search-kit:resume-review`, `/job-search-kit:resume-tailor`.

**Option B — load locally for development:**

```bash
git clone https://github.com/mvineethr/job-search-kit
claude --plugin-dir ./job-search-kit
```

**Option C — no install:** keep the repo in your working folder and tell the agent
*"use the job-search-kit skills in this repo"* (works in Cowork, paths resolve against the repo root).

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
   pip install -r requirements.txt
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
├── .claude-plugin/        # plugin.json manifest + marketplace.json
├── requirements.txt       # PDF rendering deps (WeasyPrint, pypdf)
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

## What's original here

This kit is **not** a copy of someone's prompt list. The bulk of it is original work:

- A full **résumé toolkit** — `resume-review` (diagnostic), `resume-improve` (general
  strengthening), `resume-build` (from scratch via guided intake), `resume-tailor`
  (targeted to one JD), and `resume-interview` (interactive gap-filling) — none of which
  come from any external source.
- A `job-analyzer` that turns job descriptions into structured ATS keyword profiles.
- A shared **ATS ruleset**, an ATS-safe single-column **HTML résumé template**, and an
  **HTML→PDF rendering pipeline** (`render_pdf.py`).
- **Skill + slash-command packaging** and a **Claude Code plugin** so it installs and runs
  as one unit.
- A design philosophy enforced across every capability: diagnose before rewriting, anchor
  to real job descriptions, and never fabricate a metric (`[METRIC NEEDED]`).

### Acknowledgment

One component — the **LinkedIn profile** workflow (`linkedin-rewrite`, in
`prompts/linkedin/`) — adapts a 5-prompt sequencing idea from Abhijay Arora Vuyyuru's
*AI Action Letter #29*, ["I rewrote my LinkedIn with 5 Claude prompts"](https://abhijayvuyyuru.substack.com/p/i-rewrote-my-linkedin-with-5-claude).
That method (an uncopyrightable idea) informed one of the seven capabilities; the prompts
were rewritten and the rest of the kit is independent. Credited here out of good practice.

## License

MIT — see [`LICENSE`](LICENSE). Clone it, fork it, share it.
