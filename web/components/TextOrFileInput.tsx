'use client';

import { useState } from 'react';

const MIN_CHARS = 50;

export default function TextOrFileInput({ onConfirm }: { onConfirm: (text: string) => void }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extracted, setExtracted] = useState(false);

  async function handleFile(file: File) {
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/extract', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'That file could not be read.');
        return;
      }
      setText(data.text);
      setExtracted(true);
    } catch {
      setError('That file could not be read. Paste the text instead.');
    } finally {
      setBusy(false);
    }
  }

  const tooShort = text.trim().length < MIN_CHARS;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
      <label htmlFor="resume-file" style={{ fontWeight: 500 }}>
        Upload your résumé
      </label>
      <input
        id="resume-file"
        type="file"
        accept="application/pdf,text/plain,text/markdown,.md,.txt"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
        }}
      />

      <label htmlFor="resume-text" style={{ fontWeight: 500, marginTop: 'var(--s-2)' }}>
        Or paste it
      </label>
      <textarea
        id="resume-text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={14}
        placeholder="Paste the whole thing…"
        style={{
          font: 'inherit',
          padding: 'var(--s-3)',
          borderRadius: 4,
          border: '1px solid var(--border-strong)',
          background: 'var(--bg-surface)',
          color: 'var(--text)',
          lineHeight: 1.5,
          resize: 'vertical',
        }}
      />

      {extracted && (
        <p
          style={{
            fontSize: 'var(--text-xs)',
            color: 'var(--warn)',
            background: 'var(--warn-subtle)',
            padding: 'var(--s-2) var(--s-3)',
            borderRadius: 4,
            lineHeight: 1.5,
          }}
        >
          This is what came out of your file. PDF extraction mangles things — read it over and
          fix anything wrong before continuing, or the review will be about the wrong text.
        </p>
      )}

      {error && (
        <p role="alert" style={{ fontSize: 'var(--text-xs)', color: 'var(--danger)' }}>
          {error}
        </p>
      )}

      <button
        type="button"
        disabled={busy || tooShort}
        onClick={() => onConfirm(text)}
        style={{
          padding: 'var(--s-2) var(--s-3)',
          borderRadius: 4,
          background: 'var(--accent)',
          color: '#fff',
          alignSelf: 'flex-start',
          fontWeight: 500,
          opacity: busy || tooShort ? 0.5 : 1,
        }}
      >
        {busy ? 'Reading your file…' : 'Review this résumé'}
      </button>
    </div>
  );
}
