import type { JobRow, ResumeRow } from './db';

type R = Pick<ResumeRow, 'id' | 'title' | 'parent_id' | 'job_id' | 'updated_at'>;
type J = Pick<JobRow, 'id' | 'company' | 'role'>;

/** Masters, then tailored copies grouped under their job in the order jobs are given. */
export function groupResumes<TR extends R, TJ extends J>(resumes: TR[], jobs: TJ[]) {
  const masters = resumes.filter((x) => !x.parent_id);
  const copies = resumes.filter((x) => x.parent_id);
  const byJob: { job: TJ | null; copies: TR[] }[] = [];
  for (const job of jobs) {
    const mine = copies.filter((c) => c.job_id === job.id);
    if (mine.length) byJob.push({ job, copies: mine });
  }
  const known = new Set(jobs.map((j) => j.id));
  const orphans = copies.filter((c) => !c.job_id || !known.has(c.job_id));
  if (orphans.length) byJob.push({ job: null, copies: orphans });
  return { masters, byJob };
}
