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
