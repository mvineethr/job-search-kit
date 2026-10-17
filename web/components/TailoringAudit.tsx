import type { TailoringAudit } from '@/lib/verify-tailoring';

/**
 * Shows what the tailoring actually did to the résumé, as opposed to what it says
 * it did. Every claim on a résumé has to survive an interview, so a removed or
 * suspect claim is worth more attention than a polished paragraph.
 */
export default function TailoringAuditPanel({ audit }: { audit: TailoringAudit }) {
  const clean =
    audit.removedSkills.length === 0 &&
    audit.unsupportedNumbers.length === 0 &&
    audit.unsupportedEmployers.length === 0 &&
    audit.bulletsDropped === 0;

  return (
    <div className="card">
      <div className="card-head">
        <h2>Checked against your résumé</h2>
      </div>
      <div className="card-body">
        {clean ? (
          <p className="notice">
            Every skill, number and employer in this copy traces back to your original. No
            bullets were dropped.
          </p>
        ) : null}

        {audit.removedSkills.length > 0 && (
          <div className="notice notice-warn stack">
            <p className="audit-title">
              {audit.removedSkills.length}{' '}
              {audit.removedSkills.length === 1 ? 'skill was' : 'skills were'} removed
            </p>
            <p>
              The posting asks for these and your résumé does not mention them, so they were
              taken out rather than left for you to defend in an interview.
            </p>
            <div className="row audit-tags">
              {audit.removedSkills.map((s) => (
                <span key={s} className="tag tag-warn">
                  {s}
                </span>
              ))}
            </div>
            <p>
              If you genuinely have one of these, add it to your master résumé and tailor
              again — then it is a real claim rather than a borrowed one.
            </p>
          </div>
        )}

        {audit.unsupportedNumbers.length > 0 && (
          <div className="notice notice-error stack">
            <p className="audit-title">Check these numbers</p>
            <p>
              These do not appear in your original résumé, and are marked in red in the
              document. Verify each one before you send this — they were left in place rather
              than edited, so you can see them.
            </p>
            <p>{audit.unsupportedNumbers.join(', ')}</p>
          </div>
        )}

        {audit.unsupportedEmployers.length > 0 && (
          <div className="notice notice-error stack">
            <p className="audit-title">An employer here is not on your original</p>
            <p>{audit.unsupportedEmployers.join(', ')}</p>
          </div>
        )}

        {(audit.bulletsRestored ?? 0) > 0 && (
          <p className="notice">
            The rewrite left out {audit.bulletsRestored} of your original bullets. They have
            been put back word for word at the end of their role, so no real experience is lost.
          </p>
        )}

        {audit.bulletsDropped > 0 && (
          <p className="notice">
            {audit.bulletsDropped} {audit.bulletsDropped === 1 ? 'bullet was' : 'bullets were'}{' '}
            dropped from your original. Compare against your master before sending — real
            experience may have been left out.
          </p>
        )}
      </div>
    </div>
  );
}
