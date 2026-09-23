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
    <div className="panel">
      <div className="panel-head">
        <h2>Checked against your résumé</h2>
      </div>
      <div className="panel-body">
        {clean ? (
          <p className="note">
            Every skill, number and employer in this copy traces back to your original. No
            bullets were dropped.
          </p>
        ) : null}

        {audit.removedSkills.length > 0 && (
          <div
            style={{
              border: '1px solid var(--border)',
              borderLeft: '3px solid var(--warn)',
              borderRadius: 4,
              padding: 'var(--s-3)',
              background: 'var(--bg-page)',
            }}
          >
            <p style={{ fontWeight: 600, marginBottom: 4 }}>
              {audit.removedSkills.length}{' '}
              {audit.removedSkills.length === 1 ? 'skill was' : 'skills were'} removed
            </p>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 6 }}>
              The posting asks for these and your résumé does not mention them, so they were
              taken out rather than left for you to defend in an interview.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {audit.removedSkills.map((s) => (
                <span
                  key={s}
                  style={{
                    fontSize: 'var(--text-xs)',
                    padding: '3px 8px',
                    borderRadius: 4,
                    background: 'var(--warn-subtle)',
                    color: 'var(--warn)',
                  }}
                >
                  {s}
                </span>
              ))}
            </div>
            <p className="note" style={{ marginTop: 'var(--s-2)' }}>
              If you genuinely have one of these, add it to your master résumé and tailor
              again — then it is a real claim rather than a borrowed one.
            </p>
          </div>
        )}

        {audit.unsupportedNumbers.length > 0 && (
          <div
            style={{
              border: '1px solid var(--border)',
              borderLeft: '3px solid var(--danger)',
              borderRadius: 4,
              padding: 'var(--s-3)',
              background: 'var(--bg-page)',
            }}
          >
            <p style={{ fontWeight: 600, marginBottom: 4, color: 'var(--danger)' }}>
              Check these numbers
            </p>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 6 }}>
              These do not appear in your original résumé. Verify each one before you send
              this — they were left in place rather than edited, so you can see them.
            </p>
            <p style={{ fontSize: 'var(--text-sm)' }}>{audit.unsupportedNumbers.join(', ')}</p>
          </div>
        )}

        {audit.unsupportedEmployers.length > 0 && (
          <div
            style={{
              border: '1px solid var(--danger)',
              borderRadius: 4,
              padding: 'var(--s-3)',
              background: 'var(--bg-page)',
            }}
          >
            <p style={{ fontWeight: 600, marginBottom: 4, color: 'var(--danger)' }}>
              An employer here is not on your original
            </p>
            <p style={{ fontSize: 'var(--text-sm)' }}>{audit.unsupportedEmployers.join(', ')}</p>
          </div>
        )}

        {audit.bulletsDropped > 0 && (
          <p className="note">
            {audit.bulletsDropped} {audit.bulletsDropped === 1 ? 'bullet was' : 'bullets were'}{' '}
            dropped from your original. Compare against your master before sending — real
            experience may have been left out.
          </p>
        )}
      </div>
    </div>
  );
}
