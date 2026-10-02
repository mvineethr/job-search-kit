import { describe, it, expect } from 'vitest';
import { BuildAnswersSchema, answersToText } from '@/lib/build-answers';
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
