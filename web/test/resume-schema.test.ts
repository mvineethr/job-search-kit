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

  // Regression: a real résumé with no Summary section failed to parse, because the
  // parse prompt returns "" for an absent summary and the schema demanded min(1).
  // That silently broke tailoring for everyone without a summary.
  it('accepts a résumé with no summary', () => {
    const noSummary = { ...structuredClone(fixture), summary: '' };
    expect(ResumeSchema.safeParse(noSummary).success).toBe(true);
  });

  it('accepts a résumé whose summary key is missing entirely', () => {
    const { summary: _omit, ...rest } = structuredClone(fixture);
    const r = ResumeSchema.safeParse(rest);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.summary).toBe('');
  });

  // Regression: tailoring returned roles with no start/end keys and every role
  // failed validation, discarding a 50-second run.
  it('accepts a role with no dates rather than rejecting the whole résumé', () => {
    const noDates = structuredClone(fixture) as Record<string, unknown> & typeof fixture;
    const role = noDates.experience[0] as Record<string, unknown>;
    delete role.start;
    delete role.end;
    const r = ResumeSchema.safeParse(noDates);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.experience[0].start).toBe('');
  });

  it('still rejects a role with no company — that is not a résumé', () => {
    const bad = structuredClone(fixture) as Record<string, unknown> & typeof fixture;
    (bad.experience[0] as Record<string, unknown>).company = '';
    expect(ResumeSchema.safeParse(bad).success).toBe(false);
  });
});
