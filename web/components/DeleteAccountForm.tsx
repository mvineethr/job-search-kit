'use client';

import { useState } from 'react';

/** The button stays disabled until "delete" is typed; the server checks it again. */
export default function DeleteAccountForm() {
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const ok = typed.trim().toLowerCase() === 'delete';

  return (
    <form
      method="post"
      action="/api/account/delete"
      onSubmit={() => setBusy(true)}
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-3)', maxWidth: 360 }}
    >
      <div className="field">
        <label htmlFor="confirm">Type delete to confirm</label>
        <input id="confirm" name="confirm" type="text" autoComplete="off" value={typed} onChange={(e) => setTyped(e.target.value)} />
      </div>
      <button
        type="submit"
        className="btn"
        disabled={!ok || busy}
        style={{ alignSelf: 'flex-start', color: 'var(--danger)', borderColor: 'var(--danger)' }}
      >
        {busy ? 'Deleting…' : 'Delete my account'}
      </button>
    </form>
  );
}
