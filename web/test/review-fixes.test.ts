import { describe, it, expect } from 'vitest';
import { applyFix, badHoles, careerYears, checkFix, newNames } from '@/lib/review-fixes';
import { sourceText } from '@/lib/verify-tailoring';
import type { Resume } from '@/lib/resume-schema';

const resume: Resume = {
  name: 'Sam Rivera',
  contact: {},
  summary: 'Engineer who works on things.',
  skills: ['Python', 'Postgres'],
  experience: [
    {
      title: 'Backend Engineer',
      company: 'Acme',
      start: 'Jan 2021',
      end: 'Present',
      bullets: ['Responsible for the billing service.', 'Cut build time by 40% using Python caching.'],
    },
  ],
  education: [],
  certifications: ['AWS Certified Developer'],
};

describe('applyFix', () => {
  it('replaces a whole bullet that matches exactly', () => {
    const r = applyFix(resume, { before: 'Responsible for the billing service.', after: 'Ran the billing service.' });
    expect(r?.experience[0].bullets).toEqual(['Ran the billing service.', 'Cut build time by 40% using Python caching.']);
    expect(r?.summary).toBe(resume.summary);
  });

  it('replaces the summary, a skill and a certification', () => {
    expect(applyFix(resume, { before: resume.summary, after: 'Backend engineer.' })?.summary).toBe('Backend engineer.');
    expect(applyFix(resume, { before: 'Postgres', after: 'PostgreSQL' })?.skills).toEqual(['Python', 'PostgreSQL']);
    expect(applyFix(resume, { before: 'AWS Certified Developer', after: 'AWS Certified Developer – Associate' })?.certifications).toEqual([
      'AWS Certified Developer – Associate',
    ]);
  });

  it('replaces a phrase inside the one line that contains it', () => {
    const r = applyFix(resume, { before: 'Responsible for', after: 'Owned' });
    expect(r?.experience[0].bullets[0]).toBe('Owned the billing service.');
  });

  it('returns null when the text is nowhere, or in more than one line', () => {
    expect(applyFix(resume, { before: 'Led a team of 9', after: 'x' })).toBeNull();
    expect(applyFix(resume, { before: 'Python', after: 'x' })).not.toBeNull(); // the skill matches whole
    expect(applyFix(resume, { before: 'ing', after: 'x' })).toBeNull();
  });

  it('does not touch the original', () => {
    applyFix(resume, { before: 'Postgres', after: 'PostgreSQL' });
    expect(resume.skills).toEqual(['Python', 'Postgres']);
  });
});

describe('checkFix', () => {
  const before = 'Responsible for the billing service.';

  it('accepts a rewrite that uses only what is there, with a metric hole', () => {
    expect(checkFix(resume, { before, after: 'Ran the billing service, handling [METRIC NEEDED] charges a day.' })).toBe(true);
  });

  it('lets a stated outcome change its wording, not its direction', () => {
    const b = 'Cut build time by 40% using Python caching.';
    expect(checkFix(resume, { before: b, after: 'Reduced build time 40% with Python caching.' })).toBe(true);
    expect(checkFix(resume, { before: b, after: 'Increased build speed 40% with Python caching.' })).toBe(false);
  });

  it('rejects a bullet that gains an outcome its line never stated', () => {
    expect(checkFix(resume, { before, after: 'Ran the billing service, generating [METRIC NEEDED] leads a year.' })).toBe(false);
    expect(checkFix(resume, { before, after: 'Ran the billing service, cutting failed charges by [METRIC NEEDED]%.' })).toBe(false);
    expect(checkFix(resume, { before: 'Cut build time by 40% using Python caching.', after: 'Cut build time 40% with Python caching.' })).toBe(true);
  });

  it('rejects a bullet that names a skill or employer its line never named', () => {
    expect(checkFix(resume, { before, after: 'Rebuilt the billing service in Python.' })).toBe(false);
    expect(checkFix(resume, { before, after: "Ran Globex's billing service." })).toBe(false);
    expect(checkFix(resume, { before, after: "Ran Acme's billing service." })).toBe(true); // its own employer is true, if redundant
  });

  it('rejects a rewrite that adds a number', () => {
    expect(checkFix(resume, { before, after: 'Rebuilt the billing service, cutting failed charges by 30%.' })).toBe(false);
  });

  it('keeps a number that was already in the line', () => {
    expect(checkFix(resume, { before: 'Cut build time by 40% using Python caching.', after: 'Cut build time 40% by adding Python caching.' })).toBe(true);
  });

  it('lets the summary reuse a number from a bullet, but not a bullet', () => {
    const after = 'Backend engineer who cut build time by 40% with Python caching.';
    expect(checkFix(resume, { before: resume.summary, after })).toBe(true);
    expect(checkFix(resume, { before, after: 'Ran the billing service, cutting build time by 40%.' })).toBe(false);
    expect(checkFix(resume, { before: resume.summary, after: 'Backend engineer with 12+ years of Python.' })).toBe(false);
  });

  it('reads slash pairs as separate names', () => {
    expect(checkFix(resume, { before: resume.summary, after: 'Backend engineer working in Python/Postgres.' })).toBe(true);
  });

  it('rejects a rewrite that names a tool the résumé never mentions', () => {
    expect(checkFix(resume, { before, after: 'Moved the billing service to Kafka.' })).toBe(false);
  });

  it('rejects a fix that cannot be applied or changes nothing', () => {
    expect(checkFix(resume, { before: 'Not in the résumé', after: 'Anything' })).toBe(false);
    expect(checkFix(resume, { before, after: before })).toBe(false);
  });
});

