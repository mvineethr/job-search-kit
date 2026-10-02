'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';

type Mode = 'login' | 'signup';

/**
 * Sign-in and sign-up share one form. The binding agreement (Terms, Privacy, AI
 * use, age) is the /agree page, which the proxy shows to every new account —
 * including one created by a first social sign-in from the login page — before
 * anything else works.
 */
export default function AuthForm({
  mode,
  providers,
}: {
  mode: Mode;
  providers: { google: boolean; linkedin: boolean };
}) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function social(provider: 'google' | 'linkedin') {
    setBusy(true);
    setError(null);
    const { error } = await authClient.signIn.social({ provider, callbackURL: '/' });
    if (error) {
      setError(error.message ?? 'That did not work. Try again.');
      setBusy(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } =
      mode === 'signup'
        ? await authClient.signUp.email({ name, email, password })
        : await authClient.signIn.email({ email, password });
    if (error) {
      setError(error.message ?? 'That did not work. Try again.');
      setBusy(false);
      return;
    }
    router.push('/');
    router.refresh();
  }

  const blocked = busy;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
      <p className="note">
        Reviews, tailored résumés and cover letters are drafted by AI. It is told never to invent
        experience or numbers, but check everything before you send it.
        {mode === 'signup' && (
          <>
            {' '}
            After you sign up you will be asked to accept the <Link href="/terms">Terms of Service</Link> and{' '}
            <Link href="/privacy">Privacy Policy</Link>.
          </>
        )}
      </p>

      {(providers.google || providers.linkedin) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-2)' }}>
          {providers.google && (
            <button type="button" className="btn" disabled={blocked} onClick={() => social('google')}>
              Continue with Google
            </button>
          )}
          {providers.linkedin && (
            <button type="button" className="btn" disabled={blocked} onClick={() => social('linkedin')}>
              Continue with LinkedIn
            </button>
          )}
          <p className="hint" style={{ textAlign: 'center' }}>
            or with your email
          </p>
        </div>
      )}

      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
        {mode === 'signup' && (
          <div className="field">
            <label htmlFor="name">Name</label>
            <input id="name" type="text" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        )}
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            minLength={8}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {mode === 'signup' && <span className="hint">At least 8 characters.</span>}
        </div>

        {error && (
          <p role="alert" style={{ color: 'var(--danger)', fontSize: 'var(--text-sm)' }}>
            {error}
          </p>
        )}

        <button type="submit" className="btn btn-primary" disabled={blocked} style={{ alignSelf: 'flex-start' }}>
          {busy ? 'One moment…' : mode === 'signup' ? 'Create my account' : 'Sign in'}
        </button>
      </form>

      {mode === 'login' ? (
        <p className="note">
          New here? <Link href="/signup">Create an account.</Link> Forgot your password? Ask the person
          who shared this with you for a reset link.
        </p>
      ) : (
        <p className="note">
          Already have an account? <Link href="/login">Sign in.</Link>
        </p>
      )}
    </div>
  );
}
