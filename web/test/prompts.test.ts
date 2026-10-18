import { describe, it, expect } from 'vitest';
import { loadPrompt, PROMPT_EFFORT } from '@/lib/prompts';

describe('PROMPT_EFFORT', () => {
  it('names only prompts that exist, so a renamed prompt cannot silently lose its effort', () => {
    for (const name of Object.keys(PROMPT_EFFORT)) expect(() => loadPrompt(name)).not.toThrow();
    expect(PROMPT_EFFORT['resume-review']).toBe('medium');
  });
});

describe('loadPrompt', () => {
  it('loads the review prompt', () => {
    const p = loadPrompt('resume-review');
    expect(p).toContain('Resume Review');
  });

  it('substitutes the ATS rules into the prompt', () => {
    const p = loadPrompt('resume-review');
    expect(p).not.toContain('{{ATS_RULES}}');
    expect(p).toContain('Single column only');
  });

  it('loads the build prompt with the ATS rules substituted', () => {
    const p = loadPrompt('resume-build');
    expect(p).toContain('Resume Build');
    expect(p).not.toContain('{{ATS_RULES}}');
  });

  it('throws on an unknown capability rather than returning an empty prompt', () => {
    expect(() => loadPrompt('does-not-exist')).toThrow();
  });
});
