'use client';

import { useState } from 'react';
import CopyButton from './CopyButton';

/** Shows the link once, in place. Nothing is stored in the page URL or history. */
export default function ResetLinkButton({ email }: { email: string }) {
  const [state, setState] = useState<{ url?: string; sent?: boolean; error?: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function make() {
    setBusy(true);
    const res = await fetch('/api/admin/reset-link', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    setState(await res.json().catch(() => ({ error: 'Something went wrong.' })));
    setBusy(false);
  }

  if (state?.url) {
    return (
      <span style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-1)' }}>
        <CopyButton text={state.url} label="Copy reset link" />
        {/* Visible too, in case the clipboard is blocked. */}
        <input type="text" readOnly value={state.url} onFocus={(e) => e.target.select()} aria-label="Reset link" />
        <span className="hint">Works once, for an hour. Send it to them yourself.</span>
      </span>
    );
  }
  if (state?.sent) return <span className="hint">Emailed to them.</span>;

  return (
    <span style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-1)' }}>
      <button type="button" className="btn" disabled={busy} onClick={make}>
        {busy ? 'One moment…' : 'Reset link'}
      </button>
      {state?.error && <span className="hint" style={{ color: 'var(--danger)' }}>{state.error}</span>}
    </span>
  );
}
