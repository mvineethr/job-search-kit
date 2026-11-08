import Link from 'next/link';
import { currentSid } from '@/lib/auth';
import { ensureSchema, sql, type JobRow, type LetterRow } from '@/lib/db';
import { SITUATIONS, isSituation } from '@/lib/outreach';
import PageBar from '@/components/PageBar';
import EmailForm from '@/components/EmailForm';

export const dynamic = 'force-dynamic';

export default async function EmailPage({ searchParams }: { searchParams: Promise<{ error?: string; job?: string }> }) {
  const { error, job } = await searchParams;
  const sid = await currentSid();
  if (!sid) return null;

  await ensureSchema();
  const q = sql();
  const [jobs, emails, masters] = await Promise.all([
    q`SELECT id, company, role FROM jobs WHERE sid = ${sid} ORDER BY created_at DESC` as unknown as Promise<Pick<JobRow, 'id' | 'company' | 'role'>[]>,
    q`SELECT id, job_id, content, created_at FROM letters WHERE sid = ${sid} AND kind = 'email' ORDER BY created_at DESC LIMIT 20` as unknown as Promise<LetterRow[]>,
    q`SELECT id FROM resumes WHERE sid = ${sid} AND parent_id IS NULL LIMIT 1` as unknown as Promise<{ id: string }[]>,
  ]);
  const jobLabel = new Map(jobs.map((j) => [j.id, `${j.company} — ${j.role}`]));

  return (
    <>
      <PageBar crumbs={[{ label: 'Cold email' }]} />
      <div className="wrap col-640">
        <div className="page-head">
          <h1>Cold email</h1>
          <p className="sub">
            A short, specific note to a real person, written from your résumé. No job posting needed. You send
            it yourself; nothing is sent from here.
          </p>
        </div>

        {error && (
          <p role="alert" className="notice notice-error">
            {error}
          </p>
        )}

        {masters.length === 0 ? (
          <div className="card card-gap">
            <div className="card-body stack">
              <p>Every claim in the email comes from your résumé, so add one first.</p>
              <Link href="/start" className="btn btn-primary">
                Add my résumé
              </Link>
            </div>
          </div>
        ) : (
          <EmailForm
            jobs={jobs.map((j) => ({ id: j.id, label: jobLabel.get(j.id)! }))}
            jobId={job && jobLabel.has(job) ? job : undefined}
          />
        )}

        {emails.length > 0 && (
          <div className="sec">
            <div className="sec-head">
              <h2>Your emails</h2>
              <span className="count">{emails.length}</span>
            </div>
            <div className="stack">
              {emails.map((e) => {
                const c = e.content as { subject?: string; situation?: string };
                return (
                  <Link key={e.id} href={`/email/${e.id}`} className="card entry-row">
                    <span className="entry-title">
                      <strong>{c.subject ?? 'Email'}</strong>
                      <span className="entry-meta">
                        {c.situation && isSituation(c.situation) ? SITUATIONS[c.situation] : ''}
                        {e.job_id && jobLabel.has(e.job_id) ? ` · ${jobLabel.get(e.job_id)}` : ''}
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
