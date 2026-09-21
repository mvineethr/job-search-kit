/**
 * Copies ../core into web/core so the app can be built from web/ alone.
 *
 * Hosts build from the app directory and cannot see a parent, but core/ must
 * stay at the repo root because the Claude Code plugin reads it from there.
 * Copying at build time keeps one source of truth and one deployable directory.
 *
 * web/core is gitignored — it is a build artifact, never edited by hand.
 */
import { cpSync, existsSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const webDir = dirname(dirname(fileURLToPath(import.meta.url)));
const source = join(webDir, '..', 'core');
const target = join(webDir, 'core');

if (!existsSync(source)) {
  // Already-copied deployments have no parent core/; that is expected and fine.
  if (existsSync(target)) {
    console.log('[copy-core] no ../core, using the existing web/core');
    process.exit(0);
  }
  console.error('[copy-core] neither ../core nor web/core exists — cannot build');
  process.exit(1);
}

rmSync(target, { recursive: true, force: true });
cpSync(source, target, { recursive: true });
console.log('[copy-core] copied ../core -> web/core');
