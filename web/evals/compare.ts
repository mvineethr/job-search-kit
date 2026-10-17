/**
 *   npm run eval:compare -- evals/runs/<baseline> evals/runs/<new> [--blind 4]
 * Prints a before/after table per prompt, writes it to <new>/compare.md, and writes
 * blind A/B pages to <new>/blind/ when both runs still have raw output.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
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

// Run as a CLI only (not when Vitest imports it). import.meta is unavailable: tsx loads this as CJS.
if (process.argv[1]?.replace(/\\/g, '/').endsWith('evals/compare.ts')) {
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
