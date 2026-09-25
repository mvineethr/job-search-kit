import { describe, it, expect } from 'vitest';
import { normalize, matchSource, verifyEvidence, viewMatch, band, MatchOutputSchema, type Requirement } from '@/lib/match';
import type { Resume } from '@/lib/resume-schema';

const resume: Resume = {
  name: 'Test Person',
  contact: {},
  summary: 'Platform engineer.',
  skills: ['CloudFormation', 'Python'],
  experience: [
    {
      title: 'Engineer',
      company: 'Acme',
      start: 'Mar 2019',
      end: 'Present',
      bullets: ['Managed AWS infrastructure with CloudFormation templates — across 40 accounts.'],
    },
  ],
  education: [],
};

function req(over: Partial<Requirement>): Requirement {
  return {
    id: 'x', skill: 'X', text: 'X', kind: 'must', category: 'skill', status: 'missing',
    evidence: '', question: '', why: '', ...over,
  };
}

describe('verifyEvidence', () => {
  const source = matchSource(resume);

  it('keeps a quote that differs only in punctuation and spacing', () => {
    const { requirements, unverified } = verifyEvidence(
      [req({ status: 'met', evidence: 'managed AWS infrastructure with CloudFormation templates - across 40 accounts' })],
      source,
    );
    expect(requirements[0].status).toBe('met');
    expect(unverified).toBe(0);
  });

  it('downgrades evidence the résumé does not contain', () => {
    const { requirements, unverified } = verifyEvidence(
      [req({ status: 'met', evidence: 'Led Terraform migration for 12 teams' })],
      source,
    );
    expect(requirements[0].status).toBe('missing');
    expect(requirements[0].evidence).toBe('');
    expect(unverified).toBe(1);
  });

  it('can verify a years quote from role dates', () => {
    const { requirements } = verifyEvidence([req({ category: 'years', status: 'met', evidence: 'Mar 2019 – Present' })], source);
    expect(requirements[0].status).toBe('met');
  });

  it('accepts a years span across roles when both ends are on the résumé', () => {
    const two: Resume = {
      ...resume,
      experience: [
        { ...resume.experience[0], start: 'Mar 2022', end: 'Present' },
        { ...resume.experience[0], start: 'Jun 2019', end: 'Feb 2022' },
      ],
    };
    const src = matchSource(two);
    const ok = verifyEvidence([req({ category: 'years', status: 'met', evidence: 'Jun 2019 – Present' })], src);
    expect(ok.requirements[0].status).toBe('met');
    const bad = verifyEvidence([req({ category: 'years', status: 'met', evidence: 'Jan 2015 – Present' })], src);
    expect(bad.requirements[0].status).toBe('missing');
    // Only for years: a skill quote must still be literal.
    const skill = verifyEvidence([req({ status: 'met', evidence: 'Jun 2019 – Present' })], src);
    expect(skill.requirements[0].status).toBe('missing');
  });

  it('downgrades met with no evidence at all', () => {
    expect(verifyEvidence([req({ status: 'partial' })], source).requirements[0].status).toBe('missing');
  });
});

describe('viewMatch', () => {
  const stored = (requirements: Requirement[]) => ({ requirements, unverified: 0, created_at: '' });

  it('weights must 3x nice, half credit for partial, leaves unknown out', () => {
    const v = viewMatch(
      stored([
        req({ id: 'a', status: 'met' }), // 3 of 3
        req({ id: 'b', status: 'partial' }), // 1.5 of 3
        req({ id: 'c', kind: 'nice', status: 'missing' }), // 0 of 1
        req({ id: 'd', category: 'authorization', status: 'unknown' }), // excluded
      ]),
      [],
    );
    expect(v.score).toBe(Math.round((100 * 4.5) / 7));
    expect(v.mustMet).toBe(1);
    expect(v.mustTotal).toBe(2);
    expect(v.checkYourself.map((r) => r.id)).toEqual(['d']);
  });

  it('answers raise a requirement and close its question, but never lower one', () => {
    const reqs = [
      req({ id: 'tf', skill: 'Terraform', status: 'missing', question: 'Terraform?' }),
      req({ id: 'py', skill: 'Python', status: 'met', evidence: 'Python' }),
    ];
    const before = viewMatch(stored(reqs), []);
    expect(before.openQuestions.map((r) => r.id)).toEqual(['tf']);

    const after = viewMatch(stored(reqs), [
      { skill: 'terraform ', level: 'solid', detail: 'two years at Acme' },
      { skill: 'Python', level: 'none', detail: '' },
    ]);
    expect(after.requirements[0].status).toBe('met');
    expect(after.requirements[0].evidence).toContain('two years at Acme');
    expect(after.requirements[1].status).toBe('met');
    expect(after.openQuestions).toEqual([]);
    expect(after.score).toBeGreaterThan(before.score!);
  });

  it('does not let a skill answer decide a hard filter', () => {
    const v = viewMatch(stored([req({ skill: 'AWS', category: 'certification', status: 'missing' })]), [
      { skill: 'AWS', level: 'deep', detail: '' },
    ]);
    expect(v.requirements[0].status).toBe('missing');
    expect(v.hardWarnings).toHaveLength(1);
  });

  it('warns on a must-have hard filter, including too few years', () => {
    const v = viewMatch(
      stored([
        req({ id: 'deg', category: 'education', status: 'missing' }),
        req({ id: 'yrs', category: 'years', status: 'partial', evidence: 'x' }),
        req({ id: 'loc', category: 'location', kind: 'nice', status: 'missing' }),
      ]),
      [],
    );
    expect(v.hardWarnings.map((r) => r.id)).toEqual(['deg', 'yrs']);
  });
});

describe('band', () => {
  it('uses the agreed thresholds', () => {
    expect(band(75).label).toBe('Strong fit');
    expect(band(74).label).toBe('Partial fit');
    expect(band(50).label).toBe('Partial fit');
    expect(band(49).label).toBe('Big gaps');
  });
});

describe('MatchOutputSchema', () => {
  it('accepts items with the empty-string keys left out, as the prompt allows', () => {
    const parsed = MatchOutputSchema.safeParse({
      requirements: [{ id: 'a', skill: 'A', text: 'A', kind: 'must', category: 'skill', status: 'missing' }],
    });
    expect(parsed.success).toBe(true);
  });

  it('normalize keeps letters and digits only', () => {
    expect(normalize('  “Mar 2019 – Present” ')).toBe('mar 2019 present');
  });
});
