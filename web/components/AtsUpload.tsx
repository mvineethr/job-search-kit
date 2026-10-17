'use client';

import { useState } from 'react';
import { checkExtractedText, type AtsCheck } from '@/lib/ats-check';

/** Uploads a PDF to the existing extractor and shows what came out, with plain checks. */
export default function AtsUpload() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ text: string; checks: AtsCheck[] } | null>(null);

  async function handleFile(file: File) {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/extract', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'That file could not be read.');
        return;
      }
      setResult({ text: data.text, checks: checkExtractedText(data.text) });
    } catch {
      setError('That file could not be read.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      <div className="field">
        <label htmlFor="ats-file">Your résumé PDF</label>
        <input
          id="ats-file"
          type="file"
          accept="application/pdf"
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
          }}
        />
        <span className="hint">{busy ? 'Reading it…' : 'The file is read and thrown away. Nothing is saved.'}</span>
      </div>

      {error && (
        <p role="alert" className="notice notice-error">
          {error}
        </p>
      )}

      {result && (
        <>
          <ul className="ats-checks">
            {result.checks.map((c) => (
              <li key={c.label} className="find-row">
                <span className={`tag ${c.ok ? 'tag-ok' : 'tag-danger'}`}>{c.ok ? 'Pass' : 'Problem'}</span>
                <div className="ats-check-body">
                  <strong>{c.label}</strong>
                  <p className="muted">{c.detail}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="stack">
            <h2 className="section-title">The text it pulled out</h2>
            <p className="notice">
              Read it top to bottom. If sections run together, dates sit away from their job, or
              words are missing, a parser will get the same thing wrong.
            </p>
            <pre className="ats-pre">{result.text}</pre>
          </div>
        </>
      )}
    </div>
  );
}
