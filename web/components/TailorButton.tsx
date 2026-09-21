'use client';

import { useState } from 'react';

export default function TailorButton({
  jobId,
  resumeId,
}: {
  jobId: string;
  resumeId: string;
}) {
  const [busy, setBusy] = useState(false);

  return (
    <form method="post" action="/api/tailor" onSubmit={() => setBusy(true)}>
      <input type="hidden" name="jobId" value={jobId} />
      <input type="hidden" name="resumeId" value={resumeId} />
      <button type="submit" className="btn btn-primary" disabled={busy}>
        {busy ? 'Tailoring… this takes about half a minute' : 'Tailor my résumé to this'}
      </button>
    </form>
  );
}
