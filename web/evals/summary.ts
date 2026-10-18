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
      gatesPassed: scored.length > 0 && failures.length === 0,
      failures,
      errors: all.filter((r) => !r.ok).length,
      degraded: all.filter((r) => r.ok && r.degraded).length,
      metrics,
      fixtures,
    };
  }
  return { meta, prompts };
}
