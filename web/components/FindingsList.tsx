'use client';

import { useEffect, useState } from 'react';
import type { Finding } from '@/lib/findings-schema';

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

export default function FindingsList({ findings }: { findings: Finding[] }) {
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
      {findings.map((f, i) => (
        <div
          key={i}
          style={{
            border: '1px solid var(--border)',
            borderLeft: `3px solid ${
              f.severity === 'critical' ? 'var(--danger)' : 'var(--warn)'
            }`,
            borderRadius: 4,
            padding: 'var(--s-3)',
            background: 'var(--bg-page)',
          }}
        >
          <p
            style={{
              fontSize: 'var(--text-xs)',
              textTransform: 'uppercase',
              letterSpacing: '.06em',
              color: 'var(--text-faint)',
              marginBottom: 'var(--s-1)',
            }}
          >
            {f.severity === 'critical' ? 'Critical' : 'Worth fixing'} · {SECTION_LABEL[f.section]}
          </p>
          <p style={{ marginBottom: 'var(--s-2)', lineHeight: 1.5 }}>{f.finding}</p>
          {jumpable.has(f.section) && (
            <button
              onClick={() => jump(f.section)}
              style={{
                fontSize: 'var(--text-xs)',
                color: 'var(--accent)',
                fontWeight: 500,
                textDecoration: 'underline',
                textUnderlineOffset: 2,
                padding: 0,
              }}
            >
              Jump to {SECTION_LABEL[f.section]}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
