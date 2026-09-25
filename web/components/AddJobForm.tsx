'use client';

import { useState } from 'react';

export default function AddJobForm() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!open) {
    return (
      <button className="btn btn-primary" onClick={() => setOpen(true)}>
        + Add a job
      </button>
    );
  }

  return (
    <form
      method="post"
      action="/api/jobs"
      onSubmit={() => setBusy(true)}
      style={{
        border: '1px solid var(--border)',
        borderRadius: 8,
        background: 'var(--bg-surface)',
        padding: 'var(--s-4)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--s-4)',
        maxWidth: 680,
      }}
    >
      <div>
        <h2 style={{ fontSize: 'var(--text-base)' }}>Add a job</h2>
        <p style={{ color: 'var(--text-muted)', marginTop: 3 }}>
          Paste it once. Your résumé is never changed — tailoring makes a copy.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 'var(--s-3)', flexWrap: 'wrap' }}>
        <div className="field" style={{ flex: 1, minWidth: 180 }}>
          <label htmlFor="company">Company</label>
          <input id="company" name="company" type="text" required placeholder="Northwind Systems" />
        </div>
        <div className="field" style={{ flex: 1, minWidth: 180 }}>
          <label htmlFor="role">Role</label>
          <input id="role" name="role" type="text" required placeholder="Staff Site Reliability Engineer" />
        </div>
      </div>

      <div className="field">
        <label htmlFor="description">Job description</label>
        <textarea id="description" name="description" required rows={10} placeholder="Paste the full posting…" />
        <span className="hint">
          Paste all of it. The requirements section is where the keywords live.
        </span>
      </div>

      <div style={{ display: 'flex', gap: 'var(--s-2)' }}>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Saving and checking your fit… about 30 seconds' : 'Save the job'}
        </button>
        <button type="button" className="btn" onClick={() => setOpen(false)} disabled={busy}>
          Cancel
        </button>
      </div>
    </form>
  );
}