describe('newNames', () => {
  it('ignores the capital that starts a sentence and names already in the résumé', () => {
    expect(newNames(sourceText(resume), 'Shipped billing at Acme. Tuned Postgres queries.')).toEqual([]);
  });

  it('flags capitalised words the résumé does not have', () => {
    expect(newNames(sourceText(resume), 'Shipped billing for Stripe and Visa.')).toEqual(['Stripe', 'Visa']);
  });

  it('reads a plural or possessive as the name it is built on', () => {
    expect(newNames(sourceText(resume), 'Ran billing on Postgres, tuning Postgres\'s indexes for Acmes.')).toEqual([]);
  });

  it('flags an acronym at the start of a sentence', () => {
    expect(newNames(sourceText(resume), 'GCP migration of billing.')).toEqual(['GCP']);
  });
});

describe('badHoles', () => {
  it('accepts holes that each stand for one counted thing', () => {
    expect(badHoles('Migrated [METRIC NEEDED] services serving [METRIC NEEDED] customers.')).toBe(false);
  });

  it('rejects holes in a row, units, trailing holes and more than two', () => {
    expect(badHoles('Fixed bugs, reducing [METRIC NEEDED] by [METRIC NEEDED].')).toBe(true);
    expect(badHoles('Reviewed [METRIC NEEDED] pull requests per [METRIC NEEDED].')).toBe(true);
    expect(badHoles('Migrated services to Docker, [METRIC NEEDED].')).toBe(true);
    expect(badHoles('[METRIC NEEDED] a, [METRIC NEEDED] b and [METRIC NEEDED] c.')).toBe(true);
  });
});

describe('years in the summary', () => {
  const today = new Date(Date.UTC(2026, 9, 17)); // Oct 2026; Acme starts Jan 2021 → 5 whole years

  it('counts whole years from the earliest start', () => {
    expect(careerYears(resume, today)).toBe(5);
    expect(careerYears({ ...resume, experience: [{ ...resume.experience[0], start: '2021' }] }, today)).toBe(4);
    expect(careerYears({ ...resume, experience: [{ ...resume.experience[0], start: '' }] }, today)).toBeNull();
  });

  it('allows a years claim the dates support, and no more', () => {
    expect(checkFix(resume, { before: resume.summary, after: 'Backend engineer with 5 years of Python.' }, today)).toBe(true);
    expect(checkFix(resume, { before: resume.summary, after: 'Backend engineer with 5+ years of Python.' }, today)).toBe(true);
    expect(checkFix(resume, { before: resume.summary, after: 'Backend engineer with 8 years of Python.' }, today)).toBe(false);
  });

  it('never lets a bullet claim years', () => {
    expect(checkFix(resume, { before: 'Responsible for the billing service.', after: 'Ran the billing service for 5 years.' }, today)).toBe(false);
  });
});
