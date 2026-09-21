'use client';

import { useState } from 'react';
import Link from 'next/link';
import TextOrFileInput from '@/components/TextOrFileInput';
import AssistantPanel from '@/components/AssistantPanel';

export default function ReviewPage() {
  const [resumeText, setResumeText] = useState<string | null>(null);

  if (!resumeText) {
    return (
      <div className="wrap" style={{ maxWidth: 720 }}>
        <div className="page-head">
          <h1>Find out what is wrong with your résumé</h1>
          <p className="sub">
            An honest read, anchored to the parts that need work. Nothing is rewritten, and
            your file is turned into text and then discarded.
          </p>
        </div>
        <TextOrFileInput onConfirm={setResumeText} />
      </div>
    );
  }

  return (
    <>
      <div className="canvas-head">
        <div className="canvas-head-in">
          <div className="crumb">
            <Link href="/">Home</Link>
            <span className="sep">›</span>
            <strong>Résumé review</strong>
          </div>
          <div className="rail">
            <button className="btn" onClick={() => setResumeText(null)}>
              Start over
            </button>
          </div>
        </div>
      </div>

      <main
        className="canvas-split"
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: 'var(--s-6) var(--s-4) var(--s-16)',
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
            boxShadow: 'var(--shadow)',
          }}
        >
          {resumeText}
        </article>
        <AssistantPanel resumeText={resumeText} />
      </main>
    </>
  );
}
