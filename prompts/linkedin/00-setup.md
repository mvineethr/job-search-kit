# Step 0 — Setup (under 3 minutes)

Do this once before running any prompt. The whole method lives or dies on two
inputs. Skip them and you get generic AI prose that could belong to anyone.

## What you need

1. **Your LinkedIn profile as a PDF.**
   On your profile, open **Resources → Save to PDF**, then download it.
   (Do *not* use a live-scraping connector. Exporting the PDF is dumber and works
   every time — it never breaks on private profiles, mobile sessions, or rate limits.)

2. **3–5 real job descriptions** for roles you actually want.
   Paste the full text of each into one file (`inputs/target-jds.md` — see the
   template in `/templates`). Imperfect targets still beat no targets: if the role
   barely exists yet (AI PM, agentic-ops, etc.), grab the closest 5 you can find.

3. *(Optional but recommended)* **A voice sample** — 3–5 of your best posts and
   one or two real emails — so the rewrite sounds like you, not like a ghostwriter.
   Template in `/templates/voice-doc-template.md`.

## How to run it

Open a fresh Claude chat (or, better, a Claude **Project** — see the README).
Attach the PDF and the JD file **before you type anything**.

Then run the five prompts **in order**, one at a time:

| # | Prompt | What it produces |
|---|--------|------------------|
| 1 | `01-brutal-audit.md`        | A no-flattery diagnostic of what's broken |
| 2 | `02-headline-and-about.md`  | New headline (3 ranked) + About (2 versions) |
| 3 | `03-experience-bullets.md`  | Before/after bullets + a list of metrics to fill |
| 4 | `04-featured-and-skills.md` | Featured layout + Skills/endorsement strategy |
| 5 | `05-content-plan.md`        | A 4-week posting plan to warm the feed |

## Two rules that make or break it

- **Sequence beats stacking.** Never ask Claude to redo every section in one mega-prompt.
  Output quality collapses. Run them in order so each step builds on the last.
- **Claude will not invent your numbers.** Anywhere it writes `[METRIC NEEDED]`,
  that's your homework — dig the real figure out of old reviews, dashboards, or
  Slack. A defensible "~40%" beats a vague verb; a fake number is worse than none.

## The 24-hour rule

Push the rewrite live within a day. You can iterate on a live profile; you can't
iterate on a draft rotting in your chat history. Done beats perfect.
