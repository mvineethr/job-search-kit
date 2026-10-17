# Prompt test set: design

**Date:** 2026-10-16 · **Status:** approved in brainstorming, awaiting spec review

## Why

The prompts in `core/*.md` are early drafts, and the plan is to rewrite all of them so the app
beats competitors. A rewrite can only count as better if it's measured. This spec defines a fixed set of
fictional résumé and job pairs, a runner that sends them through the real prompts, and code that
scores the outputs, so two versions of a prompt can be compared side by side.

Internal goal, never in copy: résumés get picked more than half the time. Code can't measure
"picked", so the set measures what code can (invented content, coverage, filler, stability) and
gives the owner a blind side-by-side for the rest.

## Decisions (from brainstorming)

| Question | Decision |
|---|---|
| Judging quality | Code scores, plus a **blind A/B pick by the owner**. No model grading. |
| Runs per pair | **3** by default; `--runs` and `--only` to go cheaper while iterating. |
| Ground truth | Each pair lists **planted traps** and **supported keywords**, plus a rough fit band. No per-requirement labels. |
| Prompts covered | **tailor, cover letter, review, job match, parse**. Build and the two metric prompts are added when the rewrite reaches them. |
| Results | Raw outputs are gitignored. Each run's `summary.json` is small and is committed when it should become the baseline. |
| Verdict | **Hard gates** fail a version outright. Everything else is shown as before/after deltas for the owner to weigh. |
| Message building | **Move the route message builders into `lib/`** so the runner and the routes share them. |

## 1. Fixtures

Each pair lives in `web/evals/fixtures/<slug>/`:

| File | Contents | Used by |
|---|---|---|
| `resume.txt` | The résumé as someone would paste it: real-world mess (odd bullets, wrapped lines, inconsistent dates) | parse, review |
| `resume.json` | Hand-checked transcription of `resume.txt`, valid against `ResumeSchema` | tailor, letter, match (as the stored master) |
| `job.md` | First line `Company — Role`, then the posting | tailor, letter, match |
| `truth.json` | `{ supported: string[], traps: string[], fitBand: "low" \| "mid" \| "high" }` | scorers |

- `supported` lists terms from the posting that the résumé genuinely backs. The keyword-coverage metric
  checks these and nothing else, so coverage never rewards stuffing.
- `traps` lists skills or credentials from the posting that the résumé deliberately lacks. A trap
  must never appear in a tailored résumé or a letter, and must never be marked `met` or `partial` in a match.
- Every trap must be absent from `resume.txt`, and every `supported` term present, both case-insensitive.
  A Vitest test checks this so a fixture can't contradict itself.
- `resume.json` must keep every word of `resume.txt` that carries content. That makes it a fair input on its
  own, and it means tailoring scores never depend on how well parse did.

The 12 people, all fictional, with `@example.com` emails and `555` phone numbers:

1. **strong-fit**: SRE applying to an SRE role; most requirements met.
2. **weak-fit**: front-end developer applying to a data-engineering role.
3. **changer-teacher**: teacher moving into instructional design.
4. **changer-military**: logistics NCO moving into operations management.
5. **junior**: new graduate with internships only.
6. **senior**: staff engineer with 15 years and a long résumé (about 20 bullets).
7. **no-metrics**: duties-only bullets with no numbers anywhere.
8. **non-english**: non-English names, schools and employers, some with diacritics (e.g. "Universidade de São Paulo", "Nguyễn Thị Lan").
9. **gap-year**: two-year career gap, re-entering.
10. **non-tech**: registered nurse applying to a charge-nurse role (licences and certifications).
11. **keyword-stuffed-jd**: a posting listing ~40 tools; the résumé has 8 of them.
12. **no-summary**: no summary section (the case that once broke parsing).

`web/test/fixtures/priya.json` stays a unit-test fixture and isn't part of the set.

## 2. Shared message builders

Today the tailor, letter and review messages are assembled inline in `app/api/tailor/route.ts`,
`app/api/letter/route.ts` and `components/AssistantPanel.tsx`. Match already has `matchMessage` in
`lib/run-match.ts`. Each of these moves into one module, `lib/messages.ts`:

- `tailorMessage(resumeText, title, description, answersBlock)`
- `letterMessage(resumeText, title, description)`
- `reviewMessage(resumeText)` (the plain text, kept as a function so the format has one owner)
- `matchMessage`, moved here and re-exported from `run-match.ts` so existing imports keep working

The routes call these instead of building the strings inline, so their behaviour doesn't change.
Parse sends the raw text and needs no builder. The runner passes no skill answers (`answersBlock` is
empty), because answers are per person and the fixtures don't have any.

## 3. Runner

```
cd web
npm run eval -- --prompts tailor,letter --only junior,nurse --runs 3 --label v2-tailor
```

- `web/evals/run.ts`, run with `tsx --env-file=.env.local` (adds `tsx` as a dev dependency).
- For each prompt × fixture × run, it builds the message with the shared builder and calls
  `completeText({ system: loadPrompt(name), messages, tier })` on the same tier production uses
  (parse on `fast`, the rest on `primary`).
- **Before any call** it prints the plan (`5 prompts × 12 fixtures × 3 runs = 180 calls`) and the
  model names, then waits for `--yes` or an Enter keypress. `--dry-run` prints the plan and exits.
- Calls run one at a time. A failure (network, 4xx, timeout) is recorded as a failed run and the runner
  moves on; one bad call doesn't lose the rest. `degraded: true` (the fallback model answered) is
  recorded, and that run is marked as not comparable.
