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
      <p className="muted">
        Recruiters skim past these, and many now take them as a sign a document was written by
        AI. Say what you actually did instead.
      </p>
      <ul className="phrase-list">
        {hits.map((h, i) => (
          <li key={i}>
            <strong>{h.phrase}</strong> <span className="muted">in {h.where}</span>
          </li>
        ))}
      </ul>
    </>
  );

  // Inside an existing panel, match its warning boxes instead of nesting another card.
  if (inline) {
    return (
      <div className="notice notice-warn stack">
        <p className="tnum audit-title">{title}</p>
        {body}
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-head">
        <h2 className="tnum">{title}</h2>
      </div>
      <div className="card-body">{body}</div>
    </div>
  );
}
