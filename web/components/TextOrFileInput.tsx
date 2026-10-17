'use client';

import { useId, useState } from 'react';

const MIN_CHARS = 50;

export default function TextOrFileInput({
  onConfirm,
  label = 'Upload your résumé',
  accept = 'application/pdf,text/plain,text/markdown,.md,.txt',
  buttonLabel = 'Review this résumé',
}: {
  onConfirm: (text: string) => void;
  label?: string;
  accept?: string;
  buttonLabel?: string;
}) {
  const id = useId();
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
    <div className="stack">
      <label htmlFor={`${id}-file`} className="field-label">
        {label}
      </label>
      <input
        id={`${id}-file`}
        type="file"
        accept={accept}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
        }}
      />

      <label htmlFor={`${id}-text`} className="field-label-gap">
        Or paste it
      </label>
      <textarea
        id={`${id}-text`}
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={14}
        placeholder="Paste the whole thing…"
        className="field-text"
      />

      {extracted && (
        <p className="notice notice-warn">
          This is what came out of your file. PDF extraction mangles things — read it over and
          fix anything wrong before continuing, or the review will be about the wrong text.
        </p>
      )}

      {error && (
        <p role="alert" className="notice notice-error">
          {error}
        </p>
      )}

      <button
        type="button"
        disabled={busy || tooShort}
        onClick={() => onConfirm(text)}
        className="btn btn-primary self-start"
      >
        {busy ? 'Reading your file…' : buttonLabel}
      </button>
    </div>
  );
}
