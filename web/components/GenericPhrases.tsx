import { loadAtsRules } from '@/lib/prompts';
import { bannedPhrases, findGenericPhrases } from '@/lib/generic-phrases';

/** Lists filler words recruiters read as generic or AI-written. Renders nothing when clean. */
export default function GenericPhrases({
  parts,
  posting,
  inline = false,
}: {
  parts: { where: string; text: string }[];
  posting?: string;
  inline?: boolean;
}) {
  const hits = findGenericPhrases(parts, bannedPhrases(loadAtsRules()), posting);
  if (hits.length === 0) return null;

  const title = `${hits.length} ${hits.length === 1 ? 'phrase reads' : 'phrases read'} as filler`;
  const body = (
    <>
      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', lineHeight: 1.5 }}>
        Recruiters skim past these, and many now take them as a sign a document was written by
        AI. Say what you actually did instead.
      </p>
      <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6, fontSize: 'var(--text-sm)' }}>
        {hits.map((h, i) => (
          <li key={i}>
            <strong>{h.phrase}</strong> <span style={{ color: 'var(--text-muted)' }}>in {h.where}</span>
          </li>
        ))}
      </ul>
    </>
  );

  // Inside an existing panel, match its warning boxes instead of nesting another panel.
  if (inline) {
    return (
      <div
        style={{
          border: '1px solid var(--border)',
          borderLeft: '3px solid var(--warn)',
          borderRadius: 4,
          padding: 'var(--s-3)',
          background: 'var(--bg-page)',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        <p className="tnum" style={{ fontWeight: 600 }}>{title}</p>
        {body}
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <h2 className="tnum">{title}</h2>
      </div>
      <div className="panel-body">{body}</div>
    </div>
  );
}
