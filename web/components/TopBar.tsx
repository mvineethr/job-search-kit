import Link from 'next/link';
import { SITE_NAME } from '@/lib/site';

/** The bar for people who are not signed in. Signed-in pages use AppNav. */
export default function TopBar() {
  return (
    <header className="topbar">
      <div className="topbar-in">
        <Link href="/" className="brand">
          <span className="brand-mark" aria-hidden="true" />
          {SITE_NAME}
        </Link>
        <div className="signin-link">
          <Link href="/login" className="btn">Sign in</Link>
          <Link href="/signup" className="btn btn-primary">Create account</Link>
        </div>
      </div>
    </header>
  );
}
