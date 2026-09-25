# Match score — spec

**Status:** built · 2026-09-24. Decisions: gap questions replaced; bands and weights as below.

**Acceptance run** (`kimi-k3` low, `priya.json`, 3 runs each, after the fixes noted):

| Posting | Scores | Unverified evidence reaching UI | Time |
|---|---|---|---|
| Staff SRE (strong fit) | 81, 79, 79 | 0 | 19–21s |
| Senior Data Engineer (weak fit) | 17, 17, 17 | 0 | 23–25s |

The first runs spread 73–86. Two causes, both fixed: "Prometheus and Grafana" was split in
some runs and merged in others (the prompt now fixes the rule: "and" splits, "or" doesn't),
and the model didn't know today's date, so "Present" was counted inconsistently (`TODAY:` is
now in the message). Years evidence across several roles ("Jun 2019 – Present") is accepted
when both ends of the span are on the résumé.

## What it is

When a job is added, the person sees how well their **master résumé** shows what the
posting asks for, *before* anything is tailored. One score, a list of the posting's
requirements with what was found for each, and a separate warning for hard
requirements that screen people out.

It measures **the person against the posting**, not the wording of a document. That is
the difference from every competitor: Jobscan, Rezi and the rest score keyword overlap,
so the score goes up when you paste in keywords. Here the score can only go up when real
evidence appears, either on the résumé or in an answer the person gives.

What it is **not**: a prediction of interviews. The page says so in plain words (see
Copy). No "ATS pass rate", no percentages of being "picked".

## Flow

```
Add job ──► match analysis (one model call) ──► job page: score + requirements
                                                     │
                            requirements not shown ──┴──► questions ──► answers
                                                                          │
                                   score recomputed in code, no model call ◄┘
                                                     │
                                                  Tailor
```

The match call **replaces** the gap-questions call on add-job. Questions become the
requirements the résumé doesn't show, so the questions asked and the gaps scored are
always the same list. That is one model call instead of two, and it removes a way for
them to disagree.

## Model output — `core/job-match.md`

A new prompt, added to `KNOWN` in `prompts.ts`. Input: master résumé (JSON or text) and
the posting. Output: one fenced `json` block:

```json
{
  "requirements": [
    {
      "id": "terraform",
      "skill": "Terraform",
      "text": "3+ years with Terraform or similar IaC",
      "kind": "must",
      "category": "skill",
      "status": "missing",
      "evidence": "",
      "question": "The posting asks for Terraform. Have you used it at work?",
      "why": "Your résumé mentions CloudFormation but not Terraform."
    }
  ]
}
```

| Field | Values | Notes |
|---|---|---|
| `kind` | `must` \| `nice` | From the posting's own wording ("required" / "preferred", "bonus"). Unclear → `must`. |
| `category` | `skill` `experience` `years` `education` `certification` `authorization` `location` `other` | The last five plus `years` are **hard filters**. |
| `status` | `met` `partial` `missing` `unknown` | `unknown` only for things a résumé normally doesn't state: work authorization, relocation, clearance, travel. |
| `evidence` | a quote copied **exactly** from the résumé | Required for `met` and `partial`. Empty otherwise. |
| `question`, `why` | as in `gap-questions.md` today | Only on `missing`/`partial` items in `skill`/`experience` categories. At most 8. |

Prompt rules (carried over from `gap-questions.md` and `resume-tailor.md`):
- One requirement per item. Split "Kubernetes and Helm" into two.
- `evidence` is copied, never paraphrased. *The code checks it; a quote that isn't in the
  résumé counts as not shown.*
- Near-synonyms count as `partial`, not `met` (CloudFormation for Terraform).
- For `years`, quote the date lines the count comes from. Never estimate from vibes.
- No numbers suggested to the person, no flattery, no exclamation marks.

Tier: **primary** (`kimi-k3`, low effort). Tailoring showed the fast model over-claims
matches. The evidence check below guards against that anyway, so switching to `fast`
later is a measurement, not a leap of faith.

## Enforced in code — `lib/match.ts`

Pure functions, unit-tested like `verify-tailoring.ts`:

1. **Verify evidence.** For every `met`/`partial`, the normalised `evidence`
   (lowercase, collapsed whitespace, punctuation stripped) must be a substring of the
   normalised source. Source = the master résumé's text **including dates**. Today's
   `sourceText()` leaves out role dates, so either extend it or build the source here.
   Unverified → downgraded to `missing`, and counted so we can see how often the model
   invents evidence.
2. **Apply answers.** A requirement whose `skillKey(skill)` matches a saved answer
   takes its status from the answer: `solid`/`deep` → `met` (evidence = the answer's
   detail), `some` → `partial`, `none` → `missing`. Answers are per person, so answering
   once moves the score on every job that asks for it.
3. **Score.**
   - weight: `must` = 3, `nice` = 1
   - credit: `met` = 1, `partial` = 0.5, `missing` = 0
   - `unknown` is left out of both sides
   - `score = round(100 × Σ weight·credit / Σ weight)`
4. **Hard-filter flags.** Any `must` in a hard-filter category that is `missing` →
   a warning shown above the score, whatever the score is. Any `unknown` → a "check
   this yourself" line (e.g. "The posting requires US work authorization").

The score is computed on render from the stored requirements and the current answers.
It is never stored, so it can't go stale.

## Storage

`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS match JSONB`, which holds
`{ requirements, unverified: number, created_at }`. The existing `analysis` column
(the tailoring output) is untouched. The `questions` column stops being written for new
jobs. Old jobs keep working from it until they are re-matched.

## UI

**Jobs list card**: a compact line under the title:
`[■■■■■■□□□□] 62 · 7 of 9 must-haves shown` plus a hard-filter warning line if there is
one. The bar is a plain filled track (no gradient), coloured by band with the existing
`--danger` / `--warn` / `--ok` tokens. The number is always shown as text, never colour
alone.

**New job page `/jobs/[id]`**: the full breakdown.
- Score, band label, the one-sentence caveat.
- Hard filters first.
- Then must-haves, then nice-to-haves. Each shows a status mark, the requirement text,
  and the evidence quote (or "Not on your résumé").
- "Answer N questions" button → existing questions page.
- Tailor / cover letter buttons move here as well; they stay on the card too.

**Jobs without a match** (added before this ships): a "Check my fit" button
(`GenerateButton`, busy label "Checking… about 30 seconds").

**After answering**: the questions page redirects to `/jobs/[id]` with
`?was=58`, which shows "Your fit went from 58 to 71 from what you told us."

A low score **never blocks** tailoring. Deciding whether to apply is the person's call.

## Bands and copy

| Score | Label |
|---|---|
| 75–100 | Strong fit |
| 50–74 | Partial fit |
| 0–49 | Big gaps |

Caveat, always visible next to the score:
> This measures how much of what the posting asks for your résumé shows. It is not a
> prediction of whether you will get an interview.

## Explicitly not in v1

- **A score for the tailored résumé.** Tailoring adds no new facts, so the fit can't
  honestly change. A "tailored: 94" number would be the keyword theatre we're
  positioning against. A separate, literal **keyword coverage** check on the tailored
  document (which posting terms appear verbatim) could come later.
- Answering hard filters (authorization, relocation) in-app. They're shown for the
  person to check, not asked.
- Choosing which master résumé to match against. Uses the most recent master, like
  gap questions do today.

## Tests and acceptance

- Unit (`test/match.test.ts`): weights and credits; `unknown` excluded; fabricated
  evidence downgraded; paraphrased evidence with different punctuation still passes;
  answers upgrade and downgrade; hard-filter warning fires on a missing must-have.
- Schema test: prompt defaults and Zod defaults agree (the "empty summary" bug).
- Live, on `test/fixtures/priya.json` against two real postings, 3 runs each:
  - score spread across runs ≤ 10 points
  - no `met` without verified evidence reaching the UI
  - time ≤ 35s at low effort
  Record the numbers in the handover.

## Open questions

1. **Replace gap questions with this call** (recommended), or keep both?
2. **Band thresholds and labels**: are 75 / 50 and "Strong fit / Partial fit / Big
   gaps" right?
3. **Weights**: must = 3× nice. A simple, visible rule, or tune later from real
   postings?
