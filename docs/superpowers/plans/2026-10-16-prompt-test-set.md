# Prompt Test Set Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Twelve fictional résumé + job pairs, a runner that sends them through the real `core/` prompts, code-computed scores, and a before/after comparison table plus a blind A/B pick, so prompt rewrites can be measured.

**Architecture:** Everything new lives in `web/evals/` (fixtures, scorers, runner, compare). The scorers are pure functions that reuse the app's own checks (`verifyTailoring`, `verifyEvidence`, `viewMatch`, `findGenericPhrases`, `parseFindings`). The runner builds each message with the same `lib/messages.ts` builders the routes use, calls `completeText`, writes the raw outputs (gitignored) and a small `summary.json` (committable). `compare.ts` diffs two summaries.

**Tech Stack:** Next.js 16 app in `web/`, TypeScript, Zod, Vitest, `tsx` (new dev dependency) for the CLI scripts, Node 24.

**Spec:** `docs/superpowers/specs/2026-10-16-prompt-test-set-design.md`

## Global Constraints

- Fixtures are **fictional**: `@example.com` emails, `555` phone numbers, invented employers. Public repo, so no real person's data.
- **No model grading.** The fit score always comes from `viewMatch` in `lib/match.ts`.
- **`npm test` makes no model calls.** Only `npm run eval` spends money.
- **The runner never prints keys.** It shows model names only and records errors by status or name, never by the full message.
- **Gitignored:** `web/evals/runs/*/raw/` and `web/evals/runs/*/blind/`. `summary.json` and `compare.md` are committable.
- Prompt tiers match production: parse on `fast`, everything else on `primary`.
- Route behaviour must not change: the message strings each route sends stay byte-for-byte identical.
- Many repo files are CRLF. Use exact-match edits, and normalise `\r\n` when reading fixture files.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Run all commands from `web/`. Run `npm install` first if `node_modules` is missing.

## File Structure

| File | Responsibility |
|---|---|
| `web/lib/messages.ts` (new) | The one owner of each prompt's user-message format: `tailorMessage`, `letterMessage`, `reviewMessage`, `matchMessage` |
| `web/lib/run-match.ts` (modify) | Re-exports `matchMessage` from `messages.ts` |
| `web/app/api/tailor/route.ts`, `web/app/api/letter/route.ts`, `web/components/AssistantPanel.tsx` (modify) | Call the builders |
| `web/evals/fixtures.ts` | `Fixture` / `Truth` types, `loadFixtures()` |
| `web/evals/fixtures/<slug>/{resume.txt,resume.json,job.md,truth.json}` | The 12 pairs |
| `web/evals/score.ts` | Tokenizer, `hasTerm`, `bulletStrength`, and the five scorers |
| `web/evals/registry.ts` | Prompt name → core file, tier, message builder, scorer |
| `web/evals/summary.ts` | `RunRecord`, `Summary`, `summarize()`: pure aggregation |
| `web/evals/run.ts` | CLI: plan, confirm, call, write raw + summary |
| `web/evals/compare.ts` | `compareSummaries()`, `writeBlind()` + CLI |
| `web/test/evals/*.test.ts` | Offline tests |

---

### Task 1: Shared message builders

**Files:**
- Create: `web/lib/messages.ts`
- Modify: `web/lib/run-match.ts` (move `matchMessage` out, re-export it)
- Modify: `web/app/api/tailor/route.ts:87-97`, `web/app/api/letter/route.ts:59-67`, `web/components/AssistantPanel.tsx:38`
- Test: `web/test/messages.test.ts`

**Interfaces:**
- Produces:
  - `tailorMessage(resumeText: string, title: string, description: string, answersBlock?: string): string`
  - `letterMessage(resumeText: string, title: string, description: string): string`
  - `reviewMessage(resumeText: string): string`
  - `matchMessage(resumeText: string, title: string, description: string, today?: Date): string`
  - `messages.ts` must import nothing from `db.ts` or `node:*`, because `AssistantPanel` is a client component.

- [ ] **Step 1: Write the failing test**

```ts
// web/test/messages.test.ts
import { describe, it, expect } from 'vitest';
import { tailorMessage, letterMessage, reviewMessage, matchMessage } from '@/lib/messages';
import { matchMessage as fromRunMatch } from '@/lib/run-match';

describe('message builders', () => {
  it('tailor: résumé, job, then answers, in the route format', () => {
    expect(tailorMessage('R', 'Acme — SRE', 'D', '\nA')).toBe('MY RESUME:\nR\n\nTHE JOB (Acme — SRE):\nD\nA');
    expect(tailorMessage('R', 'Acme — SRE', 'D')).toBe('MY RESUME:\nR\n\nTHE JOB (Acme — SRE):\nD');
  });
  it('letter: résumé then job', () => {
    expect(letterMessage('R', 'Acme — SRE', 'D')).toBe('MY RESUME:\nR\n\nTHE JOB (Acme — SRE):\nD');
  });
  it('review: the pasted text as is', () => {
    expect(reviewMessage('plain text')).toBe('plain text');
  });
  it('match: TODAY line first, and still exported from run-match', () => {
    const d = new Date('2026-10-16T12:00:00Z');
    expect(matchMessage('R', 'Acme — SRE', 'D', d)).toBe('TODAY: Oct 2026\n\nMY RESUME:\nR\n\nTHE JOB (Acme — SRE):\nD');
    expect(fromRunMatch).toBe(matchMessage);
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run test/messages.test.ts`
Expected: FAIL, `Cannot find module '@/lib/messages'`

- [ ] **Step 3: Create `web/lib/messages.ts`**

```ts
/**
 * The user message each prompt receives. Kept in one place so the routes and the
 * prompt test set (web/evals) send exactly the same text: a test that builds its
 * own copy would silently measure a different message the day a route changes.
 */

const resumeAndJob = (resumeText: string, title: string, description: string) =>
  `MY RESUME:\n${resumeText}\n\nTHE JOB (${title}):\n${description}`;

export function tailorMessage(resumeText: string, title: string, description: string, answersBlock = ''): string {
  return resumeAndJob(resumeText, title, description) + answersBlock;
}

export function letterMessage(resumeText: string, title: string, description: string): string {
  return resumeAndJob(resumeText, title, description);
}

export function reviewMessage(resumeText: string): string {
  return resumeText;
}

/**
 * Today's date is included because the model does not know it: without it, "Jun 2019 –
 * Present" was counted as under seven years in some runs and over in others.
 */
export function matchMessage(resumeText: string, title: string, description: string, today = new Date()): string {
  const month = today.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
  return `TODAY: ${month}\n\n${resumeAndJob(resumeText, title, description)}`;
}
```

- [ ] **Step 4: Point the callers at it**

In `web/lib/run-match.ts`, delete the `matchMessage` function and its doc comment (lines 8–15). Add these at the top:

```ts
import { matchMessage } from './messages';
export { matchMessage };
```

In `web/app/api/tailor/route.ts`, add `import { tailorMessage } from '@/lib/messages';` and replace the `content:` expression (the three concatenated lines) with:

```ts
          content: tailorMessage(base, `${job.company} — ${job.role}`, job.description, answersForPrompt(answers)),
```

In `web/app/api/letter/route.ts`, add `import { letterMessage } from '@/lib/messages';` and replace the `content:` line with:

```ts
          content: letterMessage(resumeText, `${job.company} — ${job.role}`, job.description),
```

In `web/components/AssistantPanel.tsx`, add `import { reviewMessage } from '@/lib/messages';` and change line 38 to:

```ts
          messages: [{ role: 'user', content: reviewMessage(resumeText) }],
```

- [ ] **Step 5: Run the full suite and type-check**

Run: `npx vitest run && npx tsc --noEmit`
Expected: all tests pass (the existing 117 plus 4 new) and no type errors.

- [ ] **Step 6: Commit**

```bash
git add lib/messages.ts lib/run-match.ts app/api/tailor/route.ts app/api/letter/route.ts components/AssistantPanel.tsx test/messages.test.ts
git commit -m "refactor(web): one owner for each prompt's message format"
```

---

### Task 2: Fixture loader, tokenizer and shared score helpers

**Files:**
- Create: `web/evals/fixtures.ts`, `web/evals/score.ts` (helpers only in this task)
- Test: `web/test/evals/score-helpers.test.ts`

