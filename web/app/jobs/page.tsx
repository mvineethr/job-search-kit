import Link from 'next/link';
import { currentSid } from '@/lib/auth';
import { ensureSchema, sql, type JobRow, type ResumeRow } from '@/lib/db';
import AddJobForm from '@/components/AddJobForm';
import TailorButton from '@/components/TailorButton';

export const dynamic = 'force-dynamic';

export default async function JobsPage() {
  const sid = await currentSid();
  if (!sid) return null; // middleware redirects; this is belt and braces

  await ensureSchema();
  const q = sql();

  const jobs = (await q`
    SELECT id, company, role, description, analysis, created_at
    FROM jobs WHERE sid = ${sid} ORDER BY created_at DESC`) as unknown as JobRow[];

  const resumes = (await q`
    SELECT id, title, content, parent_id, job_id, created_at, updated_at, source_text
    FROM resumes WHERE sid = ${sid} ORDER BY updated_at DESC`) as unknown as ResumeRow[];

  const masters = resumes.filter((r) => !r.parent_id);
  const tailoredByJob = new Map(resumes.filter((r) => r.job_id).map((r) => [r.job_id!, r]));

  return (
    <div className="wrap">
      <div className="page-head" style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--s-4)', alignItems: 'flex-end' }}>
        <div style={{ flex: 1, minWidth: 260 }}>
          <h1>Jobs</h1>
          <p className="sub">
            Add a posting once. Tailoring, and later the cover letter, work from what you
            enter here — you never paste the description twice.
          </p>
        </div>
      </div>

      <div className="sec">
        <AddJobForm />
      </div>

      {jobs.length === 0 ? (
        <p className="note" style={{ maxWidth: 640 }}>
          No jobs yet. Add one above — paste the whole posting, including the requirements
          section, because that is where the keywords live.
        </p>
      ) : (
        <div className="sec">
          <div className="sec-head">
            <h2>Your jobs</h2>
            <span className="count">{jobs.length}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
            {jobs.map((job) => {
              const tailored = tailoredByJob.get(job.id);
              const matched = job.analysis?.matched?.length ?? 0;
              const missing = job.analysis?.missing?.length ?? 0;
              const total = matched + missing;

              return (
                <div
                  key={job.id}
                  style={{
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    background: 'var(--bg-surface)',
                    padding: 'var(--s-4)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--s-3)',
                  }}
                >
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', alignItems: 'baseline' }}>
                    <strong style={{ fontSize: 'var(--text-base)' }}>{job.role}</strong>
                    <span style={{ color: 'var(--text-muted)' }}>{job.company}</span>
                  </div>

                  {total > 0 && (
                    <p className="tnum" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      {matched} of {total} requirements matched
                      {missing > 0 && ` · ${missing} real ${missing === 1 ? 'gap' : 'gaps'}`}
                    </p>
                  )}

                  {job.analysis?.missing && job.analysis.missing.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {job.analysis.missing.map((m) => (
                        <span
                          key={m}
                          style={{
                            fontSize: 'var(--text-xs)',
                            padding: '3px 8px',
                            borderRadius: 4,
                            background: 'var(--warn-subtle)',
                            color: 'var(--warn)',
                          }}
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  )}

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--s-2)' }}>
                    {tailored ? (
                      <Link href={`/resume/${tailored.id}`} className="btn">
                        Tailored résumé
                      </Link>
                    ) : masters.length > 0 ? (
                      <TailorButton jobId={job.id} resumeId={masters[0].id} />
                    ) : (
                      <Link href="/review" className="btn">
                        Add a résumé first
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
