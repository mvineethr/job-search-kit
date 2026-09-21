import Link from 'next/link';

/**
 * An honest placeholder. The design for these screens exists and is approved;
 * the code does not yet. Saying so plainly beats a broken-looking empty page.
 */
export default function NotBuiltYet({
  title,
  blurb,
  planned,
}: {
  title: string;
  blurb: string;
  planned: string[];
}) {
  return (
    <div className="wrap">
      <div className="page-head">
        <h1>{title}</h1>
        <p className="sub">{blurb}</p>
      </div>

      <div
        style={{
          border: '1px solid var(--border)',
          borderRadius: 8,
          background: 'var(--bg-surface)',
          padding: 'var(--s-6)',
          maxWidth: 640,
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--s-4)',
        }}
      >
        <span className="pill pill-soon" style={{ alignSelf: 'flex-start' }}>
          Not built yet
        </span>

        <div>
          <p style={{ fontWeight: 600, marginBottom: 'var(--s-2)' }}>What this will do</p>
          <ul
            style={{
              margin: 0,
              paddingLeft: 20,
              color: 'var(--text-muted)',
              lineHeight: 1.7,
            }}
          >
            {planned.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>

        <p className="note">
          The résumé review works today. Everything else is designed and queued — this page
          exists so the shape of the product is visible rather than implied.
        </p>

        <Link href="/review" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>
          Review a résumé instead
        </Link>
      </div>
    </div>
  );
}
