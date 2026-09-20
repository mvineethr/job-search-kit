'use client';

import { useState } from 'react';
import { parseFindings, stripFindings, type Finding } from '@/lib/findings-schema';
import { parseEventLines } from '@/lib/ndjson';
import FindingsList from './FindingsList';

/** The last line of the model's thinking, as a live sign of progress. */
function lastLine(s: string): string {
  const lines = s.trim().split('\n');
  return lines[lines.length - 1]?.slice(-160) ?? '';
}

export default function AssistantPanel({ resumeText }: { resumeText: string }) {
  const [raw, setRaw] = useState('');
  const [thinking, setThinking] = useState('');
  const [findings, setFindings] = useState<Finding[]>([]);
  const [running, setRunning] = useState(false);
  const [degraded, setDegraded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [controller, setController] = useState<AbortController | null>(null);

  async function run() {
    const ac = new AbortController();
    setController(ac);
    setRunning(true);
    setRaw('');
    setThinking('');
    setFindings([]);
    setError(null);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          capability: 'resume-review',
          messages: [{ role: 'user', content: resumeText }],
        }),
        signal: ac.signal,
      });

      if (!res.ok || !res.body) {
        setError(await res.text());
        return;
      }
      setDegraded(res.headers.get('x-degraded') === 'true');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let content = '';
      let reasoning = '';

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const { events, rest } = parseEventLines(buffer);
        buffer = rest;

        for (const ev of events) {
          if (ev.type === 'content') content += ev.text;
          else reasoning += ev.text;
        }
        if (content) setRaw(content);
        if (reasoning) setThinking(reasoning);
      }
      setFindings(parseFindings(content));
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        setError('That did not finish. Your résumé is unchanged — try again?');
      }
    } finally {
      setRunning(false);
      setController(null);
    }
  }

  return (
    <aside
      style={{
        border: '1px solid var(--border)',
        borderRadius: 8,
        background: 'var(--bg-surface)',
        padding: 'var(--s-4)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--s-4)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-2)' }}>
        <h2 style={{ fontSize: 'var(--text-sm)' }}>Review</h2>
        {running && (
          <button
            onClick={() => controller?.abort()}
            style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}
          >
            Cancel
          </button>
        )}
      </div>

      {!running && raw === '' && (
        <button
          onClick={run}
          style={{
            padding: 'var(--s-2) var(--s-3)',
            borderRadius: 4,
            background: 'var(--accent)',
            color: '#fff',
            fontWeight: 500,
            alignSelf: 'flex-start',
          }}
        >
          Review this résumé
        </button>
      )}

      {running && raw === '' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-2)' }}>
          <p style={{ color: 'var(--text-muted)' }}>
            {thinking ? 'Working through your résumé…' : 'Reading your résumé…'}
          </p>
          {thinking && (
            <p
              style={{
                fontSize: 'var(--text-xs)',
                color: 'var(--text-faint)',
                fontStyle: 'italic',
                lineHeight: 1.5,
                borderLeft: '2px solid var(--border)',
                paddingLeft: 'var(--s-3)',
              }}
            >
              {lastLine(thinking)}
            </p>
          )}
        </div>
      )}

      {degraded && (
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--warn)', lineHeight: 1.5 }}>
          Served by a backup model — the output may be weaker. Re-run for a better one.
        </p>
      )}

      <div aria-live="polite" aria-busy={running} style={{ whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>
        {stripFindings(raw)}
      </div>

      <FindingsList findings={findings} />

      {!running && raw !== '' && (
        <button
          onClick={run}
          style={{
            padding: 'var(--s-2) var(--s-3)',
            borderRadius: 4,
            border: '1px solid var(--border-strong)',
            alignSelf: 'flex-start',
            fontWeight: 500,
          }}
        >
          Run it again
        </button>
      )}

      {error && (
        <p role="alert" style={{ color: 'var(--danger)', fontSize: 'var(--text-xs)' }}>
          {error}
        </p>
      )}
    </aside>
  );
}
