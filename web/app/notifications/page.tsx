import Link from 'next/link';
import { currentSid } from '@/lib/auth';
import { ensureSchema, sql } from '@/lib/db';
import type { NotificationRow } from '@/lib/notifications';
import PageBar from '@/components/PageBar';

export const dynamic = 'force-dynamic';

const when = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const sid = await currentSid();
  if (!sid) return null;

  await ensureSchema();
  const q = sql();
  const items = (await q`
    SELECT id, text, href, created_at, read_at FROM notifications
    WHERE sid = ${sid} ORDER BY created_at DESC LIMIT 100`) as unknown as NotificationRow[];
  // Jobs saved from openings and not yet applied: these wait for the person, whatever was read.
  const waiting = (await q`
    SELECT j.id, j.role, j.company FROM jobs j JOIN postings p ON p.job_id = j.id AND p.sid = ${sid}
    WHERE j.sid = ${sid} AND j.applied_at IS NULL ORDER BY j.created_at DESC`) as {
    id: string;
    role: string;
    company: string;
  }[];
  const unread = items.some((n) => !n.read_at);

  return (
    <>
      <PageBar crumbs={[{ label: 'Notifications' }]}>
        {unread && (
          <form method="post" action="/api/notifications">
            <input type="hidden" name="op" value="read-all" />
            <button type="submit" className="btn btn-sm">
              Mark all read
            </button>
          </form>
        )}
      </PageBar>
      <div className="wrap">
        <div className="page-head">
          <h1>Notifications</h1>
          <p className="sub">
            New jobs at companies you follow, and applications waiting for you. The app never submits an
            application for you: each one waits here until you apply on the company&apos;s page.
          </p>
        </div>

        <div className="stack col-720">
          {error && (
            <p role="alert" className="notice notice-error">
              {error}
            </p>
          )}

          {waiting.length > 0 && (
            <section>
              <h2 className="section-title">
                Waiting for you to apply <span className="count tnum">{waiting.length}</span>
              </h2>
              <ul className="stack">
                {waiting.map((j) => (
                  <li key={j.id} className="card job-row">
                    <div className="job-row-main">
                      <Link href={`/jobs/${j.id}`} className="job-row-title">
                        {j.role}
                      </Link>
                      <span className="job-row-company">{j.company}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h2 className="section-title">Recent</h2>
            {items.length === 0 ? (
              <p className="notice">
                Nothing yet. <Link href="/jobs/openings">Follow a company</Link> and new jobs for the roles you want
                show up here after the daily check.
              </p>
            ) : (
              <ul className="stack">
                {items.map((n) => (
                  <li key={n.id}>
                    <form method="post" action="/api/notifications">
                      <input type="hidden" name="op" value="open" />
                      <input type="hidden" name="id" value={n.id} />
                      <button type="submit" className={`card notice-row${n.read_at ? '' : ' unread'}`}>
                        <span>{n.text}</span>
                        <span className="hint tnum">
                          {when(n.created_at)}
                          {!n.read_at && ' · new'}
                        </span>
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
