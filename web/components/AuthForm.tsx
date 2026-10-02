'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';

type Mode = 'login' | 'signup';

/**
 * Sign-in and sign-up share one form. Sign-up asks for a name and the AI
 * acknowledgement; every button, social ones included, waits for that box,
 * because a first social sign-in creates the account too.
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
  const [ack, setAck] = useState(mode === 'login');
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

  const blocked = busy || !ack;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
      {mode === 'signup' ? (
        <label className="note" style={{ display: 'flex', gap: 'var(--s-2)', alignItems: 'flex-start' }}>
          <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} style={{ marginTop: 3 }} />
          <span>
            I understand the documents are drafted by AI from what I give it, and I will check them before I
            send them. My résumé is stored for me and sent to the model provider to be processed.
          </span>
        </label>
      ) : (
        <p className="note">
          Reviews, tailored résumés and cover letters are drafted by AI. It is told never to invent
          experience or numbers, but check everything before you send it.
        </p>
      )}

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
