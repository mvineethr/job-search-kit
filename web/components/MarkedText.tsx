import { METRIC_NEEDED } from '@/lib/resume-schema';

/**
 * Marks numbers the audit could not find in the original, where they sit, so they
 * cannot be missed in a side panel. Whole numbers only: flagging "40" must not
 * mark the "40" inside "400".
 */
function Flagged({ text, numbers }: { text: string; numbers: string[] }) {
  if (numbers.length === 0) return <>{text}</>;
  const escaped = numbers.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const re = new RegExp(`(?<![\\d.,])(${escaped.join('|')})(?![\\d])`, 'g');
  return (
    <>
      {text.split(re).map((part, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="unsupported-number" title="Not in your original résumé. Check it before sending.">
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  );
}

/** Text with [METRIC NEEDED] markers and flagged numbers drawn in. */
export default function MarkedText({ text, numbers }: { text: string; numbers: string[] }) {
  const parts = text.split(METRIC_NEEDED);
  return (
    <>
      {parts.map((part, i) => (
        <span key={i}>
          <Flagged text={part} numbers={numbers} />
          {i < parts.length - 1 && <span className="metric-needed">{METRIC_NEEDED}</span>}
        </span>
      ))}
    </>
  );
}
