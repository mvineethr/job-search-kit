import { band, type MatchView } from '@/lib/match';

const R = 52; // ring radius inside a 120px box with a 10px stroke
const C = 2 * Math.PI * R;

/** The score with its number, label and counts always in text, never colour alone. */
export default function FitMeter({ view, large = false }: { view: MatchView; large?: boolean }) {
  if (view.score === null) return null;
  const { label, tone } = band(view.score);
  const meter = {
    role: 'meter',
    'aria-valuemin': 0,
    'aria-valuemax': 100,
    'aria-valuenow': view.score,
    'aria-label': `Fit ${view.score} out of 100, ${label}`,
  } as const;
  const counts = (
    <span className="fit-counts tnum">
      {view.mustMet} of {view.mustTotal} must-haves shown
    </span>
  );
  const warnings = view.hardWarnings.length > 0 && (
    <p className="fit-hard">Hard requirement not shown: {view.hardWarnings.map((r) => r.text).join('; ')}</p>
  );

  if (!large) {
    return (
      <div className="fit">
        <div className="row">
          <strong className={`fit-num tnum fit-${tone}`}>{view.score}</strong>
          <span className={`fit-label fit-${tone}`}>{label}</span>
          {counts}
        </div>
        <div className="fit-bar" {...meter}>
          <div className={`fit-bar-fill fill-${tone}`} style={{ width: `${view.score}%` }} />
        </div>
        {warnings}
      </div>
    );
  }

  return (
    <div className="fit fit-large">
      <svg className="fit-ring" viewBox="0 0 120 120" width="120" height="120" {...meter}>
        <circle cx="60" cy="60" r={R} className="fit-track" />
        <circle
          cx="60" cy="60" r={R}
          className={`fit-arc stroke-${tone}`}
          strokeDasharray={`${(view.score / 100) * C} ${C}`}
          transform="rotate(-90 60 60)"
        />
        <text x="60" y="60" className="fit-ring-num" textAnchor="middle" dominantBaseline="central">
          {view.score}
        </text>
        <text x="60" y="84" className="fit-ring-of" textAnchor="middle">of 100</text>
      </svg>
      <span className={`fit-label fit-${tone}`}>{label}</span>
      {counts}
      {warnings}
    </div>
  );
}
