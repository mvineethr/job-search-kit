import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const css = readFileSync('app/globals.css', 'utf8');

/** Custom properties declared in the first block that starts with `selector{`. */
function block(selector: string): Record<string, string> {
  const start = css.indexOf(selector + '{');
  if (start < 0) throw new Error(`no block ${selector}`);
  const body = css.slice(start + selector.length + 1, css.indexOf('}', start));
  const out: Record<string, string> = {};
  for (const m of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
}

function luminance(hex: string): number {
  const n = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255);
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const light = block(':root');
const dark = { ...light, ...block(':root[data-theme="dark"]') };

// [foreground, background] pairs that carry text and must reach WCAG AA (4.5:1).
const PAIRS: [string, string][] = [
  ['--text', '--bg-page'],
  ['--text-muted', '--bg-surface'],
  ['--text-muted', '--bg-page'],
  ['--accent', '--bg-surface'],
  ['--on-accent', '--accent'],
  ['--on-accent', '--accent-hover'],
  ['--accent-text', '--bg-surface'],
  ['--accent-text', '--accent-subtle'],
  ['--ok-text', '--ok-subtle'],
  ['--ok-text', '--bg-surface'],
  ['--warn-text', '--warn-subtle'],
  ['--warn-text', '--bg-surface'],
  ['--danger-text', '--danger-subtle'],
  ['--danger-text', '--bg-surface'],
];

describe.each([
  ['light', light],
  ['dark', dark],
])('%s tokens', (_name, t) => {
  it.each(PAIRS)('%s on %s reaches 4.5:1', (fg, bg) => {
    expect(t[fg], fg).toMatch(/^#[0-9a-f]{6}$/i);
    expect(t[bg], bg).toMatch(/^#[0-9a-f]{6}$/i);
    expect(contrast(t[fg], t[bg])).toBeGreaterThanOrEqual(4.5);
  });
});

it('the prefers-color-scheme dark block matches the data-theme dark block', () => {
  expect(block(':root:not([data-theme="light"])')).toEqual(block(':root[data-theme="dark"]'));
});
