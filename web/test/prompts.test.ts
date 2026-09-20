import { describe, it, expect } from 'vitest';
import { loadPrompt } from '@/lib/prompts';

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

  it('throws on an unknown capability rather than returning an empty prompt', () => {
    expect(() => loadPrompt('does-not-exist')).toThrow();
  });
});
