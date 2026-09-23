import { describe, it, expect } from 'vitest';
import { verifyTailoring, numbersIn } from '@/lib/verify-tailoring';
import { ResumeSchema, type Resume } from '@/lib/resume-schema';
import fixture from './fixtures/priya.json';

const original: Resume = ResumeSchema.parse(fixture);

function tailoredFrom(changes: Partial<Resume>): Resume {
  return { ...structuredClone(original), ...changes };
}

describe('verifyTailoring — skills', () => {
  // The real failure: eight skills appeared that the source never mentioned,
  // lifted from the job posting. ServiceNow on your résumé is a problem at interview.
  it('removes a skill the source résumé never mentions', () => {
    const tailored = tailoredFrom({ skills: [...original.skills, 'ServiceNow'] });
    const { cleaned, audit } = verifyTailoring(tailored, original);
    expect(cleaned.skills).not.toContain('ServiceNow');
    expect(audit.removedSkills).toEqual(['ServiceNow']);
  });

  it('keeps a skill that is in the source skills list', () => {
    const tailored = tailoredFrom({ skills: ['Kubernetes'] });
    const { cleaned, audit } = verifyTailoring(tailored, original);
    expect(cleaned.skills).toEqual(['Kubernetes']);
    expect(audit.removedSkills).toEqual([]);
  });

  it('keeps a skill that appears only in a bullet, not the skills list', () => {
    // "error-budget policy" is in a bullet; claiming it is honest.
    const tailored = tailoredFrom({ skills: ['error-budget policy'] });
    const { cleaned } = verifyTailoring(tailored, original);
    expect(cleaned.skills).toEqual(['error-budget policy']);
  });

  it('is case-insensitive', () => {
    const tailored = tailoredFrom({ skills: ['KUBERNETES'] });
    expect(verifyTailoring(tailored, original).cleaned.skills).toEqual(['KUBERNETES']);
  });

  it('keeps a skill the person confirmed, even though the résumé never mentions it', () => {
    // The point of asking: résumés are incomplete, and a confirmed skill is real.
    const tailored = tailoredFrom({ skills: ['Istio'] });
    const { cleaned, audit } = verifyTailoring(tailored, original, null, ['Istio']);
    expect(cleaned.skills).toEqual(['Istio']);
    expect(audit.removedSkills).toEqual([]);
  });

  it('still removes a skill that was asked about but not confirmed', () => {
    const tailored = tailoredFrom({ skills: ['Istio', 'ServiceNow'] });
    const { cleaned, audit } = verifyTailoring(tailored, original, null, ['Istio']);
    expect(cleaned.skills).toEqual(['Istio']);
    expect(audit.removedSkills).toEqual(['ServiceNow']);
  });

  it('matches confirmed skills case-insensitively', () => {
    const tailored = tailoredFrom({ skills: ['istio'] });
    expect(verifyTailoring(tailored, original, null, ['Istio']).cleaned.skills).toEqual(['istio']);
  });

  it('falls back to the raw text when the original was never parsed', () => {
    const tailored = tailoredFrom({ skills: ['Rust'] });
    const withRaw = verifyTailoring(tailored, null, 'I have written Rust for three years');
    expect(withRaw.cleaned.skills).toEqual(['Rust']);
    const withoutRaw = verifyTailoring(tailored, null, '');
    expect(withoutRaw.audit.removedSkills).toEqual(['Rust']);
  });
});

describe('verifyTailoring — numbers and employers', () => {
  it('flags a number that appears nowhere in the source', () => {
    const t = structuredClone(original);
    t.experience[0].bullets[0] = 'Cut costs by 73% across the platform.';
    const { audit } = verifyTailoring(t, original);
    expect(audit.unsupportedNumbers).toContain('73%');
  });

  it('does not flag numbers carried over from the source', () => {
    const { audit } = verifyTailoring(structuredClone(original), original);
    expect(audit.unsupportedNumbers).toEqual([]);
  });

  it('reports but does not delete an unsupported number', () => {
    const t = structuredClone(original);
    t.experience[0].bullets[0] = 'Cut costs by 73%.';
    const { cleaned } = verifyTailoring(t, original);
    // Rewriting the bullet silently would hide the problem instead of surfacing it.
    expect(cleaned.experience[0].bullets[0]).toBe('Cut costs by 73%.');
  });

  it('flags an invented employer', () => {
    const t = structuredClone(original);
    t.experience[0].company = 'Globex Corporation';
    const { audit } = verifyTailoring(t, original);
    expect(audit.unsupportedEmployers).toEqual(['Globex Corporation']);
  });
});

describe('verifyTailoring — dropped bullets', () => {
  it('counts bullets the rewrite silently removed', () => {
    const t = structuredClone(original);
    t.experience[0].bullets = [t.experience[0].bullets[0]];
    const { audit } = verifyTailoring(t, original);
    expect(audit.bulletsDropped).toBe(1);
  });

  it('reports zero when nothing was dropped', () => {
    expect(verifyTailoring(structuredClone(original), original).audit.bulletsDropped).toBe(0);
  });
});

describe('numbersIn', () => {
  it('finds plain numbers, percentages and thousands separators', () => {
    const found = numbersIn('cut 34 minutes to 6, a 41% drop across 1,200 requests');
    expect(found).toContain('34');
    expect(found).toContain('41%');
    expect(found).toContain('1,200');
  });
});
