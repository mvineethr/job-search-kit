'use client';

import { useEffect, useState } from 'react';
import MarkedText from '@/components/MarkedText';

// A scripted example on a fictional résumé, not a live model call: signed-out visitors cost nothing.
const BEFORE = 'Responsible for managing the onboarding process for new customers.';
const FINDING = 'Describes a duty, not a result. No outcome, no scale.';
const AFTER = 'Rebuilt customer onboarding end to end, cutting time to first value by [METRIC NEEDED].';

export default function WritingDemo() {
  const [typed, setTyped] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setTyped(AFTER.length);
      return;
    }
    let n = 0;
    const id = setInterval(() => {
      n = n >= AFTER.length + 40 ? 0 : n + 1; // pause on the finished line, then replay
      setTyped(Math.min(n, AFTER.length));
    }, 45);
    return () => clearInterval(id);
  }, []);

  const done = typed >= AFTER.length;
  return (
    <div className="card demo" aria-label="Example of a bullet being reviewed and rewritten">
      <div className="card-head">
        <h2>Example</h2>
        <span className="tag">Fictional résumé</span>
      </div>
      <div className="card-body">
        <div>
          <p className="demo-label">Your bullet</p>
          <p className="demo-before">{BEFORE}</p>
        </div>
        <p className="notice">{FINDING}</p>
        <div>
          <p className="demo-label">Rewrite</p>
          <p className="demo-after" aria-live="off">
            {done ? <MarkedText text={AFTER} numbers={[]} /> : AFTER.slice(0, typed)}
            {!done && <span className="demo-caret" aria-hidden="true" />}
          </p>
        </div>
        <p className="hint">The number is yours to fill in. It is never guessed.</p>
      </div>
    </div>
  );
}