**Interfaces:**
- Produces (in `evals/fixtures.ts`):
  ```ts
  export type Truth = { supported: string[]; traps: string[]; fitBand: 'low' | 'mid' | 'high' };
  export type Fixture = { slug: string; resumeText: string; resume: Resume; company: string; role: string; description: string; truth: Truth };
  export const TruthSchema: z.ZodType<Truth>;
  export function loadFixture(dir: string): Fixture;
  export function loadFixtures(root?: string): Fixture[]; // default <cwd>/evals/fixtures, sorted by slug
  ```
- Produces (in `evals/score.ts`):
  ```ts
  export type Score = { gates: Record<string, boolean>; metrics: Record<string, number> };
  export const DATE_WORDS: Set<string>;
  export function contentWords(text: string): Set<string>;
  export function resumeWords(r: Resume): Set<string>;
  export function hasTerm(text: string, term: string): boolean;
  export function coverage(text: string, terms: string[]): number; // 0..1
  export function bulletStrength(bullets: string[], banned: string[]): number; // 0..1
  ```

- [ ] **Step 1: Write the failing tests**

```ts
// web/test/evals/score-helpers.test.ts
import { describe, it, expect } from 'vitest';
import { contentWords, resumeWords, hasTerm, coverage, bulletStrength } from '@/evals/score';
import { ResumeSchema } from '@/lib/resume-schema';
import fixture from '../fixtures/priya.json';

describe('contentWords', () => {
  it('lowercases, keeps diacritics, drops short words and stopwords', () => {
    expect([...contentWords('Nguyễn led the São Paulo team, and 40 of us')].sort())
      .toEqual(['led', 'nguyễn', 'paulo', 'são', 'team']);
  });
});

describe('resumeWords', () => {
  it('includes name, contact and dates as well as body text', () => {
    const w = resumeWords(ResumeSchema.parse(fixture));
    for (const x of ['priya', 'raman', 'austin', 'meridian', 'kubernetes', '2019']) expect(w.has(x)).toBe(true);
  });
});

describe('hasTerm', () => {
  it('matches whole words case-insensitively, including hyphens and diacritics', () => {
    expect(hasTerm('Ran the on-call rotation', 'on-call')).toBe(true);
    expect(hasTerm('Wrote Go services', 'go')).toBe(true);
    expect(hasTerm('years ago', 'go')).toBe(false);
    expect(hasTerm('Universidade de São Paulo', 'são paulo')).toBe(true);
    expect(hasTerm('Dynamics 365', 'dynamic')).toBe(false);
  });
});

describe('coverage', () => {
  it('is the share of terms present', () => {
    expect(coverage('Kubernetes and AWS', ['kubernetes', 'aws', 'gcp', 'terraform'])).toBe(0.5);
    expect(coverage('anything', [])).toBe(1);
  });
});

describe('bulletStrength', () => {
  const banned = ['spearheaded', 'leveraged'];
  it('needs a non-banned, non-gerund first word and a number or [METRIC NEEDED]', () => {
    expect(bulletStrength([
      'Cut deploy time from 34 to 6 minutes.', // strong
      'Spearheaded a 40% cost cut.',           // banned verb
      'Managing 12 engineers.',                // gerund
      'Owned the release process.',            // no number
      'Reduced incidents by [METRIC NEEDED].', // strong
    ], banned)).toBe(0.4);
    expect(bulletStrength([], banned)).toBe(0);
  });
});
```

- [ ] **Step 2: Run them and confirm they fail**

Run: `npx vitest run test/evals/score-helpers.test.ts`
Expected: FAIL, `Cannot find module '@/evals/score'`

- [ ] **Step 3: Create `web/evals/fixtures.ts`**

```ts
import { readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { z } from 'zod';
import { ResumeSchema, type Resume } from '../lib/resume-schema';

export const TruthSchema = z.object({
  /** Posting terms the résumé genuinely backs: the only keywords coverage counts. */
  supported: z.array(z.string().min(1)).min(1),
  /** Posting skills the résumé deliberately lacks: must never be claimed. */
  traps: z.array(z.string().min(1)).min(1),
  fitBand: z.enum(['low', 'mid', 'high']),
});

export type Truth = z.infer<typeof TruthSchema>;

export type Fixture = {
  slug: string;
  resumeText: string;
  resume: Resume;
  company: string;
  role: string;
  description: string;
  truth: Truth;
};

const read = (dir: string, file: string) => readFileSync(join(dir, file), 'utf8').replace(/\r\n/g, '\n');

export function loadFixture(dir: string): Fixture {
  const slug = basename(dir);
  const [header, ...rest] = read(dir, 'job.md').split('\n');
  const m = header.match(/^(.+?)\s+—\s+(.+)$/);
  if (!m) throw new Error(`${slug}/job.md: first line must be "Company — Role"`);
  return {
    slug,
    resumeText: read(dir, 'resume.txt'),
    resume: ResumeSchema.parse(JSON.parse(read(dir, 'resume.json'))),
    company: m[1].trim(),
    role: m[2].trim(),
    description: rest.join('\n').trim(),
    truth: TruthSchema.parse(JSON.parse(read(dir, 'truth.json'))),
  };
}

export function loadFixtures(root = join(process.cwd(), 'evals', 'fixtures')): Fixture[] {
  return readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort()
    .map((name) => loadFixture(join(root, name)));
}
```

- [ ] **Step 4: Create `web/evals/score.ts` with the helpers**

```ts
import { METRIC_NEEDED, type Resume } from '../lib/resume-schema';
import { sourceText } from '../lib/verify-tailoring';

export type Score = { gates: Record<string, boolean>; metrics: Record<string, number> };

const STOP = new Set(
  'the and for with from that this was were are has have had into over per our its their your you all not but than then also via who which been will can out'.split(' '),
);

/** The parse prompt normalises dates to "Mon YYYY", so a month word it adds is formatting, not invention. */
export const DATE_WORDS = new Set('jan feb mar apr may jun jul aug sep oct nov dec present'.split(' '));

/** Lowercased runs of letters/digits, 3+ long, minus stopwords. Diacritics count as letters. */
export function contentWords(text: string): Set<string> {
  return new Set((text.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? []).filter((w) => !STOP.has(w)));
}

/** Every word a résumé holds: body text plus the name, contact and dates that sourceText leaves out. */
export function resumeWords(r: Resume): Set<string> {
  const dates = r.experience.map((e) => `${e.start} ${e.end}`).join(' ');
  const contact = Object.values(r.contact).filter(Boolean).join(' ');
  return contentWords([sourceText(r), r.name, r.targetTitle ?? '', contact, dates].join(' \n '));
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Whole-word, case-insensitive: "go" must not match "ago". */
export function hasTerm(text: string, term: string): boolean {
  return new RegExp(`(?<![\\p{L}\\p{N}])${escape(term)}(?![\\p{L}\\p{N}])`, 'iu').test(text);
}

export function coverage(text: string, terms: string[]): number {
  if (terms.length === 0) return 1;
  return terms.filter((t) => hasTerm(text, t)).length / terms.length;
}

/**
 * Share of bullets that open with a plain verb (not banned, not a gerund) and carry a
 * number or the [METRIC NEEDED] marker. Crude on purpose; the blind pick covers the rest.
 */
export function bulletStrength(bullets: string[], banned: string[]): number {
  if (bullets.length === 0) return 0;
  const strong = bullets.filter((b) => {
    const first = (b.trim().split(/\s+/)[0] ?? '').toLowerCase().replace(/[^\p{L}]/gu, '');
    const verbOk = first.length > 0 && !banned.includes(first) && !first.endsWith('ing');
    return verbOk && (/\d/.test(b) || b.includes(METRIC_NEEDED));
  });
  return strong.length / bullets.length;
}
```

Then add `evals/**/*.test.ts` coverage to Vitest. In `web/vitest.config.ts`, the include list already matches `test/**/*.test.ts`, and the tests live in `web/test/evals/`, so no change is needed. Check that `@/evals/score` resolves through the existing `@` alias, which points at `web/`.

- [ ] **Step 5: Run the tests and confirm they pass**

Run: `npx vitest run test/evals/score-helpers.test.ts`
Expected: PASS (5 tests). If the `contentWords` order assertion fails because of a stopword, fix the STOP list rather than the test, since `and`, `the` and `of` must all be dropped.

- [ ] **Step 6: Commit**

```bash
git add evals/fixtures.ts evals/score.ts test/evals/score-helpers.test.ts
git commit -m "feat(evals): fixture loader and shared score helpers"
```

---

### Task 3: The five scorers

**Files:**
- Modify: `web/evals/score.ts` (append the scorers)
- Test: `web/test/evals/scorers.test.ts`

