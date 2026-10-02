'use client';

import { useState } from 'react';
import TextOrFileInput from './TextOrFileInput';
import Elapsed from './Elapsed';

function Added({ text, onChange }: { text: string; onChange: () => void }) {
  return (
    <div className="note" style={{ display: 'flex', gap: 'var(--s-3)', alignItems: 'center', flexWrap: 'wrap' }}>
      <span className="tnum">Added · {text.length.toLocaleString()} characters</span>
      <button type="button" className="btn" onClick={onChange}>
        Change
      </button>
    </div>
  );
}

export default function StartForm() {
  const [resume, setResume] = useState<string | null>(null);
  const [linkedin, setLinkedin] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <>
      <div className="sec">
        <div className="sec-head">
          <h2>Your résumé</h2>
        </div>
        {resume ? (
          <Added text={resume} onChange={() => setResume(null)} />
        ) : (
          <TextOrFileInput onConfirm={setResume} buttonLabel="Use this résumé" />
        )}
      </div>

      <div className="sec">
        <div className="sec-head">
          <h2>Your LinkedIn</h2>
        </div>
        <p className="note" style={{ marginBottom: 'var(--s-3)' }}>
          Either the PDF from your profile (More, then Save to PDF) or the zip from Settings, Data
          privacy, Get a copy of your data. With a résumé as well, this is kept for fixing your
          LinkedIn later and does not change the résumé.
        </p>
        {linkedin ? (
          <Added text={linkedin} onChange={() => setLinkedin(null)} />
        ) : (
          <TextOrFileInput
            onConfirm={setLinkedin}
            label="Upload your LinkedIn PDF or zip"
            accept="application/pdf,application/zip,.zip,text/plain,.txt"
            buttonLabel="Use this profile"
          />
        )}
      </div>

      <form method="post" action="/api/profile" onSubmit={() => setBusy(true)} className="sec">
        <input type="hidden" name="resume_text" value={resume ?? ''} />
        <input type="hidden" name="linkedin_text" value={linkedin ?? ''} />
        <button type="submit" className="btn btn-primary" disabled={busy || (!resume && !linkedin)}>
          {busy ? (
            <>
              Reading it… about half a minute
              <Elapsed />
            </>
          ) : (
            'Set up my profile'
          )}
        </button>
      </form>
    </>
  );
}
