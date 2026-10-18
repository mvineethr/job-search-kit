'use client';

import { useEffect, useState } from 'react';
import type { Finding } from '@/lib/findings-schema';
import MarkedText from './MarkedText';

/** What happened to a finding's suggested fix. */
export type FixState = 'applied' | 'dismissed' | 'stale';

const SECTION_LABEL: Record<Finding['section'], string> = {
  summary: 'Summary',
  skills: 'Skills',
  experience: 'Experience',
  education: 'Education',
  certifications: 'Certifications',
  document: 'Whole document',
};

/**
 * Jump targets only exist once the résumé is parsed into sections (Phase 2).
 * Until then the link is hidden rather than rendered as a control that silently
 * does nothing — a dead button is worse than an absent one.
 */
export function hasJumpTarget(section: Finding['section']): boolean {
  if (section === 'document') return false;
  if (typeof document === 'undefined') return false;
  return document.getElementById(`sec-${section}`) !== null;
}

function jump(section: Finding['section']) {
  const el = document.getElementById(`sec-${section}`);
  if (!el) return;
  el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  el.style.outline = '2px solid var(--accent)';
  el.style.outlineOffset = '8px';
  window.setTimeout(() => {
    el.style.outline = '';
    el.style.outlineOffset = '';
  }, 2200);
}

export default function FindingsList({
  findings,
  fixState,
  onApply,
  onDismiss,
}: {
  findings: Finding[];
  fixState: Record<number, FixState>;
  onApply?: (i: number) => void;
  onDismiss: (i: number) => void;
}) {
  // Checked after mount, because the targets are rendered by the document beside us.
  const [jumpable, setJumpable] = useState<Set<string>>(new Set());

  useEffect(() => {
    const found = new Set<string>();
    for (const f of findings) {
      if (hasJumpTarget(f.section)) found.add(f.section);
    }
    setJumpable(found);
  }, [findings]);

  if (findings.length === 0) return null;

  return (
    <div className="stack">
      {findings.map((f, i) => (
        <div key={i} className="find-row find-item">
          <span className={`tag ${f.severity === 'critical' ? 'tag-high' : 'tag-med'}`}>
            {f.severity === 'critical' ? 'Critical' : 'Worth fixing'}
          </span>
          <div className="stack find-body">
            <p className="find-where">{SECTION_LABEL[f.section]}</p>
            <p>{f.finding}</p>
            {f.before && f.after && fixState[i] !== 'dismissed' && (
              <div className="fix stack">
                <p className="fix-before">{f.before}</p>
                <p className="fix-after">
                  <MarkedText text={f.after} numbers={[]} />
                </p>
                {fixState[i] === 'applied' && <p className="fix-note">Applied to your résumé.</p>}
                {fixState[i] === 'stale' && (
                  <p className="fix-note">That line has changed since the review, so this was not applied.</p>
                )}
                {!fixState[i] && (
                  <div className="row">
                    {onApply && (
                      <button onClick={() => onApply(i)} className="btn btn-sm btn-primary">
                        Apply
                      </button>
                    )}
                    <button onClick={() => onDismiss(i)} className="btn btn-sm">
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            )}
            {jumpable.has(f.section) && (
              <button onClick={() => jump(f.section)} className="btn btn-sm self-start">
                Jump to {SECTION_LABEL[f.section]}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
