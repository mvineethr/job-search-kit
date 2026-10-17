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
      className="stack delete-form"
    >
      <div className="field">
        <label htmlFor="confirm">Type delete to confirm</label>
        <input id="confirm" name="confirm" type="text" autoComplete="off" value={typed} onChange={(e) => setTyped(e.target.value)} />
      </div>
      <button
        type="submit"
        className={ok ? 'btn btn-danger btn-danger-fill' : 'btn btn-danger'}
        disabled={!ok || busy}
      >
        {busy ? 'Deleting…' : 'Delete my account'}
      </button>
    </form>
  );
}
