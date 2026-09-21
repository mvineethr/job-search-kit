'use client';

import { useState } from 'react';

export default function CopyButton({ text, label = 'Copy text' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      className="btn"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch {
          // Clipboard can be blocked; the text is still selectable on the page.
        }
      }}
    >
      {copied ? 'Copied' : label}
    </button>
  );
}
