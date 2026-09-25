import { describe, it, expect } from 'vitest';
import { loadAtsRules } from '@/lib/prompts';
import { bannedPhrases, findGenericPhrases } from '@/lib/generic-phrases';

describe('bannedPhrases', () => {
  const phrases = bannedPhrases(loadAtsRules());

  it('reads both lists from core/ats-rules.md, including wrapped lines', () => {
    expect(phrases).toContain('spearheaded');
    expect(phrases).toContain('owned the vision'); // on the wrapped line of Verbs
    expect(phrases).toContain('results-driven');
    expect(phrases).toContain('think outside the box');
    expect(phrases).not.toContain('multi-column / canva-style templates');
  });
});

describe('findGenericPhrases', () => {
  const phrases = ['spearheaded', 'dynamic', 'strategic', 'results-driven'];

  it('flags whole words case-insensitively and says where', () => {
    const hits = findGenericPhrases(
      [{ where: 'Summary', text: 'Results-driven engineer who Spearheaded the migration.' }],
      phrases,
    );
    expect(hits.map((h) => h.phrase)).toEqual(['spearheaded', 'results-driven']);
    expect(hits[0].where).toBe('Summary');
  });

  it('does not match inside other words', () => {
    const hits = findGenericPhrases([{ where: 'x', text: 'Built on Microsoft Dynamics 365.' }], phrases);
    expect(hits).toEqual([]);
  });

  it('skips words the posting itself uses', () => {
    const hits = findGenericPhrases(
      [{ where: 'x', text: 'Led strategic planning for a dynamic team.' }],
      phrases,
      'We want someone with strategic planning experience.',
    );
    expect(hits.map((h) => h.phrase)).toEqual(['dynamic']);
  });
});