- Output: `web/evals/runs/<YYYY-MM-DD-HHmm>-<label>/`
  - `raw/<prompt>/<fixture>/<n>.txt`: the model's full text (gitignored).
  - `summary.json`: per prompt and fixture, each metric per run, its mean and its spread, plus
    the run's metadata (git SHA, a SHA-256 of each `core/*.md` used, model names, effort, timings,
    call count). It's small and meant to be committed.
- `web/evals/runs/*/raw/` goes in `web/.gitignore`.
- No keys are printed. The plan line shows model names only.

## 4. Scores

All scorers are pure functions in `web/evals/score.ts` that take `(output text, fixture)` and return
`{ gates: Record<string, boolean>, metrics: Record<string, number> }`. They reuse what already exists:
`extractJsonObject`/`extractJsonArray`, `ResumeSchema`, `verifyTailoring`, `numbersIn`,
`findGenericPhrases` + `bannedPhrases(loadAtsRules())`, `MatchOutputSchema`, `verifyEvidence`,
`matchSource`, `viewMatch`/the score arithmetic in `match.ts`, `parseFindings`, `LetterSchema`.

| Prompt | Hard gates (any false fails the version) | Metrics (shown as deltas) |
|---|---|---|
| **parse** | output parses to `ResumeSchema`; **invented words = 0** (content words in the output that aren't in `resume.txt`) | words lost (content words in `resume.txt` missing from the output); roles and bullets count vs `resume.json` |
| **tailor** | parses; after `verifyTailoring` against `resume.json`: **removed skills = 0, unsupported numbers = 0, unsupported employers = 0**; **no trap** appears anywhere in the output | supported-keyword coverage (share of `supported` present); `[METRIC NEEDED]` count; filler hits (posting words exempt, as in the app); bullet strength; bullets restored |
| **letter** | parses to `LetterSchema`; no trap in the paragraphs; no number that isn't in `resume.json` | filler hits; supported-keyword coverage; word count |
| **match** | parses to `MatchOutputSchema`; **no trap requirement marked met or partial** after `verifyEvidence` | fit score (computed with the app's arithmetic); score spread across runs; unverified quotes; fit band hit (score falls in `fitBand`'s range) |
| **review** | findings block parses (`parseFindings` returns ≥1) | finding count; severity mix; finding-count spread across runs |

Definitions:

- **Content words**: lowercased runs of letters and digits, 3+ characters (`\p{L}\p{N}`, so diacritics count),
  minus a short stopword list. One tokenizer is shared by parse and coverage.
- **Trap appears**: a case-insensitive, whole-word match of the trap term in the output's text. For
  match, a requirement counts as a trap when its `skill` or `text` contains the trap term.
- **Bullet strength**: the share of bullets that (a) start with a verb that isn't on the banned list
  (first word isn't banned and doesn't end in "ing"), and (b) contain a number or `[METRIC NEEDED]`.
  It's crude on purpose, and the blind pick covers what it misses.
- **Fit band**: taken straight from `band()` in `match.ts`. `high` = Strong fit (≥ 75), `mid` = Partial fit
  (50–74), `low` = Big gaps (< 50). The scorer calls `band()` and doesn't copy its cut-offs.
- **Fit score**: `viewMatch(match, [])`, so no answers are passed, the same as a person who hasn't answered anything yet.
- **Spread**: max minus min across runs.
- Every prompt also records the time taken and whether the call was degraded.

A gate failure in **any** run of **any** fixture fails that prompt version. The summary names the
fixture, the run and the gate.

## 5. Comparison

```
npm run eval:compare -- runs/2026-10-16-1200-baseline runs/2026-10-18-0900-v2-tailor
```

- `web/evals/compare.ts` reads two `summary.json` files and prints a markdown table per prompt:
  gates first (pass/fail before → after, plus the failing fixtures), then each metric's
  mean before, mean after and the change, with an arrow for "better" in that metric's direction.
  It also writes the table to `<new run>/compare.md`.
- If both runs have raw outputs, it writes `<new run>/blind/<prompt>/<fixture>.md`: one output from
  each version, labelled A and B at random. The key goes in `<new run>/blind/key.json`, which is
  gitignored with `raw/`. It covers a few fixtures per prompt (default 4, chosen by `--blind`), so the
  pick takes minutes rather than hours.
- Mismatched SHAs, models or efforts are printed as a warning above the table. Comparing across a
  model change is allowed but labelled.

## 6. Testing

- Vitest, under `web/test/evals/*.test.ts`, with **no model calls**:
  - each scorer against hand-written canned outputs (a clean one, one with a trap, one with an invented
    number, unparseable text),
  - fixture integrity (schema-valid `resume.json`, traps absent and `supported` present in `resume.txt`,
    `job.md` header),
  - the compare step on two small summaries, checking delta direction and gate reporting.
- `npm test` stays free and offline. Only `npm run eval` spends money.

## Out of scope

- Model-graded quality, recruiter simulation, outcome tracking (a later phase).
- The build, metric-questions and metric-fill prompts.
- Any change to the prompts themselves. That's the next step, measured against this set.
- CI integration. The runner costs money and is run by hand.

## Rules this keeps

- Fixtures are fictional and safe in a public repo. No real person's data.
- The fit score stays arithmetic from `match.ts`. The runner never asks a model for a score.
- Fabrication is checked with the same `verifyTailoring` the app enforces.
- Keys stay in `web/.env.local`, and the runner never prints them.
