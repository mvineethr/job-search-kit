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
