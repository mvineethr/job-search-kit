import { redirect } from 'next/navigation';
import AuthForm from '@/components/AuthForm';
import { currentUser } from '@/lib/auth';
import { enabledProviders } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  const { deleted } = await searchParams;
  if (await currentUser()) redirect('/');

  return (
    <div className="wrap" style={{ maxWidth: 440 }}>
      <div className="page-head">
        <h1>Sign in</h1>
        <p className="sub">Your résumés, jobs and letters are kept in your account.</p>
      </div>
      {deleted && (
        <p role="status" className="note" style={{ marginBottom: 'var(--s-4)' }}>
          Your account and everything in it have been deleted.
        </p>
      )}
      <AuthForm mode="login" providers={enabledProviders()} />
    </div>
  );
}
