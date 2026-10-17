import Link from 'next/link';
import PageBar from '@/components/PageBar';
import { currentUser } from '@/lib/auth';

/**
 * An honest placeholder. The design for these screens exists and is approved;
 * the code does not yet. Saying so plainly beats a broken-looking empty page.
 */
export default async function NotBuiltYet({
  title,
  blurb,
  planned,
}: {
  title: string;
  blurb: string;
  planned: string[];
}) {
  const user = await currentUser();
  return (
    <>
      {user && <PageBar crumbs={[{ label: title }]} />}
      <div className="wrap col-640">
        <div className="page-head">
          <h1>{title}</h1>
          <p className="sub">{blurb}</p>
        </div>

        <div className="card">
          <div className="card-body stack">
            <span className="tag tag-soon">Not built yet</span>

            <div>
              <p className="soon-title">What this will do</p>
              <ul className="soon-list">
                {planned.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>

            <p className="notice">
              The résumé review works today. Everything else is designed and queued — this page
              exists so the shape of the product is visible rather than implied.
            </p>

            <Link href="/review" className="btn btn-primary">
              Review a résumé instead
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
