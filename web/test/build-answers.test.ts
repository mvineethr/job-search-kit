import { describe, it, expect } from 'vitest';
import { BuildAnswersSchema, answersToText, stripUnsupportedClaims } from '@/lib/build-answers';
import { verifyTailoring } from '@/lib/verify-tailoring';
import type { Resume } from '@/lib/resume-schema';

const answers = BuildAnswersSchema.parse({
  name: 'Sam Okafor',
  email: 'sam@example.com',
  roles: [
    { title: 'Shift lead', company: 'Corner Café', start: '2022', end: 'Present', did: 'Ran the morning shift, trained 4 new staff, did the stock orders' },
  ],
  education: [{ degree: 'BTEC Business', school: 'Leeds College' }],
  skills: 'Excel, rota planning',
});

describe('answersToText', () => {
  it('keeps every answer, in the person’s own words', () => {
    const t = answersToText(answers);
    expect(t).toContain('Name: Sam Okafor');
    expect(t).toContain('Company: Corner Café');
    expect(t).toContain('Dates: 2022 – Present');
    expect(t).toContain('trained 4 new staff');
    expect(t).toContain('Education: BTEC Business, Leeds College');
    expect(t).toContain('Skills: Excel, rota planning');
  });
});

describe('BuildAnswersSchema', () => {
  it('needs a name and at least one role with a description', () => {
    expect(BuildAnswersSchema.safeParse({ name: 'X', roles: [] }).success).toBe(false);
    expect(
      BuildAnswersSchema.safeParse({ name: '', roles: [{ title: 'a', company: 'b', did: 'did lots of things' }] }).success,
    ).toBe(false);
  });
});

describe('verifying a built résumé against the answers', () => {
  const built: Resume = {
    name: 'Sam Okafor',
    contact: { email: 'sam@example.com' },
    summary: '',
    skills: ['Excel', 'Salesforce'],
    experience: [
      {
        title: 'Shift lead',
        company: 'Corner Café',
        start: '2022',
        end: 'Present',
        bullets: ['Trained 4 new staff', 'Cut waste by 30%'],
      },
    ],
    education: [],
  };

  it('strips a skill the answers never mention and flags an invented number', () => {
    const { cleaned, audit } = verifyTailoring(built, null, answersToText(answers));
    expect(cleaned.skills).toEqual(['Excel']);
    expect(audit.unsupportedNumbers).toContain('30%');
    expect(audit.unsupportedNumbers).not.toContain('4');
  });
});

describe('stripUnsupportedClaims', () => {
  // Codex review on PR #3: the builder saved a master with invented numbers and
  // employers still in it, and masters show no audit. The answers are the only
  // source for a built résumé, so unsupported claims are removed, not reported.
  const built: Resume = {
    name: 'Sam Okafor',
    contact: {},
    summary: 'Shift lead who cut waste by 30%.',
    skills: ['Excel'],
    experience: [
      { title: 'Shift lead', company: 'Corner Café', start: '2022', end: 'Present', bullets: ['Trained 4 new staff', 'Cut waste by 30%', 'Served 300 customers a day'] },
      { title: 'Barista', company: 'Starbucks', start: '2020', end: '2022', bullets: ['Made coffee'] },
    ],
    education: [],
  };

  it('replaces invented numbers with the marker, keeps the person’s own, and drops invented employers', () => {
    const source = answersToText(answers);
    const { audit } = verifyTailoring(built, null, source);
    const out = stripUnsupportedClaims(built, audit);

    expect(out.experience.map((r) => r.company)).toEqual(['Corner Café']);
    expect(out.experience[0].bullets).toEqual([
      'Trained 4 new staff',
      'Cut waste by [METRIC NEEDED]',
      'Served [METRIC NEEDED] customers a day',
    ]);
    expect(out.summary).toBe('Shift lead who cut waste by [METRIC NEEDED].');
    // Nothing unsupported is left for the verifier to find.
    const again = verifyTailoring(out, null, source).audit;
    expect(again.unsupportedNumbers).toEqual([]);
    expect(again.unsupportedEmployers).toEqual([]);
  });

  it('never leaves a résumé with no roles', () => {
    const allInvented: Resume = { ...built, experience: [built.experience[1]] };
    const { audit } = verifyTailoring(allInvented, null, answersToText(answers));
    expect(() => stripUnsupportedClaims(allInvented, audit)).toThrow();
  });
});
