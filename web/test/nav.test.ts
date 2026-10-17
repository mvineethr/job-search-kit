import { describe, it, expect } from 'vitest';
import { NAV, navCurrent } from '@/lib/nav';

describe('navCurrent', () => {
  it('matches Home only on /', () => {
    expect(navCurrent('/', '/')).toBe(true);
    expect(navCurrent('/jobs', '/')).toBe(false);
  });
  it('matches sections by prefix', () => {
    expect(navCurrent('/jobs', '/jobs')).toBe(true);
    expect(navCurrent('/jobs/abc/questions', '/jobs')).toBe(true);
    expect(navCurrent('/jobsx', '/jobs')).toBe(false);
  });
  it('lights Résumés on a single résumé and its metrics page', () => {
    expect(navCurrent('/resume/abc', '/resumes')).toBe(true);
    expect(navCurrent('/resume/abc/metrics', '/resumes')).toBe(true);
    expect(navCurrent('/resumes', '/resumes')).toBe(true);
  });
  it('lights Jobs on a cover letter', () => {
    expect(navCurrent('/letter/abc', '/jobs')).toBe(true);
  });
  it('lists Home, Résumés, Jobs, then the two placeholders', () => {
    expect(NAV.map((n) => n.href)).toEqual(['/', '/resumes', '/jobs', '/linkedin', '/email']);
    expect(NAV.filter((n) => n.soon).map((n) => n.href)).toEqual(['/linkedin', '/email']);
  });
});
