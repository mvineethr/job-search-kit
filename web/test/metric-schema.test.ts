import { describe, it, expect } from 'vitest';
import { findMarkers, countMarkers } from '@/lib/metric-schema';
import { ResumeSchema, METRIC_NEEDED } from '@/lib/resume-schema';
import fixture from './fixtures/priya.json';

const base = ResumeSchema.parse(fixture);

describe('findMarkers', () => {
  it('finds nothing when every bullet has its number', () => {
    expect(countMarkers(base)).toBe(0);
  });

  it('locates a marker by role and bullet position', () => {
    const r = structuredClone(base);
    r.experience[1].bullets[0] = `Cut detection time by ${METRIC_NEEDED}.`;
    const found = findMarkers(r);
    expect(found).toHaveLength(1);
    expect(found[0].roleIndex).toBe(1);
    expect(found[0].bulletIndex).toBe(0);
  });

  it('finds several markers across roles', () => {
    const r = structuredClone(base);
    r.experience[0].bullets[0] = `Reduced x by ${METRIC_NEEDED}.`;
    r.experience[1].bullets[1] = `Improved y by ${METRIC_NEEDED}.`;
    expect(countMarkers(r)).toBe(2);
  });

  it('counts a bullet with two markers once per bullet', () => {
    const r = structuredClone(base);
    r.experience[0].bullets[0] = `From ${METRIC_NEEDED} to ${METRIC_NEEDED}.`;
    expect(countMarkers(r)).toBe(1);
  });
});
