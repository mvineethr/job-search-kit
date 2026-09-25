import { band, type MatchView } from '@/lib/match';

/** Score as a plain filled bar with the number and counts always in text, never colour alone. */
export default function FitMeter({ view, large = false }: { view: MatchView; large?: boolean }) {
  if (view.score === null) return null;
  const { label, tone } = band(view.score);
  const color = `var(--${tone})`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--s-2)', flexWrap: 'wrap' }}>
        <strong className="tnum" style={{ fontSize: large ? 'var(--text-2xl)' : 'var(--text-base)', color }}>
          {view.score}
        </strong>
        <span style={{ fontWeight: 600, color }}>{label}</span>
        <span className="tnum" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
          {view.mustMet} of {view.mustTotal} must-haves shown
        </span>
      </div>
      <div
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={view.score}
        aria-label={`Fit ${view.score} out of 100, ${label}`}
        style={{ height: large ? 8 : 6, borderRadius: 4, background: 'var(--border)', maxWidth: large ? 480 : 240 }}
      >
        <div style={{ width: `${view.score}%`, height: '100%', borderRadius: 4, background: color }} />
      </div>
      {view.hardWarnings.length > 0 && (
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--danger)' }}>
          Hard requirement not shown: {view.hardWarnings.map((r) => r.text).join('; ')}
        </p>
      )}
    </div>
  );
}
