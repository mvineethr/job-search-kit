import { describe, it, expect } from 'vitest';
import { contentWords, resumeWords, hasTerm, coverage, bulletStrength } from '@/evals/score';
import { ResumeSchema } from '@/lib/resume-schema';
import fixture from '../fixtures/priya.json';

describe('contentWords', () => {
  it('lowercases, keeps diacritics, drops short words and stopwords', () => {
    expect([...contentWords('Nguyễn led the São Paulo team, and 40 of us')].sort())
      .toEqual(['led', 'nguyễn', 'paulo', 'são', 'team']);
  });
});

describe('resumeWords', () => {
  it('includes name, contact and dates as well as body text', () => {
    const w = resumeWords(ResumeSchema.parse(fixture));
    for (const x of ['priya', 'raman', 'austin', 'meridian', 'kubernetes', '2019']) expect(w.has(x)).toBe(true);
  });
});

describe('hasTerm', () => {
  it('matches whole words case-insensitively, including hyphens and diacritics', () => {
    expect(hasTerm('Ran the on-call rotation', 'on-call')).toBe(true);
    expect(hasTerm('Wrote Go services', 'go')).toBe(true);
    expect(hasTerm('years ago', 'go')).toBe(false);
    expect(hasTerm('Universidade de São Paulo', 'são paulo')).toBe(true);
    expect(hasTerm('Dynamics 365', 'dynamic')).toBe(false);
  });
});

describe('coverage', () => {
  it('is the share of terms present', () => {
    expect(coverage('Kubernetes and AWS', ['kubernetes', 'aws', 'gcp', 'terraform'])).toBe(0.5);
    expect(coverage('anything', [])).toBe(1);
  });
});

describe('bulletStrength', () => {
  const banned = ['spearheaded', 'leveraged'];
  it('needs a non-banned, non-gerund first word and a number or [METRIC NEEDED]', () => {
    expect(bulletStrength([
      'Cut deploy time from 34 to 6 minutes.', // strong
      'Spearheaded a 40% cost cut.',           // banned verb
      'Managing 12 engineers.',                // gerund
      'Owned the release process.',            // no number
      'Reduced incidents by [METRIC NEEDED].', // strong
    ], banned)).toBe(0.4);
    expect(bulletStrength([], banned)).toBe(0);
  });
});
