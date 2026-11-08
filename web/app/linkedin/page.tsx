import Link from 'next/link';
import { currentSid } from '@/lib/auth';
import { ensureSchema, sql, type LetterRow } from '@/lib/db';
import { getLinkedInText } from '@/lib/profile';
import PageBar from '@/components/PageBar';
import LinkedInForm from '@/components/LinkedInForm';

export const dynamic = 'force-dynamic';

export default async function LinkedInPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const sid = await currentSid();
  if (!sid) return null;

  await ensureSchema();
  const q = sql();
  const [linkedin, runs, masters] = await Promise.all([
    getLinkedInText(sid),
    q`SELECT id, content, created_at FROM letters WHERE sid = ${sid} AND kind = 'linkedin' ORDER BY created_at DESC LIMIT 10` as unknown as Promise<LetterRow[]>,
    q`SELECT id FROM resumes WHERE sid = ${sid} AND parent_id IS NULL LIMIT 1` as unknown as Promise<{ id: string }[]>,
  ]);

  return (
    <>
      <PageBar crumbs={[{ label: 'LinkedIn' }]} />
      <div className="wrap col-640">
        <div className="page-head">
          <h1>LinkedIn</h1>
          <p className="sub">
            An audit of your profile, worst problems first, then a headline, About section and experience bullets
            to paste back yourself. Nothing connects to your LinkedIn account and nothing is posted.
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
              <p>The rewrite is checked against your résumé so nothing is invented, so add one first.</p>
              <Link href="/start" className="btn btn-primary">
                Add my résumé
              </Link>
            </div>
          </div>
        ) : (
          <LinkedInForm storedChars={linkedin?.length ?? 0} />
        )}

        {runs.length > 0 && (
          <div className="sec">
            <div className="sec-head">
              <h2>Past rewrites</h2>
              <span className="count">{runs.length}</span>
            </div>
            <div className="stack">
              {runs.map((r) => {
                const c = r.content as { headline?: { suggested?: string[] }; fromLinkedIn?: boolean };
                return (
                  <Link key={r.id} href={`/linkedin/${r.id}`} className="card entry-row">
                    <span className="entry-title">
                      <strong>{c.headline?.suggested?.[0] ?? 'LinkedIn rewrite'}</strong>
                      <span className="entry-meta">
                        {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        {c.fromLinkedIn ? ' · from your profile' : ' · from your résumé'}
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
