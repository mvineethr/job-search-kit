'use client';

import { useState } from 'react';

/** A form-post button that says what is happening while a slow model call runs. */
export default function GenerateButton({
  action,
  jobId,
  resumeId,
  label,
  busyLabel,
  primary = false,
}: {
  action: string;
  jobId: string;
  resumeId?: string;
  label: string;
  busyLabel: string;
  primary?: boolean;
}) {
  const [busy, setBusy] = useState(false);

  return (
    <form method="post" action={action} onSubmit={() => setBusy(true)}>
      <input type="hidden" name="jobId" value={jobId} />
      {resumeId && <input type="hidden" name="resumeId" value={resumeId} />}
      <button type="submit" className={primary ? 'btn btn-primary' : 'btn'} disabled={busy}>
        {busy ? busyLabel : label}
      </button>
    </form>
  );
}
