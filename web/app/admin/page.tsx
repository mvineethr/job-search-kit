import { notFound } from 'next/navigation';
import PageBar from '@/components/PageBar';
import { currentUser } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import { ensureSchema, sql } from '@/lib/db';
import ResetLinkButton from '@/components/ResetLinkButton';

export const dynamic = 'force-dynamic';

type Row = {
  id: string;
  name: string;
  email: string;
  created_at: string;
  methods: string | null;
  last_active: string | null;
  resumes: number;
  jobs: number;
  letters: number;
  target_role: string | null;
  years_experience: string | null;
  location: string | null;
  search_status: string | null;
  heard_from: string | null;
};

const METHOD = { credential: 'Email', google: 'Google', linkedin: 'LinkedIn' } as Record<string, string>;
const day = (d: string | null) => (d ? new Date(d).toISOString().slice(0, 10) : '—');

export default async function AdminPage() {
  const me = await currentUser();
  // Not found rather than forbidden: the page does not admit to existing.
  if (!me || !isAdmin(me.email)) notFound();

  await ensureSchema();
  // The one query that does not filter by sid: it is the admin's view across every account.
  const rows = (await sql()`
    SELECT u.id, u.name, u.email, u."createdAt" AS created_at,
      (SELECT string_agg(DISTINCT a."providerId", ',') FROM account a WHERE a."userId" = u.id) AS methods,
      (SELECT max(s."updatedAt") FROM session s WHERE s."userId" = u.id) AS last_active,
      (SELECT count(*) FROM resumes r WHERE r.sid = u.id)::int AS resumes,
      (SELECT count(*) FROM jobs j WHERE j.sid = u.id)::int AS jobs,
      (SELECT count(*) FROM letters l WHERE l.sid = u.id)::int AS letters,
      p.target_role, p.years_experience, p.location, p.search_status, p.heard_from
    FROM "user" u
    LEFT JOIN profiles p ON p.sid = u.id
    ORDER BY u."createdAt" DESC`) as Row[];

  return (
    <>
      <PageBar crumbs={[{ label: 'Admin' }]} />
      <div className="wrap stack stack-lg">
        <section className="card">
          <div className="card-head">
            <h2>Accounts</h2>
            <p className="muted tnum">
              {rows.length} {rows.length === 1 ? 'person' : 'people'} ·{' '}
              {rows.filter((r) => r.resumes > 0).length} with a résumé
            </p>
          </div>
          <div className="card-body table-scroll">
            <table className="table tnum">
              <thead>
                <tr>
                  {['Person', 'Signs in with', 'Joined', 'Last active', 'Résumés', 'Jobs', 'Letters', 'Aiming for', 'Experience', 'Based in', 'Search', 'Found us via', ''].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <strong className="block">{r.name}</strong>
                      <span className="hint">{r.email}</span>
                    </td>
                    {[
                      (r.methods ?? '').split(',').filter(Boolean).map((m) => METHOD[m] ?? m).join(', ') || '—',
                      day(r.created_at),
                      day(r.last_active),
                      r.resumes,
                      r.jobs,
                      r.letters,
                      r.target_role ?? '—',
                      r.years_experience ?? '—',
                      r.location ?? '—',
                      r.search_status ?? '—',
                      r.heard_from ?? '—',
                    ].map((v, i) => (
                      <td key={i}>{v}</td>
                    ))}
                    <td>{(r.methods ?? '').includes('credential') && <ResetLinkButton email={r.email} />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}