**Interfaces:**
- Consumes: `Fixture` (Task 2), the helpers in `score.ts`, and from `lib/`: `extractJsonObject`, `ResumeSchema`, `METRIC_NEEDED`, `verifyTailoring`, `numbersIn`, `sourceText`, `bannedPhrases`, `findGenericPhrases`, `resumeParts`, `loadAtsRules`, `LetterSchema`, `wordCount`, `MatchOutputSchema`, `verifyEvidence`, `matchSource`, `viewMatch`, `band`, `parseFindings`
- Produces (each is `(text: string, fx: Fixture) => Score`):
  - `scoreParse`, with gates `parses` and `noInventedWords`, and metrics `invented`, `lost`, `rolesDiff`, `bulletsDiff`
  - `scoreTailor`, with gates `parses`, `noRemovedSkills`, `noUnsupportedNumbers`, `noUnsupportedEmployers` and `noTrap`, and metrics `coverage`, `metricNeeded`, `filler`, `bulletStrength`, `bulletsRestored`
  - `scoreLetter`, with gates `parses`, `noTrap` and `noNewNumbers`, and metrics `filler`, `coverage` and `words`
  - `scoreMatch`, with gates `parses` and `noTrapClaimed`, and metrics `score`, `unverified`, `bandHit` (1/0) and `requirements`
  - `scoreReview`, with the gate `parses`, and metrics `findings` and `critical`
  - When parsing fails, the scorer returns `{ gates: { parses: false }, metrics: {} }` and the remaining gates are skipped.

- [ ] **Step 1: Write the failing tests**

They use a small in-memory fixture, so they run before the real fixtures exist.

```ts
// web/test/evals/scorers.test.ts
import { describe, it, expect } from 'vitest';
import { scoreParse, scoreTailor, scoreLetter, scoreMatch, scoreReview } from '@/evals/score';
import type { Fixture } from '@/evals/fixtures';
import { ResumeSchema, type Resume } from '@/lib/resume-schema';
import priya from '../fixtures/priya.json';

const resume: Resume = ResumeSchema.parse(priya);
const fx: Fixture = {
  slug: 'priya',
  resumeText: [
    'Priya Raman', 'Site Reliability Engineer', 'Austin, TX · priya.raman@example.com · (512) 555-0142 · linkedin.com/in/priyaraman',
    resume.summary, 'Skills: ' + resume.skills.join(', '),
    ...resume.experience.flatMap((r) => [`${r.title}, ${r.company}, ${r.location ?? ''}, ${r.start} - ${r.end}`, ...r.bullets]),
    ...resume.education.map((e) => `${e.degree}, ${e.school}, ${e.year ?? ''}`),
    ...(resume.certifications ?? []),
  ].join('\n'),
  resume,
  company: 'Acme',
  role: 'SRE',
  description: 'We need Kubernetes, Terraform and Datadog. Team of 12.',
  truth: { supported: ['Kubernetes', 'Terraform'], traps: ['Datadog'], fitBand: 'high' },
};
const json = (o: unknown) => '```json\n' + JSON.stringify(o) + '\n```';

describe('scoreParse', () => {
  it('passes a faithful transcription', () => {
    const s = scoreParse(json(resume), fx);
    expect(s.gates).toEqual({ parses: true, noInventedWords: true });
    expect(s.metrics.lost).toBe(0);
  });
  it('fails on an invented word', () => {
    const bad = { ...resume, summary: resume.summary + ' Expert in Kafka.' };
    expect(scoreParse(json(bad), fx).gates.noInventedWords).toBe(false);
  });
  it('fails on unparseable output', () => {
    expect(scoreParse('sorry, no', fx)).toEqual({ gates: { parses: false }, metrics: {} });
  });
});

describe('scoreTailor', () => {
  it('passes the original résumé unchanged', () => {
    const s = scoreTailor(json(resume), fx);
    expect(Object.values(s.gates).every(Boolean)).toBe(true);
    expect(s.metrics.coverage).toBe(1);
  });
  it('fails when a trap appears in a bullet', () => {
    const bad = structuredClone(resume);
    bad.experience[0].bullets[0] = 'Ran Datadog for 40 services.';
    expect(scoreTailor(json(bad), fx).gates.noTrap).toBe(false);
  });
  it('fails on an invented number', () => {
    const bad = structuredClone(resume);
    bad.experience[0].bullets[0] = 'Cut deploy time by 73%.';
    expect(scoreTailor(json(bad), fx).gates.noUnsupportedNumbers).toBe(false);
  });
});

describe('scoreLetter', () => {
  const letter = (p: string) => json({ greeting: 'Dear team,', paragraphs: [p, 'I would welcome a conversation.'], name: 'Priya Raman' });
  it('passes, and allows numbers quoted from the posting', () => {
    expect(Object.values(scoreLetter(letter('I rebuilt pipelines across 40 services and would join your team of 12.'), fx).gates).every(Boolean)).toBe(true);
  });
  it('fails on a trap or an invented number', () => {
    expect(scoreLetter(letter('I have run Datadog for years.'), fx).gates.noTrap).toBe(false);
    expect(scoreLetter(letter('I cut costs by 73%.'), fx).gates.noNewNumbers).toBe(false);
  });
});

describe('scoreMatch', () => {
  const req = (o: object) => ({ id: 'r', skill: 'x', text: 'x', kind: 'must', category: 'skill', status: 'missing', evidence: '', question: '', why: '', ...o });
  it('scores with the app arithmetic and checks the band', () => {
    const s = scoreMatch(json({ requirements: [req({ id: 'a', skill: 'Kubernetes', text: 'Kubernetes', status: 'met', evidence: 'Migrated the core ledger service to Kubernetes' })] }), fx);
    expect(s.gates).toEqual({ parses: true, noTrapClaimed: true });
    expect(s.metrics.score).toBe(100);
    expect(s.metrics.bandHit).toBe(1);
  });
  it('fails when a trap is claimed with a quote that survives verification', () => {
    const s = scoreMatch(json({ requirements: [req({ skill: 'Datadog', text: 'Datadog monitoring', status: 'met', evidence: 'Prometheus' })] }), fx);
    expect(s.gates.noTrapClaimed).toBe(false);
  });
});

describe('scoreReview', () => {
  it('counts findings and critical ones', () => {
    const text = 'Prose.\n' + json([{ section: 'summary', severity: 'critical', finding: 'a' }, { section: 'skills', severity: 'worth-fixing', finding: 'b' }]);
    expect(scoreReview(text, fx)).toEqual({ gates: { parses: true }, metrics: { findings: 2, critical: 1 } });
  });
});
```

- [ ] **Step 2: Run them and confirm they fail**

Run: `npx vitest run test/evals/scorers.test.ts`
Expected: FAIL, `scoreParse is not exported`

- [ ] **Step 3: Append the scorers to `web/evals/score.ts`**

Add these imports at the top of the file, next to the existing ones:

```ts
import { ResumeSchema } from '../lib/resume-schema';
import { extractJsonObject } from '../lib/extract-json';
import { verifyTailoring, numbersIn } from '../lib/verify-tailoring';
import { bannedPhrases, findGenericPhrases, resumeParts } from '../lib/generic-phrases';
import { loadAtsRules } from '../lib/prompts';
import { LetterSchema, wordCount } from '../lib/letter-schema';
import { MatchOutputSchema, verifyEvidence, matchSource, viewMatch, band } from '../lib/match';
import { parseFindings } from '../lib/findings-schema';
import type { Fixture } from './fixtures';
```

Then add the scorers:

