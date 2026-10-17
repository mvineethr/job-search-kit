import Link from 'next/link';
import { currentSid } from '@/lib/auth';
import { ensureSchema, sql, type JobRow, type ResumeRow } from '@/lib/db';
import { groupResumes } from '@/lib/resume-groups';
import PageBar from '@/components/PageBar';

export const dynamic = 'force-dynamic';

export default async function ResumesPage() {
  const sid = await currentSid();
  if (!sid) return null;

  await ensureSchema();
  const q = sql();
  const resumes = (await q`
    SELECT id, title, content, parent_id, job_id, created_at, updated_at
    FROM resumes WHERE sid = ${sid} ORDER BY updated_at DESC`) as unknown as ResumeRow[];
  const jobs = (await q`
    SELECT id, company, role FROM jobs WHERE sid = ${sid} ORDER BY created_at DESC`) as unknown as JobRow[];
  const { masters, byJob } = groupResumes(resumes, jobs);

  return (
    <>
      <PageBar crumbs={[{ label: 'Résumés' }]}>
        <Link href="/review" className="btn btn-primary">Add a résumé</Link>
      </PageBar>
      <div className="wrap resumes">
        <div className="page-head">
          <h1>Résumés</h1>
          <p className="sub">Your master is the one you edit. Tailored copies are made from it for one job each and never change it.</p>
        </div>

        <section className="stack">
          <h2 className="section-title">Master <span className="count tnum">{masters.length}</span></h2>
          {masters.length === 0 ? (
            <p className="notice">No master yet. <Link href="/review">Add your résumé</Link> to start.</p>
          ) : (
            masters.map((m) => (
              <Link key={m.id} href={`/resume/${m.id}`} className="card entry-row">
                <span className="tag tag-accent">Master</span>
                <strong>{m.title}</strong>
                <span className="entry-meta">{m.content ? 'Read into sections' : 'Plain text only'}</span>
              </Link>
            ))
          )}
        </section>

        {byJob.length > 0 && (
          <section className="stack">
            <h2 className="section-title">Tailored copies</h2>
            {byJob.map((g) => (
              <div key={g.job?.id ?? 'none'} className="stack resumes-group">
                <p className="entry-meta">
                  {g.job ? <Link href={`/jobs/${g.job.id}`}>{g.job.role} · {g.job.company}</Link> : 'Job deleted'}
                </p>
                {g.copies.map((c) => (
                  <Link key={c.id} href={`/resume/${c.id}`} className="card entry-row">
                    <span className="tag">Tailored</span>
                    <strong>{c.title}</strong>
                  </Link>
                ))}
              </div>
            ))}
          </section>
        )}
      </div>
    </>
  );
}
