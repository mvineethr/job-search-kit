'use client';

import { useEffect, useState } from 'react';

/**
 * Seconds since mount. Model calls take 20–90s with nothing to show until they
 * finish; a counter next to the estimate proves the page is not stuck, without
 * inventing progress stages the server does not report.
 */
export default function Elapsed() {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  return <span className="tnum"> · {secs}s</span>;
}
