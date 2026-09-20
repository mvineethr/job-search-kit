import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * core/ lives at the repo root, one level above this app, and is shared with the
 * Claude Code plugin. Resolved from cwd, which is web/ in dev, in the Vercel build,
 * and under Vitest.
 */
const CORE_DIR = join(process.cwd(), '..', 'core');

/** Capabilities the web app can run. Adding one means adding a core/<name>.md file. */
const KNOWN = new Set(['resume-review']);

const cache = new Map<string, string>();

export function loadPrompt(name: string): string {
  if (!KNOWN.has(name)) {
    throw new Error(`Unknown capability: ${name}`);
  }
  const cached = cache.get(name);
  if (cached) return cached;

  const body = readFileSync(join(CORE_DIR, `${name}.md`), 'utf8');
  const rules = readFileSync(join(CORE_DIR, 'ats-rules.md'), 'utf8');
  const resolved = body.split('{{ATS_RULES}}').join(rules);

  cache.set(name, resolved);
  return resolved;
}
