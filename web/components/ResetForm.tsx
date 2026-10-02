'use client';

import { useState } from 'react';
import Link from 'next/link';
import { authClient } from '@/lib/auth-client';

export default function ResetForm({ token }: { token: string }) {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await authClient.resetPassword({ newPassword: password, token });
    setBusy(false);
    if (error) setError(error.message ?? 'That link did not work. Ask for a new one.');
    else setDone(true);
  }

  if (done) {
    return (
      <p className="note">
        Password changed. <Link href="/login">Sign in with it now.</Link>
      </p>
    );
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
      <div className="field">
        <label htmlFor="password">New password</label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <span className="hint">At least 8 characters.</span>
      </div>
      {error && (
        <p role="alert" style={{ color: 'var(--danger)', fontSize: 'var(--text-sm)' }}>
          {error}
        </p>
      )}
      <button type="submit" className="btn btn-primary" disabled={busy} style={{ alignSelf: 'flex-start' }}>
        {busy ? 'One moment…' : 'Set my password'}
      </button>
    </form>
  );
}