```ts
let banned: string[] | null = null;
const bannedList = () => (banned ??= bannedPhrases(loadAtsRules()));

const NOT_PARSED: Score = { gates: { parses: false }, metrics: {} };
const count = (text: string, needle: string) => text.split(needle).length - 1;

export function scoreParse(text: string, fx: Fixture): Score {
  const parsed = ResumeSchema.safeParse(extractJsonObject(text));
  if (!parsed.success) return NOT_PARSED;
  const out = resumeWords(parsed.data);
  const src = contentWords(fx.resumeText);
  const expected = resumeWords(fx.resume);
  const invented = [...out].filter((w) => !src.has(w) && !DATE_WORDS.has(w)).length;
  const bullets = (r: typeof fx.resume) => r.experience.reduce((n, e) => n + e.bullets.length, 0);
  return {
    gates: { parses: true, noInventedWords: invented === 0 },
    metrics: {
      invented,
      lost: [...expected].filter((w) => !out.has(w)).length,
      rolesDiff: Math.abs(parsed.data.experience.length - fx.resume.experience.length),
      bulletsDiff: Math.abs(bullets(parsed.data) - bullets(fx.resume)),
    },
  };
}

export function scoreTailor(text: string, fx: Fixture): Score {
  const parsed = ResumeSchema.safeParse(extractJsonObject(text));
  if (!parsed.success) return NOT_PARSED;
  const { cleaned, audit } = verifyTailoring(parsed.data, fx.resume, fx.resumeText);
  const out = sourceText(parsed.data); // before cleaning: a trap anywhere in the output counts
  return {
    gates: {
      parses: true,
      noRemovedSkills: audit.removedSkills.length === 0,
      noUnsupportedNumbers: audit.unsupportedNumbers.length === 0,
      noUnsupportedEmployers: audit.unsupportedEmployers.length === 0,
      noTrap: !fx.truth.traps.some((t) => hasTerm(out, t)),
    },
    metrics: {
      coverage: coverage(sourceText(cleaned), fx.truth.supported),
      metricNeeded: count(sourceText(cleaned), METRIC_NEEDED.toLowerCase()),
      filler: findGenericPhrases(resumeParts(cleaned), bannedList(), fx.description).length,
      bulletStrength: bulletStrength(cleaned.experience.flatMap((e) => e.bullets), bannedList()),
      bulletsRestored: audit.bulletsRestored ?? 0,
    },
  };
}

export function scoreLetter(text: string, fx: Fixture): Score {
  const parsed = LetterSchema.safeParse(extractJsonObject(text));
  if (!parsed.success) return NOT_PARSED;
  const body = parsed.data.paragraphs.join('\n');
  // Quoting the posting's own numbers ("your team of 12") is not invention.
  const allowed = `${sourceText(fx.resume, fx.resumeText)} ${fx.description.toLowerCase()}`;
  return {
    gates: {
      parses: true,
      noTrap: !fx.truth.traps.some((t) => hasTerm(body, t)),
      noNewNumbers: numbersIn(body).every((n) => allowed.includes(n.toLowerCase())),
    },
    metrics: {
      filler: findGenericPhrases(parsed.data.paragraphs.map((p) => ({ where: 'Letter', text: p })), bannedList(), fx.description).length,
      coverage: coverage(body, fx.truth.supported),
      words: wordCount(parsed.data),
    },
  };
}

const BAND_LABEL = { high: 'Strong fit', mid: 'Partial fit', low: 'Big gaps' } as const;

export function scoreMatch(text: string, fx: Fixture): Score {
  const parsed = MatchOutputSchema.safeParse(extractJsonObject(text));
  if (!parsed.success) return NOT_PARSED;
  const { requirements, unverified } = verifyEvidence(parsed.data.requirements, matchSource(fx.resume, fx.resumeText));
  const trapClaimed = requirements.some(
    (r) => (r.status === 'met' || r.status === 'partial') && fx.truth.traps.some((t) => hasTerm(r.skill, t) || hasTerm(r.text, t)),
  );
  const score = viewMatch({ requirements, unverified, created_at: '' }, []).score ?? 0;
  return {
    gates: { parses: true, noTrapClaimed: !trapClaimed },
    metrics: {
      score,
      unverified,
      bandHit: band(score).label === BAND_LABEL[fx.truth.fitBand] ? 1 : 0,
      requirements: requirements.length,
    },
  };
}

export function scoreReview(text: string, _fx: Fixture): Score {
  const findings = parseFindings(text);
  if (findings.length === 0) return NOT_PARSED;
  return {
    gates: { parses: true },
    metrics: { findings: findings.length, critical: findings.filter((f) => f.severity === 'critical').length },
  };
}
```

Note on the trap-claimed test: the quote "Prometheus" is in Priya's résumé, so `verifyEvidence` keeps the `met`, and the gate has to catch it. If Priya's skills ever drop Prometheus, pick another word that's in the résumé.

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `npx vitest run test/evals`
Expected: PASS. If `scoreParse` "passes a faithful transcription" fails, print the `invented` words. The likely cause is a word in `resume.json` that the hand-built `fx.resumeText` lacks. Fix the test text, not the scorer.

- [ ] **Step 5: Commit**

```bash
git add evals/score.ts test/evals/scorers.test.ts
git commit -m "feat(evals): code-computed scores for parse, tailor, letter, match, review"
```

---

### Task 4: The twelve fixtures and their integrity test

**Files:**
- Create: `web/evals/fixtures/<slug>/{resume.txt,resume.json,job.md,truth.json}` for the 12 slugs below
- Test: `web/test/evals/fixtures.test.ts`

**Interfaces:**
- Consumes: `loadFixtures`, `TruthSchema` (Task 2), `contentWords`, `resumeWords`, `hasTerm`, `DATE_WORDS` (Task 2)

- [ ] **Step 1: Write the integrity test**

```ts
// web/test/evals/fixtures.test.ts
import { describe, it, expect } from 'vitest';
import { loadFixtures } from '@/evals/fixtures';
import { contentWords, resumeWords, hasTerm, DATE_WORDS } from '@/evals/score';

const SLUGS = ['changer-military', 'changer-teacher', 'gap-year', 'junior', 'keyword-stuffed-jd', 'no-metrics', 'no-summary', 'non-english', 'non-tech', 'senior', 'strong-fit', 'weak-fit'];
const fixtures = loadFixtures();

describe('prompt test set fixtures', () => {
  it('has exactly the twelve planned pairs', () => {
    expect(fixtures.map((f) => f.slug)).toEqual(SLUGS);
  });

  for (const fx of fixtures) {
    describe(fx.slug, () => {
      it('resume.json is a transcription of resume.txt (no word it lacks)', () => {
        const src = contentWords(fx.resumeText);
        expect([...resumeWords(fx.resume)].filter((w) => !src.has(w) && !DATE_WORDS.has(w))).toEqual([]);
      });
      it('every trap is absent from the résumé and present in the posting', () => {
        for (const t of fx.truth.traps) {
          expect(hasTerm(fx.resumeText, t), `trap "${t}" is in resume.txt`).toBe(false);
          expect(hasTerm(fx.description, t), `trap "${t}" is not in job.md`).toBe(true);
        }
      });
      it('every supported term is in both the résumé and the posting', () => {
        for (const t of fx.truth.supported) {
          expect(hasTerm(fx.resumeText, t), `"${t}" not in resume.txt`).toBe(true);
          expect(hasTerm(fx.description, t), `"${t}" not in job.md`).toBe(true);
        }
      });
      it('is fictional', () => {
        for (const m of fx.resumeText.match(/[\w.+-]+@[\w-]+\.\w+/g) ?? []) expect(m.endsWith('@example.com')).toBe(true);
        for (const m of fx.resumeText.match(/\(?\d{3}\)?[\s.-]?\d{3}[\s.-]\d{4}/g) ?? []) expect(m).toMatch(/555/);
      });
    });
  }
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run test/evals/fixtures.test.ts`
Expected: FAIL, `ENOENT ... evals/fixtures`

- [ ] **Step 3: Write `strong-fit` exactly as below**

This is the reference fixture. Use it as the pattern for the other eleven.

`web/evals/fixtures/strong-fit/resume.txt`:

```
DANA OKAFOR
Site Reliability Engineer | Denver, CO | dana.okafor@example.com | (303) 555-0187

SUMMARY
SRE with seven years keeping high-traffic e-commerce systems up.

SKILLS
Kubernetes, Terraform, AWS, Python, Go, Prometheus, Grafana, PagerDuty

EXPERIENCE
Senior SRE — Brightcart, Denver CO          Apr 2021 - Present
• Cut p99 checkout latency from 1.8s to 600ms by moving session storage to Redis.
• Ran the on-call rotation for 14 engineers; pages per week fell from 30 to 9.
• Wrote Terraform modules now used by 11 teams to create AWS accounts.

Site Reliability Engineer — Larkspur Media, Remote      Jan 2018 - Mar 2021
• Moved 60 services from VMs to Kubernetes over nine months.
• Built Prometheus and Grafana dashboards for every tier-one service.

EDUCATION
B.S. Computer Science, University of Colorado Boulder, 2017
```

`web/evals/fixtures/strong-fit/resume.json`:

