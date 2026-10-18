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
import { loadPrompt, PROMPT_EFFORT } from '../lib/prompts';
import { completeText, pickConfig } from '../lib/provider';
import { loadFixtures } from './fixtures';
import { PROMPTS, type PromptName } from './registry';
import { summarize, type RunRecord, type Meta } from './summary';

// package.json has no "type": "module", so tsx loads this as CJS: no top-level await.
async function main() {
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
  if (args['dry-run']) return;

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

  // Fixed before the loop: a failing git call must not discard a finished paid run.
  let gitSha = 'unknown';
  try {
    gitSha = execSync('git rev-parse --short HEAD').toString().trim();
  } catch {}
  const startedAt = new Date().toISOString();

  const records: RunRecord[] = [];
  const meta: Meta = {
    label,
    startedAt,
    gitSha,
    models: { primary: primary.model, fast: fast.model },
    effort: primary.effort ?? 'default',
    coreHashes,
    calls,
  };
  // Saves whatever has been scored so far; runs once, from the loop's finally or from SIGINT.
  let written = false;
  const finish = () => {
    if (written) return;
    written = true;
    const summary = summarize(records, meta);
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, 'summary.json'), JSON.stringify(summary, null, 2));
    for (const [name, s] of Object.entries(summary.prompts)) {
      console.log(`${name}: ${Object.keys(s.fixtures).length === 0 ? 'no scored runs' : 'gates ' + (s.gatesPassed ? 'PASS' : 'FAIL')}${s.errors ? `, ${s.errors} errors` : ''}${s.degraded ? `, ${s.degraded} degraded` : ''}`);
      for (const f of s.failures) console.log(`  ${f.fixture} #${f.run}: ${f.gate}`);
    }
    console.log(`
Wrote ${outDir}`);
  };
  process.once('SIGINT', () => {
    finish();
    process.exit(130);
  });

  let n = 0;
  try {
  for (const name of names) {
    const p = PROMPTS[name];
    for (const fx of fixtures) {
      for (let run = 1; run <= runs; run++) {
        n++;
        const started = Date.now();
        let result: { text: string; degraded: boolean };
        try {
          result = await completeText({
            system: loadPrompt(p.core),
            messages: [{ role: 'user', content: p.message(fx) }],
            tier: p.tier,
            effort: PROMPT_EFFORT[p.core],
          });
        } catch (err) {
          // Status or error name only: provider messages are not printed in case they echo request details.
          const e = err as { status?: number; name?: string };
          const error = String(e?.status ?? e?.name ?? 'error');
          records.push({ prompt: name, fixture: fx.slug, run, ok: false, degraded: false, error, gates: {}, metrics: {} });
          console.log(`[${n}/${calls}] ${name} ${fx.slug} #${run} ERROR ${error}`);
          continue;
        }
        // Outside the try: a scorer bug or disk error must throw, not look like a model error.
        const { text, degraded } = result;
        const ms = Date.now() - started;
        const dir = join(outDir, 'raw', name, fx.slug);
        mkdirSync(dir, { recursive: true });
        // Degraded output (fallback model) is kept but named apart, so blind pages never pick it.
        writeFileSync(join(dir, `${run}${degraded ? '.degraded' : ''}.txt`), text);
        const s = p.score(text, fx);
        records.push({ prompt: name, fixture: fx.slug, run, ok: true, degraded, gates: s.gates, metrics: { ...s.metrics, ms } });
        const failed = Object.entries(s.gates).filter(([, ok]) => !ok).map(([g]) => g);
        console.log(`[${n}/${calls}] ${name} ${fx.slug} #${run} ${ms}ms${degraded ? ' DEGRADED' : ''}${failed.length ? ' FAIL ' + failed.join(',') : ''}`);
      }
    }
  }
  } finally {
    finish();
  }
}

main().catch((err) => {
  console.error((err as Error)?.message ?? err);
  process.exit(1);
});
