import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * core/ lives at the repo root and is shared with the Claude Code plugin, so it
 * sits outside this app. Locally we read it in place; for deployment `prebuild`
 * copies it to web/core, because a host that builds from web/ cannot see a
 * parent directory. Local copy wins so a stale copy is never preferred in dev.
 */
function resolveCoreDir(): string {
  const candidates = [join(process.cwd(), '..', 'core'), join(process.cwd(), 'core')];
  for (const dir of candidates) {
    if (existsSync(join(dir, 'ats-rules.md'))) return dir;
  }
  throw new Error(
    `core/ not found. Looked in: ${candidates.join(', ')}. Run "npm run prebuild" to copy it.`,
  );
}

/** Capabilities the web app can run. Adding one means adding a core/<name>.md file. */
const KNOWN = new Set(['resume-review', 'resume-parse', 'resume-tailor']);

const cache = new Map<string, string>();

export function loadPrompt(name: string): string {
  if (!KNOWN.has(name)) {
    throw new Error(`Unknown capability: ${name}`);
  }
  const cached = cache.get(name);
  if (cached) return cached;

  const coreDir = resolveCoreDir();
  const body = readFileSync(join(coreDir, `${name}.md`), 'utf8');
  const rules = readFileSync(join(coreDir, 'ats-rules.md'), 'utf8');
  const resolved = body.split('{{ATS_RULES}}').join(rules);

  cache.set(name, resolved);
  return resolved;
}
