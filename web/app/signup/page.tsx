import { redirect } from 'next/navigation';
import AuthForm from '@/components/AuthForm';
import { currentUser } from '@/lib/auth';
import { enabledProviders } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export default async function SignupPage() {
  if (await currentUser()) redirect('/');

  return (
    <div className="wrap" style={{ maxWidth: 440 }}>
      <div className="page-head">
        <h1>Create your account</h1>
        <p className="sub">
          Free while it is in testing. Your work is kept in your account and nobody else can see it.
        </p>
      </div>
      <AuthForm mode="signup" providers={enabledProviders()} />
    </div>
  );
}
