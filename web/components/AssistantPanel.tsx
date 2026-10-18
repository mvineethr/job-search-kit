'use client';

import { useState } from 'react';
import { parseFindings, stripFindings, type Finding } from '@/lib/findings-schema';
import { parseEventLines } from '@/lib/ndjson';
import { reviewMessage } from '@/lib/messages';
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
          messages: [{ role: 'user', content: reviewMessage(resumeText) }],
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
    <aside className="card">
      <div className="card-head">
        <h2>Review</h2>
        {running && (
          <button onClick={() => controller?.abort()} className="btn btn-sm ml-auto">
            Cancel
          </button>
        )}
      </div>

      <div className="card-body">
        {!running && raw === '' && (
          <button onClick={run} className="btn btn-primary self-start">
            Review this résumé
          </button>
        )}

        {running && raw === '' && (
          <div className="stack">
            <p className="muted">{thinking ? 'Working through your résumé…' : 'Reading your résumé…'}</p>
            {thinking && <p className="thinking-line">{lastLine(thinking)}</p>}
          </div>
        )}

        {degraded && (
          <p className="notice notice-warn">
            Served by a backup model — the output may be weaker. Re-run for a better one.
          </p>
        )}

        <div aria-live="polite" aria-busy={running} className="pre-wrap">
          {stripFindings(raw)}
        </div>

        <FindingsList findings={findings} />

        {!running && raw !== '' && (
          <button onClick={run} className="btn self-start">
            Run it again
          </button>
        )}

        {error && (
          <p role="alert" className="notice notice-error">
            {error}
          </p>
        )}
      </div>
    </aside>
  );
}