```json
{
  "name": "Dana Okafor",
  "targetTitle": "Site Reliability Engineer",
  "contact": { "location": "Denver, CO", "email": "dana.okafor@example.com", "phone": "(303) 555-0187" },
  "summary": "SRE with seven years keeping high-traffic e-commerce systems up.",
  "skills": ["Kubernetes", "Terraform", "AWS", "Python", "Go", "Prometheus", "Grafana", "PagerDuty"],
  "experience": [
    {
      "title": "Senior SRE", "company": "Brightcart", "location": "Denver CO", "start": "Apr 2021", "end": "Present",
      "bullets": [
        "Cut p99 checkout latency from 1.8s to 600ms by moving session storage to Redis.",
        "Ran the on-call rotation for 14 engineers; pages per week fell from 30 to 9.",
        "Wrote Terraform modules now used by 11 teams to create AWS accounts."
      ]
    },
    {
      "title": "Site Reliability Engineer", "company": "Larkspur Media", "location": "Remote", "start": "Jan 2018", "end": "Mar 2021",
      "bullets": [
        "Moved 60 services from VMs to Kubernetes over nine months.",
        "Built Prometheus and Grafana dashboards for every tier-one service."
      ]
    }
  ],
  "education": [{ "degree": "B.S. Computer Science", "school": "University of Colorado Boulder", "year": "2017" }]
}
```

`web/evals/fixtures/strong-fit/job.md`:

```
Northwind Outfitters — Senior Site Reliability Engineer
We're hiring a senior SRE to keep our online store fast and available.

Must have:
- 5+ years in SRE or production operations
- Kubernetes in production
- Terraform and AWS
- Prometheus and Grafana monitoring
- Running on-call and incident response

Nice to have:
- Go or Python
- Datadog
- Experience with Kafka
```

`web/evals/fixtures/strong-fit/truth.json`:

```json
{ "supported": ["Kubernetes", "Terraform", "AWS", "Prometheus", "Grafana", "on-call", "Python", "Go"], "traps": ["Datadog", "Kafka"], "fitBand": "high" }
```

- [ ] **Step 4: Write the other eleven to this table**

Every fixture needs 2–4 roles, 2–5 bullets each (except `senior`), invented employers and schools, an `@example.com` email and a `555` phone number. `resume.txt` gets realistic paste mess: mixed bullet characters (`•`, `-`, `*`), a wrapped line, inconsistent date formats such as `03/2020` or `2019 – now`. `resume.json` uses the `Mon YYYY` / `Present` form wherever the text gives a month. The integrity test forbids any word in `resume.json` that isn't in the text. To write `Present` for "now", put the word "Present" in the text. A month written as a number (`03/2020`) may become `Mar 2020`, because month words are exempt.

| Slug | Person (fictional) | Applying to | Résumé quirk | `supported` (min 4) | `traps` (2–3) | `fitBand` |
|---|---|---|---|---|---|---|
| `weak-fit` | Front-end developer, 4 yrs React | Data Engineer | Strong UI metrics, no data work | JavaScript, SQL, Git, Agile | Spark, Airflow, Snowflake | low |
| `changer-teacher` | High-school science teacher, 9 yrs | Instructional Designer | Teaching duties phrased as classroom work | curriculum, assessment, Google Classroom, training | Articulate Storyline, SCORM | mid |
| `changer-military` | Army logistics NCO, 10 yrs | Operations Manager, 3PL warehouse | Military titles and acronyms (NCOIC, MOS 92A) | inventory, logistics, supervised, safety | SAP, Lean Six Sigma | mid |
| `junior` | New CS graduate, two internships | Junior Backend Developer | Education first, projects section folded into experience | Python, REST, PostgreSQL, Git | Kubernetes, Kafka | mid |
| `senior` | Staff engineer, 15 yrs, 4 roles, ~20 bullets total | Principal Engineer | Long; older roles have weaker bullets | distributed systems, Java, mentoring, architecture, AWS | Rust, GraphQL | high |
| `no-metrics` | Office manager, 6 yrs | Operations Coordinator | **No digits anywhere** in bullets (duties only) | scheduling, vendors, invoices, Excel | QuickBooks, Salesforce | mid |
| `non-english` | Nguyễn Thị Lan, data analyst; school "Universidade de São Paulo"; employers "Café Mãe Logística", "Zürich Datenwerk" | Data Analyst | Diacritics in names, schools and employers; one role in São Paulo | SQL, Tableau, Python, dashboards | dbt, Looker | high |
| `gap-year` | Marketing specialist, 5 yrs then a 2-year caregiving gap | Marketing Manager | Gap stated in one line ("2023 – 2025: Family caregiving") as its own entry | SEO, campaigns, HubSpot, content | Marketo, Google Analytics 4 | mid |
| `non-tech` | Registered nurse, 7 yrs med-surg | Charge Nurse, ICU | Licences and certifications section (RN, BLS, ACLS) | BLS, ACLS, patient care, charge nurse | CCRN, Epic | mid |
| `keyword-stuffed-jd` | DevOps engineer with 8 of the posting's tools | DevOps Engineer | Ordinary résumé; **the posting** lists ~40 tools in one long list | Docker, Jenkins, Ansible, Terraform, Linux, Bash, Git, AWS | Pulumi, Nomad, Consul | mid |
| `no-summary` | Accountant, 5 yrs | Senior Accountant | **No summary section** at all (and `"summary": ""` in the JSON) | reconciliations, month-end close, GAAP, Excel | NetSuite, CPA | mid |

The band is a rough expectation, not a promise. If the baseline (Task 7) lands a fixture outside its band consistently and the result looks right on reading, update `fitBand` in the same commit as the baseline and say why in the message.

- [ ] **Step 5: Run the integrity test until it passes**

Run: `npx vitest run test/evals/fixtures.test.ts`
Expected: PASS for all 12 × 4 checks. The usual failures:
- a trap word appears in `resume.txt`, for example "Excel" in a résumé that mentions "excelled". `hasTerm` is whole-word, so "excelled" is fine, but check.
- `resume.json` has a word the text lacks, for example `"location": "Remote"` when the text never says Remote.

- [ ] **Step 6: Commit**

```bash
git add evals/fixtures test/evals/fixtures.test.ts
git commit -m "feat(evals): twelve fictional résumé and job pairs with planted traps"
```

---

### Task 5: Registry, summary aggregation and the runner

**Files:**
- Create: `web/evals/registry.ts`, `web/evals/summary.ts`, `web/evals/run.ts`
- Modify: `web/package.json` (scripts and `tsx`), `web/.gitignore`
- Test: `web/test/evals/summary.test.ts`

**Interfaces:**
- Consumes: the scorers (Task 3), `loadFixtures` (Task 2), the builders (Task 1), `loadPrompt`, `completeText`, `pickConfig` from `lib/`
- Produces:
  ```ts
  // registry.ts
  export type PromptName = 'parse' | 'tailor' | 'letter' | 'match' | 'review';
  export type PromptCase = { core: string; tier: 'primary' | 'fast'; message: (fx: Fixture) => string; score: (text: string, fx: Fixture) => Score };
  export const PROMPTS: Record<PromptName, PromptCase>;
  // summary.ts
  export type RunRecord = { prompt: string; fixture: string; run: number; ok: boolean; degraded: boolean; error?: string; gates: Record<string, boolean>; metrics: Record<string, number> };
  export type Stat = { mean: number; spread: number };
  export type Meta = { label: string; startedAt: string; gitSha: string; models: { primary: string; fast: string }; effort: string; coreHashes: Record<string, string>; calls: number };
  export type PromptSummary = { gatesPassed: boolean; failures: { fixture: string; run: number; gate: string }[]; errors: number; degraded: number; metrics: Record<string, Stat>; fixtures: Record<string, Record<string, Stat & { values: number[] }>> };
  export type Summary = { meta: Meta; prompts: Record<string, PromptSummary> };
  export function summarize(records: RunRecord[], meta: Meta): Summary;
  ```
  - Every record's `metrics` includes `ms` (wall-clock time of the call).
  - Records with `ok: false` (call errored) are counted in `errors` and excluded from gates and metrics. Records with `degraded: true` are counted in `degraded` and also excluded, because they come from a different model.
  - A prompt's `metrics[m].mean` is the mean of the per-fixture means, and its `spread` is the mean of the per-fixture spreads (max − min across runs).

- [ ] **Step 1: Write the failing test**

