'use client';

import { useState } from 'react';
import Link from 'next/link';
import TextOrFileInput from '@/components/TextOrFileInput';

export default function ReviewPage() {
  const [text, setText] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <div className="wrap" style={{ maxWidth: 720 }}>
      <div className="page-head">
        <h1>Add your résumé</h1>
        <p className="sub">
          It gets saved so you can come back to it and tailor it to jobs. Uploaded files are
          turned into text and then discarded — the file itself is never stored.
        </p>
      </div>

      {!text ? (
        <TextOrFileInput onConfirm={setText} />
      ) : (
        <form
          method="post"
          action="/api/resumes"
          onSubmit={() => setBusy(true)}
          style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}
        >
          <input type="hidden" name="text" value={text} />

          <div className="field">
            <label htmlFor="title">Call it something</label>
            <input
              id="title"
              name="title"
              type="text"
              defaultValue="My résumé"
              placeholder="My résumé"
            />
            <span className="hint">
              This is your master copy. Tailoring a job makes a separate copy and leaves this
              one alone.
            </span>
          </div>

          <div
            style={{
              background: 'var(--doc-bg)',
              color: 'var(--doc-text)',
              border: '1px solid var(--doc-border)',
              borderRadius: 8,
              padding: 'var(--s-4)',
              maxHeight: 260,
              overflow: 'auto',
              whiteSpace: 'pre-wrap',
              fontFamily: 'var(--serif)',
              lineHeight: 1.6,
            }}
          >
            {text}
          </div>

          <div style={{ display: 'flex', gap: 'var(--s-2)', flexWrap: 'wrap' }}>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Reading it… about half a minute' : 'Save and open it'}
            </button>
            <button type="button" className="btn" onClick={() => setText(null)} disabled={busy}>
              Use different text
            </button>
          </div>

          {busy && (
            <p className="note">
              Reading your résumé into sections so it can be formatted, reviewed and tailored.
              This takes a moment and only happens once.
            </p>
          )}
        </form>
      )}

      <p className="note" style={{ marginTop: 'var(--s-6)' }}>
        Already added one? <Link href="/">Your résumés are on the home page.</Link>
      </p>
    </div>
  );
}
