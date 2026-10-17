import { describe, it, expect } from 'vitest';
import { groupResumes } from '@/lib/resume-groups';

const r = (id: string, parent_id: string | null, job_id: string | null) => ({
  id, title: id, parent_id, job_id, updated_at: '2026-10-01',
});

describe('groupResumes', () => {
  it('puts masters first and tailored copies under their job, in job order', () => {
    const out = groupResumes(
      [r('t2', 'm1', 'j2'), r('m1', null, null), r('t1', 'm1', 'j1'), r('t1b', 'm1', 'j1')],
      [{ id: 'j1', company: 'Acme', role: 'Analyst' }, { id: 'j2', company: 'Initech', role: 'Engineer' }],
    );
    expect(out.masters.map((x) => x.id)).toEqual(['m1']);
    expect(out.byJob.map((g) => g.job?.id)).toEqual(['j1', 'j2']);
    expect(out.byJob[0].copies.map((x) => x.id)).toEqual(['t1', 't1b']);
  });

  it('keeps a tailored copy whose job is gone under a null job', () => {
    const out = groupResumes([r('t9', 'm1', 'gone')], []);
    expect(out.byJob).toEqual([{ job: null, copies: [expect.objectContaining({ id: 't9' })] }]);
  });

  it('returns empty groups for no résumés', () => {
    expect(groupResumes([], [])).toEqual({ masters: [], byJob: [] });
  });
});