```ts
// web/test/evals/summary.test.ts
import { describe, it, expect } from 'vitest';
import { summarize, type RunRecord, type Meta } from '@/evals/summary';

const meta: Meta = { label: 't', startedAt: '', gitSha: 'x', models: { primary: 'p', fast: 'f' }, effort: 'low', coreHashes: {}, calls: 0 };
const rec = (o: Partial<RunRecord>): RunRecord => ({ prompt: 'match', fixture: 'a', run: 1, ok: true, degraded: false, gates: { parses: true }, metrics: { score: 50 }, ...o });

describe('summarize', () => {
  it('averages per fixture, then across fixtures; spread is max minus min', () => {
    const s = summarize([
      rec({ run: 1, metrics: { score: 40 } }), rec({ run: 2, metrics: { score: 60 } }),
      rec({ fixture: 'b', metrics: { score: 80 } }),
    ], meta);
    expect(s.prompts.match.fixtures.a.score).toEqual({ mean: 50, spread: 20, values: [40, 60] });
    expect(s.prompts.match.metrics.score).toEqual({ mean: 65, spread: 10 });
    expect(s.prompts.match.gatesPassed).toBe(true);
  });
  it('one failing gate fails the prompt and is named', () => {
    const s = summarize([rec({}), rec({ fixture: 'b', run: 2, gates: { parses: true, noTrap: false } })], meta);
    expect(s.prompts.match.gatesPassed).toBe(false);
    expect(s.prompts.match.failures).toEqual([{ fixture: 'b', run: 2, gate: 'noTrap' }]);
  });
  it('errored and degraded runs are counted, not scored', () => {
    const s = summarize([rec({}), rec({ run: 2, ok: false, error: '500', gates: {}, metrics: {} }), rec({ run: 3, degraded: true, gates: { parses: false } })], meta);
    expect(s.prompts.match).toMatchObject({ errors: 1, degraded: 1, gatesPassed: true });
    expect(s.prompts.match.fixtures.a.score.values).toEqual([50]);
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run test/evals/summary.test.ts`
Expected: FAIL, `Cannot find module '@/evals/summary'`

- [ ] **Step 3: Create `web/evals/summary.ts`**

```ts
export type RunRecord = {
  prompt: string;
  fixture: string;
  run: number;
  ok: boolean;
  degraded: boolean;
  error?: string;
  gates: Record<string, boolean>;
  metrics: Record<string, number>;
};
export type Stat = { mean: number; spread: number };
export type Meta = {
  label: string;
  startedAt: string;
  gitSha: string;
  models: { primary: string; fast: string };
  effort: string;
  /** SHA-256 of each core/*.md, so a comparison can say which prompts changed. */
  coreHashes: Record<string, string>;
  calls: number;
};
export type PromptSummary = {
  gatesPassed: boolean;
  failures: { fixture: string; run: number; gate: string }[];
  errors: number;
  degraded: number;
  metrics: Record<string, Stat>;
  fixtures: Record<string, Record<string, Stat & { values: number[] }>>;
};
export type Summary = { meta: Meta; prompts: Record<string, PromptSummary> };

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export function summarize(records: RunRecord[], meta: Meta): Summary {
  const prompts: Record<string, PromptSummary> = {};
  for (const name of [...new Set(records.map((r) => r.prompt))]) {
    const all = records.filter((r) => r.prompt === name);
    const scored = all.filter((r) => r.ok && !r.degraded);
    const failures = scored.flatMap((r) =>
      Object.entries(r.gates).filter(([, ok]) => !ok).map(([gate]) => ({ fixture: r.fixture, run: r.run, gate })),
    );

    const fixtures: PromptSummary['fixtures'] = {};
    for (const r of scored) {
      for (const [m, v] of Object.entries(r.metrics)) {
        const slot = ((fixtures[r.fixture] ??= {})[m] ??= { mean: 0, spread: 0, values: [] });
        slot.values.push(v);
      }
    }
    for (const byMetric of Object.values(fixtures)) {
      for (const s of Object.values(byMetric)) {
        s.mean = mean(s.values);
        s.spread = Math.max(...s.values) - Math.min(...s.values);
      }
    }

    const metrics: Record<string, Stat> = {};
    for (const m of [...new Set(Object.values(fixtures).flatMap((f) => Object.keys(f)))]) {
      const per = Object.values(fixtures).map((f) => f[m]).filter(Boolean);
      metrics[m] = { mean: mean(per.map((s) => s.mean)), spread: mean(per.map((s) => s.spread)) };
    }

    prompts[name] = {
      gatesPassed: failures.length === 0,
      failures,
      errors: all.filter((r) => !r.ok).length,
      degraded: all.filter((r) => r.ok && r.degraded).length,
      metrics,
      fixtures,
    };
  }
  return { meta, prompts };
}
```

- [ ] **Step 4: Run it and confirm it passes**

Run: `npx vitest run test/evals/summary.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Create `web/evals/registry.ts`**

```ts
import { tailorMessage, letterMessage, reviewMessage, matchMessage } from '../lib/messages';
import type { Fixture } from './fixtures';
import { scoreParse, scoreTailor, scoreLetter, scoreMatch, scoreReview, type Score } from './score';

export type PromptName = 'parse' | 'tailor' | 'letter' | 'match' | 'review';
export type PromptCase = {
  core: string;
  tier: 'primary' | 'fast';
  message: (fx: Fixture) => string;
  score: (text: string, fx: Fixture) => Score;
};

// Tailor, letter and match get the hand-checked JSON, as a stored master would be,
// so their scores do not depend on how well parse did. No skill answers: those are
// per person and the fixtures have none.
const json = (fx: Fixture) => JSON.stringify(fx.resume, null, 2);
const title = (fx: Fixture) => `${fx.company} — ${fx.role}`;

export const PROMPTS: Record<PromptName, PromptCase> = {
  parse: { core: 'resume-parse', tier: 'fast', message: (fx) => fx.resumeText, score: scoreParse },
  tailor: { core: 'resume-tailor', tier: 'primary', message: (fx) => tailorMessage(json(fx), title(fx), fx.description), score: scoreTailor },
  letter: { core: 'cover-letter', tier: 'primary', message: (fx) => letterMessage(json(fx), title(fx), fx.description), score: scoreLetter },
  match: { core: 'job-match', tier: 'primary', message: (fx) => matchMessage(json(fx), title(fx), fx.description), score: scoreMatch },
  review: { core: 'resume-review', tier: 'primary', message: (fx) => reviewMessage(fx.resumeText), score: scoreReview },
};
```

Check the tiers against the routes before moving on. `grep -n "tier:" app/api/*/route.ts app/api/*/*/route.ts lib/*.ts` should show `fast` only on parse (and the metric routes). If the review in `/api/chat` uses no tier, that means primary.

- [ ] **Step 6: Create `web/evals/run.ts`**

```ts
/**
 * Runs the prompt test set against the real model. Costs money: it prints the plan
 * and waits for Enter (or --yes) before the first call.
 *
 *   npm run eval -- --label baseline [--prompts tailor,letter] [--only junior,senior] [--runs 3] [--yes] [--dry-run]
 */
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { parseArgs } from 'node:util';
import { loadPrompt } from '../lib/prompts';
import { completeText, pickConfig } from '../lib/provider';
import { loadFixtures } from './fixtures';
import { PROMPTS, type PromptName } from './registry';
import { summarize, type RunRecord, type Meta } from './summary';

const { values: args } = parseArgs({
  options: {
    label: { type: 'string' },
    prompts: { type: 'string', default: Object.keys(PROMPTS).join(',') },
    only: { type: 'string' },
    runs: { type: 'string', default: '3' },
    yes: { type: 'boolean', default: false },
    'dry-run': { type: 'boolean', default: false },
  },
});

const label = args.label?.replace(/[^\w-]/g, '');
if (!label) throw new Error('--label is required, e.g. --label baseline');
const names = args.prompts!.split(',').map((s) => s.trim()) as PromptName[];
for (const n of names) if (!PROMPTS[n]) throw new Error(`Unknown prompt "${n}". Known: ${Object.keys(PROMPTS).join(', ')}`);
const runs = Number(args.runs);
if (!Number.isInteger(runs) || runs < 1) throw new Error('--runs must be a positive integer');
const only = args.only?.split(',').map((s) => s.trim());
const fixtures = loadFixtures().filter((f) => !only || only.includes(f.slug));
if (only && fixtures.length !== only.length) throw new Error(`Unknown fixture in --only: ${only.join(', ')}`);

const primary = pickConfig('primary')!;
const fast = pickConfig('fast') ?? primary;
const calls = names.length * fixtures.length * runs;
// Model names only — never keys.
console.log(`${names.length} prompts × ${fixtures.length} fixtures × ${runs} runs = ${calls} calls`);
console.log(`primary: ${primary.model} (effort ${primary.effort ?? 'default'}), fast: ${fast.model}`);
if (args['dry-run']) process.exit(0);
if (!args.yes) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  await rl.question('Press Enter to start, Ctrl+C to cancel. ');
  rl.close();
}

