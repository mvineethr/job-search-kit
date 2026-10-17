import Link from 'next/link';

/** The row at the top of a signed-in page: where you are on the left, what you can do on the right. */
export default function PageBar({
  crumbs,
  children,
}: {
  crumbs: { href?: string; label: string }[];
  children?: React.ReactNode;
}) {
  return (
    <div className="page-bar">
      <nav className="crumb" aria-label="Breadcrumb">
        {crumbs.map((c, i) => (
          <span key={i} className="crumb-item">
            {i > 0 && <span className="sep" aria-hidden="true">/</span>}
            {c.href ? <Link href={c.href}>{c.label}</Link> : <strong aria-current="page">{c.label}</strong>}
          </span>
        ))}
      </nav>
      {children && <div className="rail">{children}</div>}
    </div>
  );
}
