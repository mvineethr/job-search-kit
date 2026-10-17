# Prompt test set

Measures `core/*.md` prompt changes on 12 fictional résumé + job pairs. See
`docs/superpowers/specs/2026-10-16-prompt-test-set-design.md`.

    npm run eval -- --label baseline --dry-run       # shows the call count, free
    npm run eval -- --label baseline                 # all 5 prompts × 12 fixtures × 3 runs
    npm run eval -- --label v2-tailor --prompts tailor --only junior,senior --runs 1
    npm run eval:compare -- evals/runs/<baseline> evals/runs/<new>

- Hard gates (anything invented, a planted trap claimed, unparseable output) fail a version outright.
- Every other metric is shown as before → after for you to weigh.
- `blind/` has A/B pages. Pick, then open `blind/key.json`.
- Commit `summary.json` (and `compare.md`) for runs worth keeping. `raw/` and `blind/` stay local.
- Fixtures: `fixtures/<slug>/` holds resume.txt, resume.json, job.md and truth.json. The
  `test/evals/fixtures.test.ts` test keeps them consistent.