const coreDir = join(process.cwd(), '..', 'core');
const coreHashes = Object.fromEntries(
  readdirSync(coreDir).filter((f) => f.endsWith('.md')).map((f) => [f, createHash('sha256').update(readFileSync(join(coreDir, f))).digest('hex').slice(0, 12)]),
);
const stamp = new Date().toISOString().slice(0, 16).replace('T', '-').replace(':', '');
const outDir = join(process.cwd(), 'evals', 'runs', `${stamp}-${label}`);

const records: RunRecord[] = [];
let n = 0;
for (const name of names) {
  const p = PROMPTS[name];
  for (const fx of fixtures) {
    for (let run = 1; run <= runs; run++) {
      n++;
      const started = Date.now();
      try {
        const { text, degraded } = await completeText({
          system: loadPrompt(p.core),
          messages: [{ role: 'user', content: p.message(fx) }],
          tier: p.tier,
        });
        const ms = Date.now() - started;
        const dir = join(outDir, 'raw', name, fx.slug);
        mkdirSync(dir, { recursive: true });
        writeFileSync(join(dir, `${run}.txt`), text);
        const s = p.score(text, fx);
        records.push({ prompt: name, fixture: fx.slug, run, ok: true, degraded, gates: s.gates, metrics: { ...s.metrics, ms } });
        const failed = Object.entries(s.gates).filter(([, ok]) => !ok).map(([g]) => g);
        console.log(`[${n}/${calls}] ${name} ${fx.slug} #${run} ${ms}ms${degraded ? ' DEGRADED' : ''}${failed.length ? ' FAIL ' + failed.join(',') : ''}`);
      } catch (err) {
        // Status or error name only: provider messages are not printed in case they echo request details.
        const e = err as { status?: number; name?: string };
        const error = String(e?.status ?? e?.name ?? 'error');
        records.push({ prompt: name, fixture: fx.slug, run, ok: false, degraded: false, error, gates: {}, metrics: {} });
        console.log(`[${n}/${calls}] ${name} ${fx.slug} #${run} ERROR ${error}`);
      }
    }
  }
}

const meta: Meta = {
  label,
  startedAt: new Date().toISOString(),
  gitSha: execSync('git rev-parse --short HEAD').toString().trim(),
  models: { primary: primary.model, fast: fast.model },
  effort: primary.effort ?? 'default',
  coreHashes,
  calls,
};
const summary = summarize(records, meta);
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'summary.json'), JSON.stringify(summary, null, 2));
for (const [name, s] of Object.entries(summary.prompts)) {
  console.log(`${name}: gates ${s.gatesPassed ? 'PASS' : 'FAIL'}${s.errors ? `, ${s.errors} errors` : ''}${s.degraded ? `, ${s.degraded} degraded` : ''}`);
  for (const f of s.failures) console.log(`  ${f.fixture} #${f.run}: ${f.gate}`);
}
console.log(`\nWrote ${outDir}`);
```

- [ ] **Step 7: Add `tsx`, the scripts and the gitignore lines**

Run: `npm install -D tsx`

Add to the `scripts` block in `web/package.json`:

```json
    "eval": "tsx --env-file=.env.local evals/run.ts",
    "eval:compare": "tsx evals/compare.ts",
```

Append to `web/.gitignore`:

```
# prompt test set: raw model output and blind-pick keys stay local
/evals/runs/*/raw/
/evals/runs/*/blind/
```

- [ ] **Step 8: Dry-run (free) and type-check**

Run: `npm run eval -- --label smoke --dry-run`
Expected: `5 prompts × 12 fixtures × 3 runs = 180 calls` and the model names, then it exits. No call is made and no key is printed. If `.env.local` is missing, `tsx` errors on `--env-file`. Copy `web/.env.local` from the primary checkout (`D:\src\job-search-kit\web\.env.local`) and never commit it.

Run: `npx tsc --noEmit && npx vitest run`
Expected: no type errors, all tests pass.

- [ ] **Step 9: Commit**

```bash
git add evals/registry.ts evals/summary.ts evals/run.ts test/evals/summary.test.ts package.json package-lock.json .gitignore
git commit -m "feat(evals): runner that scores real prompt output and writes a summary"
```

---

### Task 6: Compare two runs, and the blind pick

**Files:**
- Create: `web/evals/compare.ts`
- Test: `web/test/evals/compare.test.ts`

**Interfaces:**
- Consumes: `Summary` (Task 5)
- Produces:
  ```ts
  export const DIRECTION: Record<string, 1 | -1 | 0>; // 1 higher is better, -1 lower is better, 0 neutral
  export function compareSummaries(before: Summary, after: Summary): string; // markdown
  export function writeBlind(beforeDir: string, afterDir: string, count: number, rng?: () => number): number; // files written
  ```

- [ ] **Step 1: Write the failing test**

```ts
// web/test/evals/compare.test.ts
import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { compareSummaries, writeBlind } from '@/evals/compare';
import { summarize, type Meta, type RunRecord } from '@/evals/summary';

const meta = (o: Partial<Meta> = {}): Meta => ({ label: 'x', startedAt: '', gitSha: 'a', models: { primary: 'k3', fast: 'k2' }, effort: 'low', coreHashes: { 'resume-tailor.md': 'aaa' }, calls: 1, ...o });
const rec = (o: Partial<RunRecord>): RunRecord => ({ prompt: 'tailor', fixture: 'junior', run: 1, ok: true, degraded: false, gates: { parses: true, noTrap: true }, metrics: { coverage: 0.5, filler: 3 }, ...o });

describe('compareSummaries', () => {
  const before = summarize([rec({})], meta({ label: 'baseline' }));
  const after = summarize([rec({ gates: { parses: true, noTrap: false }, metrics: { coverage: 0.75, filler: 1 } })], meta({ label: 'v2', coreHashes: { 'resume-tailor.md': 'bbb' } }));
  const md = compareSummaries(before, after);

  it('reports the gate change and the failing fixture', () => {
    expect(md).toContain('gates: PASS → FAIL');
    expect(md).toContain('junior #1: noTrap');
  });
  it('shows before, after and change with a direction marker', () => {
    expect(md).toMatch(/\| coverage \| 0\.50 \| 0\.75 \| \+0\.25 better \|/);
    expect(md).toMatch(/\| filler \| 3\.00 \| 1\.00 \| -2\.00 better \|/);
  });
  it('names the prompt files that changed', () => {
    expect(md).toContain('Changed prompts: resume-tailor.md');
  });
  it('warns when the model differs', () => {
    expect(compareSummaries(before, summarize([rec({})], meta({ models: { primary: 'other', fast: 'k2' } })))).toContain('Warning: models differ');
  });
});

