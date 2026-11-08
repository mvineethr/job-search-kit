'use client';

import { useState } from 'react';
import TextOrFileInput from './TextOrFileInput';
import Elapsed from './Elapsed';

/** Uses the stored LinkedIn text unless the person adds new text, which replaces it. */
export default function LinkedInForm({ storedChars }: { storedChars: number }) {
  const [text, setText] = useState<string | null>(null);
  const [replacing, setReplacing] = useState(false);
  const [busy, setBusy] = useState(false);
  const chars = text?.length ?? storedChars;

  return (
    <div className="card card-gap">
      <div className="card-head">
        <h2>Your LinkedIn</h2>
      </div>
      <div className="card-body stack">
        {chars > 0 && !replacing ? (
          <div className="notice row">
            <span className="tnum">
              {text ? 'Added' : 'Using the profile you added'} · {chars.toLocaleString()} characters
            </span>
            <button type="button" className="btn" onClick={() => setReplacing(true)}>
              Replace
            </button>
          </div>
        ) : (
          <>
            <p className="notice">
              Either the PDF from your profile (More, then Save to PDF) or the zip from Settings, Data privacy,
              Get a copy of your data. Without one, it writes a profile from your résumé instead.
            </p>
            <TextOrFileInput
              onConfirm={(t) => {
                setText(t);
                setReplacing(false);
              }}
              label="Upload your LinkedIn PDF or zip"
              accept="application/pdf,application/zip,.zip,text/plain,.txt"
              buttonLabel="Use this profile"
            />
          </>
        )}

        <form method="post" action="/api/linkedin" onSubmit={() => setBusy(true)} className="form-actions">
          <input type="hidden" name="linkedin_text" value={text ?? ''} />
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? (
              <>
                Reading your profile… about a minute
                <Elapsed />
              </>
            ) : chars > 0 ? (
              'Audit and rewrite my LinkedIn'
            ) : (
              'Write my LinkedIn from my résumé'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
