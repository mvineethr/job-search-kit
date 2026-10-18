'use client';

import { useState } from 'react';
import Elapsed from './Elapsed';

export default function AddJobForm() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!open) {
    return (
      <div>
        <button className="btn btn-primary" onClick={() => setOpen(true)}>
          + Add a job
        </button>
      </div>
    );
  }

  return (
    <form method="post" action="/api/jobs" onSubmit={() => setBusy(true)} className="card">
      <div className="card-head">
        <h2>Add a job</h2>
      </div>
      <div className="card-body stack">
        <p className="hint">Paste it once. Your résumé is never changed — tailoring makes a copy.</p>

        <div className="add-job-pair">
          <div className="field">
            <label htmlFor="company">Company</label>
            <input id="company" name="company" type="text" required placeholder="Northwind Systems" />
          </div>
          <div className="field">
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

        <div className="row">
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? (
              <>
                Saving and checking your fit… about 30 seconds
                <Elapsed />
              </>
            ) : (
              'Save the job'
            )}
          </button>
          <button type="button" className="btn" onClick={() => setOpen(false)} disabled={busy}>
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
}