describe('writeBlind', () => {
  it('writes A/B pairs and a key, with labels assigned by the rng', () => {
    const root = mkdtempSync(join(tmpdir(), 'blind-'));
    for (const [run, text] of [['before', 'OLD'], ['after', 'NEW']]) {
      mkdirSync(join(root, run, 'raw', 'tailor', 'junior'), { recursive: true });
      writeFileSync(join(root, run, 'raw', 'tailor', 'junior', '1.txt'), text);
    }
    const n = writeBlind(join(root, 'before'), join(root, 'after'), 4, () => 0.9);
    expect(n).toBe(1);
    const page = readFileSync(join(root, 'after', 'blind', 'tailor', 'junior.md'), 'utf8');
    expect(page.indexOf('## A')).toBeLessThan(page.indexOf('## B'));
    const key = JSON.parse(readFileSync(join(root, 'after', 'blind', 'key.json'), 'utf8'));
    expect(key['tailor/junior']).toEqual({ A: 'after', B: 'before' });
    expect(page.indexOf('NEW')).toBeLessThan(page.indexOf('OLD'));
    expect(readdirSync(join(root, 'after', 'blind'))).toContain('key.json');
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run test/evals/compare.test.ts`
Expected: FAIL, `Cannot find module '@/evals/compare'`

- [ ] **Step 3: Create `web/evals/compare.ts`**

```ts
/**
 *   npm run eval:compare -- evals/runs/<baseline> evals/runs/<new> [--blind 4]
 * Prints a before/after table per prompt, writes it to <new>/compare.md, and writes
 * blind A/B pages to <new>/blind/ when both runs still have raw output.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import type { Summary } from './summary';

/** 1 = higher is better, -1 = lower is better, 0 = no right direction (shown without a verdict). */
export const DIRECTION: Record<string, 1 | -1 | 0> = {
  coverage: 1, bulletStrength: 1, bandHit: 1,
  filler: -1, lost: -1, invented: -1, unverified: -1, ms: -1, bulletsRestored: -1, rolesDiff: -1, bulletsDiff: -1,
  metricNeeded: 0, words: 0, score: 0, requirements: 0, findings: 0, critical: 0,
};

const f2 = (x: number) => x.toFixed(2);

function verdict(metric: string, delta: number): string {
  const dir = DIRECTION[metric] ?? 0;
  if (dir === 0 || delta === 0) return '';
  return delta * dir > 0 ? ' better' : ' worse';
}

export function compareSummaries(before: Summary, after: Summary): string {
  const out: string[] = [`# ${before.meta.label} → ${after.meta.label}`, ''];
  const b = before.meta, a = after.meta;
  if (b.models.primary !== a.models.primary || b.models.fast !== a.models.fast || b.effort !== a.effort) {
    out.push(`Warning: models differ (${b.models.primary}/${b.models.fast}/${b.effort} → ${a.models.primary}/${a.models.fast}/${a.effort}).`, '');
  }
  const changed = Object.keys({ ...b.coreHashes, ...a.coreHashes }).filter((f) => b.coreHashes[f] !== a.coreHashes[f]);
  out.push(`Changed prompts: ${changed.length ? changed.join(', ') : 'none'}`, '');

  for (const name of Object.keys(after.prompts)) {
    const pa = after.prompts[name];
    const pb = before.prompts[name];
    const gate = (p?: { gatesPassed: boolean }) => (p ? (p.gatesPassed ? 'PASS' : 'FAIL') : '—');
    out.push(`## ${name}`, '', `gates: ${gate(pb)} → ${gate(pa)}`);
    for (const f of pa.failures) out.push(`- ${f.fixture} #${f.run}: ${f.gate}`);
    if (pa.errors || pa.degraded) out.push(`- ${pa.errors} errored, ${pa.degraded} degraded (not scored)`);
    out.push('', '| metric | before | after | change | spread before → after |', '|---|---|---|---|---|');
    for (const m of Object.keys(pa.metrics)) {
      const x = pb?.metrics[m];
      const y = pa.metrics[m];
      const delta = x ? y.mean - x.mean : 0;
      const sign = delta > 0 ? '+' : '';
      out.push(`| ${m} | ${x ? f2(x.mean) : '—'} | ${f2(y.mean)} | ${x ? sign + f2(delta) + verdict(m, delta) : '—'} | ${x ? f2(x.spread) : '—'} → ${f2(y.spread)} |`);
    }
    out.push('');
  }
  return out.join('\n');
}

/** One output from each version per fixture, labelled A/B at random; the key is written separately. */
export function writeBlind(beforeDir: string, afterDir: string, count: number, rng: () => number = Math.random): number {
  const key: Record<string, { A: string; B: string }> = {};
  const rawA = join(afterDir, 'raw');
  if (!existsSync(rawA) || !existsSync(join(beforeDir, 'raw'))) return 0;
  let written = 0;
  for (const prompt of readdirSync(rawA)) {
    const both = readdirSync(join(rawA, prompt)).filter((fx) => existsSync(join(beforeDir, 'raw', prompt, fx, '1.txt')) && existsSync(join(rawA, prompt, fx, '1.txt')));
    // Fisher–Yates with the injected rng, then take the first `count`.
    for (let i = both.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [both[i], both[j]] = [both[j], both[i]];
    }
    for (const fx of both.slice(0, count)) {
      const versions = { before: readFileSync(join(beforeDir, 'raw', prompt, fx, '1.txt'), 'utf8'), after: readFileSync(join(rawA, prompt, fx, '1.txt'), 'utf8') };
      const order: ['before' | 'after', 'before' | 'after'] = rng() < 0.5 ? ['before', 'after'] : ['after', 'before'];
      key[`${prompt}/${fx}`] = { A: order[0], B: order[1] };
      const dir = join(afterDir, 'blind', prompt);
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, `${fx}.md`), `# ${prompt} · ${fx}\n\n## A\n\n${versions[order[0]]}\n\n## B\n\n${versions[order[1]]}\n`);
      written++;
    }
  }
  if (written) writeFileSync(join(afterDir, 'blind', 'key.json'), JSON.stringify(key, null, 2));
  return written;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: { blind: { type: 'string', default: '4' } } });
  const [beforeDir, afterDir] = positionals;
  if (!beforeDir || !afterDir) throw new Error('Usage: npm run eval:compare -- <baseline run dir> <new run dir> [--blind 4]');
  const read = (d: string) => JSON.parse(readFileSync(join(d, 'summary.json'), 'utf8')) as Summary;
  const md = compareSummaries(read(beforeDir), read(afterDir));
  writeFileSync(join(afterDir, 'compare.md'), md);
  console.log(md);
  const n = writeBlind(beforeDir, afterDir, Number(values.blind));
  console.log(n ? `Blind pages: ${join(afterDir, 'blind')} (key in key.json, don't open it until you've picked)` : 'No blind pages: one of the runs has no raw output.');
}
```

In the writeBlind test, `rng` always returns 0.9. The shuffle has one element, so it doesn't matter, and the order check `0.9 < 0.5` is false, so A is `after`. That's what the test asserts.

- [ ] **Step 4: Run it and confirm it passes**

Run: `npx vitest run test/evals/compare.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Run the full suite and type-check**

Run: `npx vitest run && npx tsc --noEmit`
Expected: everything passes.

- [ ] **Step 6: Commit**

```bash
git add evals/compare.ts test/evals/compare.test.ts
git commit -m "feat(evals): before/after table and blind A/B pages"
```

---

### Task 7: Baseline run (checkpoint: costs money) and docs

**Files:**
- Create: `web/evals/runs/<stamp>-baseline/summary.json` (committed), `web/evals/README.md`
- Modify: `CLAUDE.md` (repo root): the module map, the Run/test section and the test count

- [ ] **Step 1: Write `web/evals/README.md`**

```markdown
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
```

- [ ] **Step 2: Update `CLAUDE.md`**

Add these rows to the "Web module map" table:

```
| `messages.ts` | the user message each prompt receives (`tailorMessage`, `letterMessage`, `reviewMessage`, `matchMessage`); routes and `evals/` share it |
```

Under "Repo layout", after `test/`:

```
  evals/                 prompt test set: 12 fictional pairs, scorers, runner (`npm run eval`, costs money), compare
```

Under "Run / test / deploy", add:

```bash
cd web && npm run eval -- --label <name> --dry-run   # prompt test set; drop --dry-run to spend
```

Update the test count in the `npm test` line to the number `npx vitest run` reports.

- [ ] **Step 3: Checkpoint. Stop and ask the owner before spending.**

Show the owner the dry-run output (`npm run eval -- --label baseline --dry-run`), which gives the call count and the models. Ask: "Run the full baseline (180 calls), a single-run baseline (60), or skip for now?" **Don't make any model call without a yes in chat.**

- [ ] **Step 4: Run the baseline (only after a yes)**

Run in the background, since it takes about 30–60 minutes for 180 calls at the timings in CLAUDE.md:
`npm run eval -- --label baseline --yes`

Then read `summary.json`. Expected: all gates pass. If any gate fails on the **current** prompts, that's a real finding, not a test bug, unless a raw output shows the scorer was wrong. Read the raw file named in the failure before deciding. Report gate failures to the owner as findings, and change no prompt in this plan.

- [ ] **Step 5: Commit the baseline and the docs**

```bash
git add evals/README.md evals/runs/*-baseline/summary.json ../CLAUDE.md
git commit -m "docs(evals): prompt test set baseline and usage"
```

Before pushing, scan the diff for key-shaped strings and `postgresql://`, as CLAUDE.md requires:
`git diff origin/main --stat && git diff origin/main | grep -nE "sk-[A-Za-z0-9]{20,}|postgresql://[^ ]+:[^ ]+@" || echo clean`

---

## Self-review notes

- Spec §1 (fixtures, integrity) → Task 4. §2 (builders) → Task 1. §3 (runner: plan, confirm, sequential, errors, degraded, output layout, meta, gitignore, no keys) → Task 5. §4 (scores and gates) → Tasks 2–3. §5 (compare, blind, warnings) → Task 6. §6 (offline tests) → every task. The baseline and docs → Task 7.
- Spec clarifications made while planning, and already in the spec: letters may quote the posting's own numbers; month words are exempt from parse's invented check; all of `blind/` is gitignored.
- The names used across tasks are `Score`, `Fixture`, `Truth`, `RunRecord`, `Meta`, `Summary`, `PROMPTS`, `scoreParse`/`scoreTailor`/`scoreLetter`/`scoreMatch`/`scoreReview`, `compareSummaries` and `writeBlind`. Each is defined once, in the task listed in its Interfaces block.
