import Link from 'next/link';
import PageBar from '@/components/PageBar';
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

  return (
    <>
      <PageBar crumbs={[{ label: 'Settings' }]} />
      <div className="wrap col-720 stack stack-lg">

      <section className="card">
        <div className="card-head">
          <h2>Account</h2>
        </div>
        <div className="card-body stack">
        <dl className="kv">
          <div className="kv-row">
            <dt>Name</dt>
            <dd>{user.name}</dd>
          </div>
          <div className="kv-row">
            <dt>Email</dt>
            <dd>{user.email}</dd>
          </div>
          <div className="kv-row">
            <dt>Signs in with</dt>
            <dd>{signIn || '—'}</dd>
          </div>
          <div className="kv-row">
            <dt>Agreed to terms</dt>
            <dd className="tnum">
              {terms?.terms_accepted_at
                ? `${new Date(terms.terms_accepted_at).toISOString().slice(0, 10)} (version ${terms.terms_version})`
                : '—'}
            </dd>
          </div>
        </dl>
        <p className="muted">
          Career details and your résumé sources are on your <Link href="/start">profile</Link>.
        </p>
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Your data</h2>
        </div>
        <div className="card-body stack">
        <p className="muted">
          One file with everything stored for your account: profile, résumés, jobs, letters and answers.
        </p>
        <div>
          <a href="/api/account/export" className="btn">
            Download my data
          </a>
        </div>
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Delete account</h2>
        </div>
        <div className="card-body stack">
        <p className="muted">
          Permanently deletes your account and everything in it: profile, résumés, tailored copies, jobs,
          letters and answers. This cannot be undone. Download your data first if you want a copy.
        </p>
        {error && (
          <p role="alert" className="notice notice-error">
            {error}
          </p>
        )}
        <DeleteAccountForm />
        </div>
      </section>
      </div>
    </>
  );
}
