'use client';

import { useState } from 'react';
import Elapsed from './Elapsed';
import { SITUATIONS } from '@/lib/outreach';

/** Plain form post; client only for the busy state during the model call. */
export default function EmailForm({ jobs, jobId }: { jobs: { id: string; label: string }[]; jobId?: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <form method="post" action="/api/email" onSubmit={() => setBusy(true)} className="card card-gap">
      <div className="card-head">
        <h2>Write an email</h2>
      </div>
      <div className="card-body stack">
        <div className="field">
          <label htmlFor="situation">What is it for?</label>
          <select id="situation" name="situation" defaultValue={jobId ? 'after-applying' : 'no-posting'} required>
            {Object.entries(SITUATIONS).map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="jobId">Saved job (optional)</label>
          <select id="jobId" name="jobId" defaultValue={jobId ?? ''}>
            <option value="">None</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.label}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="to">Who it is to (optional)</label>
          <input id="to" name="to" type="text" maxLength={200} placeholder="e.g. Sam, engineering manager on the payments team" />
        </div>

        <div className="field">
          <label htmlFor="why">Why them (optional)</label>
          <textarea
            id="why"
            name="why"
            rows={3}
            maxLength={1500}
            placeholder="Anything real you know: a post they wrote, a product the team ships, how you found them"
          />
        </div>

        <p className="notice">
          Only what you type here and your résumé are used. It will not invent a shared contact or a
          name, and any number it adds that you never wrote is marked.
        </p>

        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? (
            <>
              Writing… about half a minute
              <Elapsed />
            </>
          ) : (
            'Write the email'
          )}
        </button>
      </div>
    </form>
  );
}
