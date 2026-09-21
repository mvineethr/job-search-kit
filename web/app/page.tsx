'use client';

import { useState } from 'react';
import TextOrFileInput from '@/components/TextOrFileInput';
import AssistantPanel from '@/components/AssistantPanel';

export default function Page() {
  const [resumeText, setResumeText] = useState<string | null>(null);

  if (!resumeText) {
    return (
      <main style={{ maxWidth: 720, margin: '0 auto', padding: 'var(--s-8) var(--s-4)' }}>
        <h1 style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--s-2)' }}>
          Find out what is wrong with your résumé
        </h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--s-6)', lineHeight: 1.5 }}>
          An honest read, anchored to the parts that need work. Nothing is rewritten, and your
          file is turned into text and then discarded.
        </p>
        <TextOrFileInput onConfirm={setResumeText} />
      </main>
    );
  }

  return (
    <main
      className="canvas-split"
      style={{
        maxWidth: 1200,
        margin: '0 auto',
        padding: 'var(--s-6) var(--s-4)',
        display: 'grid',
        gap: 'var(--s-6)',
        gridTemplateColumns: 'minmax(0,1fr) 380px',
        alignItems: 'start',
      }}
    >
      <article
        style={{
          background: 'var(--doc-bg)',
          color: 'var(--doc-text)',
          border: '1px solid var(--doc-border)',
          borderRadius: 8,
          padding: 'var(--s-12)',
          whiteSpace: 'pre-wrap',
          fontFamily: 'var(--serif)',
          fontSize: 'var(--text-base)',
          lineHeight: 1.6,
        }}
      >
        {resumeText}
      </article>
      <AssistantPanel resumeText={resumeText} />
    </main>
  );
}
