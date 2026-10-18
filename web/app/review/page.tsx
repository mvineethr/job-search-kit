'use client';

import { useState } from 'react';
import Link from 'next/link';
import TextOrFileInput from '@/components/TextOrFileInput';
import PageBar from '@/components/PageBar';

export default function ReviewPage() {
  const [text, setText] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <>
    <PageBar crumbs={[{ label: 'Add a résumé' }]} />
    <div className="wrap col-720">
      <div className="page-head">
        <h1>Add your résumé</h1>
        <p className="sub">
          It gets saved so you can come back to it and tailor it to jobs. Uploaded files are
          turned into text and then discarded — the file itself is never stored.
        </p>
      </div>

      {!text ? (
        <div className="card card-gap">
          <div className="card-body">
            <TextOrFileInput onConfirm={setText} />
          </div>
        </div>
      ) : (
        <form
          method="post"
          action="/api/resumes"
          onSubmit={() => setBusy(true)}
          className="stack card-gap"
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

          <div className="paper resume-preview">{text}</div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Reading it… about half a minute' : 'Save and open it'}
            </button>
            <button type="button" className="btn" onClick={() => setText(null)} disabled={busy}>
              Use different text
            </button>
          </div>

          {busy && (
            <p className="notice">
              Reading your résumé into sections so it can be formatted, reviewed and tailored.
              This takes a moment and only happens once.
            </p>
          )}
        </form>
      )}

      <p className="notice">
        Already added one? <Link href="/">Your résumés are on the home page.</Link>
      </p>
    </div>
    </>
  );
}
