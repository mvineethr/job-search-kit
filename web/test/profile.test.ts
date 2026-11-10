import { describe, expect, it } from 'vitest';
import { parsePreferences, type Preferences } from '@/lib/profile';
import { profileLines } from '@/lib/messages';

const form = (entries: [string, string][]) => {
  const f = new FormData();
  for (const [k, v] of entries) f.append(k, v);
  return f;
};

describe('parsePreferences', () => {
  it('trims text, splits up to five roles, and drops values not on the lists', () => {
    const p = parsePreferences(
      form([
        ['field', '  Pediatric nursing '],
        ['target_roles', 'Charge nurse, Clinical educator\nA,B,C,D'],
        ['seniority', 'Supreme leader'],
        ['work_setup', 'Remote'],
        ['work_setup', 'Moon base'],
        ['needs_sponsorship', 'maybe'],
        ['goals', ''],
      ]),
    );
    expect(p.field).toBe('Pediatric nursing');
    expect(p.target_roles).toEqual(['Charge nurse', 'Clinical educator', 'A', 'B', 'C']);
    expect(p.seniority).toBeNull();
    expect(p.work_setup).toEqual(['Remote']);
    expect(p.needs_sponsorship).toBeNull();
    expect(p.goals).toBeNull();
  });
  it('caps long text', () => {
    expect(parsePreferences(form([['goals', 'x'.repeat(5000)]])).goals).toHaveLength(1000);
  });
});

describe('profileLines', () => {
  it('sends only the writing fields, never sponsorship, pay, places or dealbreakers', () => {
    const preferences: Preferences = {
      field: 'Nursing',
      target_roles: ['Educator'],
      seniority: 'Senior',
      goals: 'Teach',
      interests: 'Public health',
      work_setup: ['Remote'],
      places: 'Ohio',
      needs_sponsorship: 'yes',
      pay_floor: '90k',
      dealbreakers: 'No nights',
      strengths: 'Calm',
    };
    const out = profileLines({ target_role: 'Charge nurse', preferences });
    expect(out).toContain('AIMING FOR: Charge nurse; Educator');
    expect(out).toContain('STRENGTHS IN THEIR WORDS: Calm');
    for (const secret of ['Ohio', 'yes', '90k', 'No nights', 'Remote']) expect(out).not.toContain(secret);
  });
});
