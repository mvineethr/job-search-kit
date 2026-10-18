'use client';

import { useState } from 'react';
import { parseFindings, stripFindings, type Finding } from '@/lib/findings-schema';
import { parseEventLines } from '@/lib/ndjson';
import { reviewMessage } from '@/lib/messages';
import { checkFix, requestApply, type Fix } from '@/lib/review-fixes';
import type { Resume } from '@/lib/resume-schema';
import FindingsList, { type FixState } from './FindingsList';

const fixOf = (f: Finding): Fix | null => (f.before && f.after ? { before: f.before, after: f.after } : null);

/**
 * Keeps a suggested fix only when code confirms it adds nothing the résumé does not
 * say; the finding itself always stays. A plain-text résumé has no lines to check
 * against, so it gets findings only.
 */
function verified(findings: Finding[], resume: Resume | null): { findings: Finding[]; dropped: number } {
  let dropped = 0;
  const kept = findings.map((f) => {
    const fix = fixOf(f);
    if (!fix) return f;
    if (resume && checkFix(resume, fix)) return f;
    if (resume) dropped++;
    return { ...f, before: undefined, after: undefined };
  });
  return { findings: kept, dropped };
}

/** The last line of the model's thinking, as a live sign of progress. */
function lastLine(s: string): string {
  const lines = s.trim().split('\n');
  return lines[lines.length - 1]?.slice(-160) ?? '';
}

export default function AssistantPanel({ resumeText, resume }: { resumeText: string; resume: Resume | null }) {
  const [raw, setRaw] = useState('');
  const [thinking, setThinking] = useState('');
  const [findings, setFindings] = useState<Finding[]>([]);
  const [fixState, setFixState] = useState<Record<number, FixState>>({});
  const [dropped, setDropped] = useState(0);
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
    setFixState({});
    setDropped(0);
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
      const v = verified(parseFindings(content), resume);
      setFindings(v.findings);
      setDropped(v.dropped);
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        setError('That did not finish. Your résumé is unchanged — try again?');
      }
    } finally {
      setRunning(false);
      setController(null);
    }
  }

  function apply(indices: number[]) {
    const applied = requestApply(indices.map((i) => fixOf(findings[i])!));
    setFixState((s) => ({ ...s, ...Object.fromEntries(indices.map((i, k) => [i, applied[k] ? 'applied' : 'stale'])) }));
  }
  const pending = findings.flatMap((f, i) => (fixOf(f) && !fixState[i] ? [i] : []));

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

        {resume && pending.length > 1 && (
          <div className="row">
            <button onClick={() => apply(pending)} className="btn btn-primary">
              Apply all {pending.length} fixes
            </button>
            <span className="muted fix-note">Each one is still editable on the page.</span>
          </div>
        )}

        <FindingsList
          findings={findings}
          fixState={fixState}
          onApply={resume ? (i) => apply([i]) : undefined}
          onDismiss={(i) => setFixState((s) => ({ ...s, [i]: 'dismissed' }))}
        />

        {dropped > 0 && (
          <p className="notice">
            {dropped} suggested {dropped === 1 ? 'rewrite was' : 'rewrites were'} left out because{' '}
            {dropped === 1 ? 'it' : 'they'} added a number or a name your résumé does not have, or
            quoted a line that is not in it.
          </p>
        )}

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
