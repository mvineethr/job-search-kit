import { describe, it, expect } from 'vitest';
import { ResumeSchema, METRIC_NEEDED } from '@/lib/resume-schema';
import fixture from './fixtures/priya.json';

describe('ResumeSchema', () => {
  it('accepts a complete résumé', () => {
    const parsed = ResumeSchema.safeParse(fixture);
    expect(parsed.success).toBe(true);
  });

  it('rejects a résumé with no name', () => {
    const bad = { ...fixture, name: '' };
    expect(ResumeSchema.safeParse(bad).success).toBe(false);
  });

  it('allows the literal metric-needed marker inside a bullet', () => {
    const withGap = structuredClone(fixture);
    withGap.experience[0].bullets[0] = `Cut deploy time by ${METRIC_NEEDED}.`;
    expect(ResumeSchema.safeParse(withGap).success).toBe(true);
  });

  it('requires at least one bullet per role', () => {
    const bad = structuredClone(fixture);
    bad.experience[0].bullets = [];
    expect(ResumeSchema.safeParse(bad).success).toBe(false);
  });
});
