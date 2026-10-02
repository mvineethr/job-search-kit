import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { ensureSchema, sql } from '@/lib/db';
import DeleteAccountForm from '@/components/DeleteAccountForm';

export const dynamic = 'force-dynamic';

const METHOD: Record<string, string> = { credential: 'Email and password', google: 'Google', linkedin: 'LinkedIn' };

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const user = await currentUser();
  if (!user) redirect('/login');

  await ensureSchema();
  const q = sql();
  const [methods, profile] = await Promise.all([
    q`SELECT "providerId" FROM account WHERE "userId" = ${user.id}`,
    q`SELECT terms_version, terms_accepted_at FROM profiles WHERE sid = ${user.id}`,
  ]);
  const signIn = (methods as { providerId: string }[]).map((m) => METHOD[m.providerId] ?? m.providerId).join(', ');
  const terms = profile[0] as { terms_version: string | null; terms_accepted_at: string | null } | undefined;

  const row = { display: 'flex', gap: 'var(--s-3)', fontSize: 'var(--text-sm)' } as const;
  const label = { width: 140, color: 'var(--text-muted)', flex: 'none' } as const;

  return (
    <div className="wrap" style={{ maxWidth: 640 }}>
      <div className="page-head">
        <h1>Settings</h1>
      </div>

      <div className="sec">
        <div className="sec-head">
          <h2>Account</h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-2)' }}>
          <div style={row}>
            <span style={label}>Name</span>
            <span>{user.name}</span>
          </div>
          <div style={row}>
            <span style={label}>Email</span>
            <span>{user.email}</span>
          </div>
          <div style={row}>
            <span style={label}>Signs in with</span>
            <span>{signIn || '—'}</span>
          </div>
          <div style={row}>
            <span style={label}>Agreed to terms</span>
            <span className="tnum">
              {terms?.terms_accepted_at
                ? `${new Date(terms.terms_accepted_at).toISOString().slice(0, 10)} (version ${terms.terms_version})`
                : '—'}
            </span>
          </div>
        </div>
        <p className="note" style={{ marginTop: 'var(--s-3)' }}>
          Career details and your résumé sources are on your <Link href="/start">profile</Link>.
        </p>
      </div>

      <div className="sec">
        <div className="sec-head">
          <h2>Your data</h2>
        </div>
        <p className="note" style={{ marginBottom: 'var(--s-3)' }}>
          One file with everything stored for your account: profile, résumés, jobs, letters and answers.
        </p>
        <a href="/api/account/export" className="btn">
          Download my data
        </a>
      </div>

      <div className="sec">
        <div className="sec-head">
          <h2>Delete account</h2>
        </div>
        <p className="note" style={{ marginBottom: 'var(--s-3)' }}>
          Permanently deletes your account and everything in it: profile, résumés, tailored copies, jobs,
          letters and answers. This cannot be undone. Download your data first if you want a copy.
        </p>
        {error && (
          <p role="alert" style={{ color: 'var(--danger)', fontSize: 'var(--text-sm)', marginBottom: 'var(--s-3)' }}>
            {error}
          </p>
        )}
        <DeleteAccountForm />
      </div>
    </div>
  );
}
