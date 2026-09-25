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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
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
        <p role="alert" style={{ fontSize: 'var(--text-xs)', color: 'var(--danger)' }}>
          {error}
        </p>
      )}

      {result && (
        <>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--s-2)' }}>
            {result.checks.map((c) => (
              <li
                key={c.label}
                style={{
                  border: '1px solid var(--border)',
                  borderLeft: `3px solid var(--${c.ok ? 'ok' : 'danger'})`,
                  borderRadius: 4,
                  background: 'var(--bg-surface)',
                  padding: 'var(--s-3)',
                }}
              >
                <strong style={{ color: `var(--${c.ok ? 'ok' : 'danger'})` }}>
                  {c.ok ? 'Pass' : 'Problem'}: {c.label}
                </strong>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: 2 }}>{c.detail}</p>
              </li>
            ))}
          </ul>

          <div>
            <h2 style={{ fontSize: 'var(--text-base)', marginBottom: 'var(--s-2)' }}>The text it pulled out</h2>
            <p className="note" style={{ marginBottom: 'var(--s-2)' }}>
              Read it top to bottom. If sections run together, dates sit away from their job, or
              words are missing, a parser will get the same thing wrong.
            </p>
            <pre
              style={{
                whiteSpace: 'pre-wrap',
                fontFamily: 'var(--mono, monospace)',
                fontSize: 'var(--text-xs)',
                lineHeight: 1.6,
                padding: 'var(--s-4)',
                border: '1px solid var(--border)',
                borderRadius: 4,
                background: 'var(--bg-surface)',
                maxHeight: 520,
                overflow: 'auto',
              }}
            >
              {result.text}
            </pre>
          </div>
        </>
      )}
    </div>
  );
}
