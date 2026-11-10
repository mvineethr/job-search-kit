import { describe, it, expect } from 'vitest';
import { greetingFor, unsupportedNumbers, verifyLinkedIn, EmailSchema, LinkedInSchema, emailWords, displayName } from '@/lib/outreach';
import { numbersIn, hasNumber } from '@/lib/verify-tailoring';
import { emailMessage, linkedinMessage } from '@/lib/messages';
import { loadPrompt } from '@/lib/prompts';

describe('greetingFor', () => {
  it('uses only the first word the person typed', () => {
    expect(greetingFor('Sam Ortiz, engineering manager')).toBe('Hi Sam,');
    expect(greetingFor('  ')).toBe('Hello,');
    expect(greetingFor('Dr.')).toBe('Hi Dr,');
  });
});

describe('unsupportedNumbers', () => {
  it('flags numbers the source never states', () => {
    expect(unsupportedNumbers(['Cut latency 41% for 1,200 users'], 'cut p99 latency 41%')).toEqual(['1,200']);
  });
  it('drops trailing punctuation and matches whole numbers only', () => {
    expect(numbersIn('from 30 a week to 9, and 1.8s.')).toEqual(['30', '9', '1.8']);
    expect(hasNumber('latency 1.8s', '8')).toBe(false);
    expect(hasNumber('latency 1.8s', '1.8')).toBe(true);
    expect(hasNumber('pages to 9, then', '9')).toBe(true);
    expect(hasNumber('400 nodes', '40')).toBe(false);
  });
});

describe('verifyLinkedIn', () => {
  const out = LinkedInSchema.parse({
    audit: [
      { area: 'headline', problem: 'Vague', quote: 'Engineer at Halcyon' },
      { area: 'about', problem: 'Invented quote', quote: 'I love synergy' },
    ],
    headline: { current: 'Engineer at Halcyon', suggested: ['SRE at Halcyon Payments, 99.99% uptime'] },
    about: { current: 'Not really in the profile', suggested: 'I keep payments up.' },
    experience: [
      { title: 'SRE', company: 'Halcyon Payments', bullets: ['Ran on-call for 12 services'] },
      { title: 'Lead', company: 'Made Up Corp', bullets: ['x'] },
    ],
    skills: ['Kubernetes', 'Rust'],
  });
  const source = 'sre halcyon payments kubernetes on-call for 12 services';
  const v = verifyLinkedIn(out, source, 'Engineer at Halcyon');

  it('drops roles and skills absent from the source', () => {
    expect(v.experience.map((r) => r.company)).toEqual(['Halcyon Payments']);
    expect(v.removedRoles).toEqual(['Lead, Made Up Corp']);
    expect(v.skills).toEqual(['Kubernetes']);
    expect(v.removedSkills).toEqual(['Rust']);
  });
  it('keeps only quotes that are really in the profile', () => {
    expect(v.audit.map((a) => a.quote)).toEqual(['Engineer at Halcyon', '']);
    expect(v.headline.current).toBe('Engineer at Halcyon');
    expect(v.about.current).toBe('');
  });
  it('flags invented numbers in what it wrote', () => {
    expect(v.unsupportedNumbers).toEqual(['99.99%']);
  });
  it('checks numbers against the résumé only, including the identity line', () => {
    const w = verifyLinkedIn({ ...out, identity: 'Cut AWS spend 35%' }, source, 'Cut our AWS bill by 35%');
    expect(w.unsupportedNumbers).toEqual(['35%', '99.99%']);
  });
});

describe('cold email', () => {
  it('fixes an all-caps name only', () => {
    expect(displayName('DANA OKAFOR')).toBe('Dana Okafor');
    expect(displayName("MARY-JANE O'NEIL")).toBe("Mary-Jane O'Neil");
    expect(displayName('Dana McKay')).toBe('Dana McKay');
  });
  it('schema needs a subject and a paragraph', () => {
    expect(EmailSchema.safeParse({ subject: 'Hi', paragraphs: [] }).success).toBe(false);
    expect(emailWords({ paragraphs: ['one two', 'three'] })).toBe(3);
  });
  it('message lists the blanks plainly and includes the job only when given', () => {
    const m = emailMessage({ situation: 'referral', to: '', why: '', aimingFor: 'SRE', resumeText: 'R' });
    expect(m).toBe('SITUATION: referral\nTO: (blank)\nWHY THEM: (blank)\nAIMING FOR: SRE\n\nMY RESUME:\nR');
    expect(emailMessage({ situation: 'referral', to: 'Sam', why: '', aimingFor: null, resumeText: 'R', job: { title: 'Acme — SRE', description: 'D' } })).toContain('THE JOB (Acme — SRE):\nD');
  });
  it('linkedin message has every section', () => {
    expect(linkedinMessage({ aimingFor: null, savedRoles: ['SRE'], linkedinText: '', resumeText: 'R' })).toBe(
      'AIMING FOR: (blank)\nROLES THEY SAVED: SRE\n\nMY LINKEDIN:\n(blank)\n\nMY RESUME:\nR',
    );
  });
  it('both prompts load with the ATS rules filled in', () => {
    for (const p of ['cold-email', 'linkedin-profile']) expect(loadPrompt(p)).not.toContain('{{ATS_RULES}}');
  });
});
