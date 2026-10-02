import type { Metadata } from 'next';
import Link from 'next/link';
import { Inter, Source_Serif_4 } from 'next/font/google';
import './globals.css';
import TopBar from '@/components/TopBar';
import { currentUser } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import { REPO_URL, SITE_NAME } from '@/lib/site';

// Downloaded at build time and served from this site: visitors' browsers never
// contact Google for fonts, so no IP addresses go to a third party on page load.
const sans = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const serif = Source_Serif_4({ subsets: ['latin'], variable: '--font-serif', axes: ['opsz'], display: 'swap' });

export const metadata: Metadata = {
  title: SITE_NAME,
  description: 'Fix your résumé against the jobs you actually want.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  const me = user ? { name: user.name || user.email, email: user.email, admin: isAdmin(user.email) } : null;

  return (
    <html lang="en" className={`${sans.variable} ${serif.variable}`}>
      <body>
        <TopBar me={me} />
        {children}
        <footer className="site-foot">
          <div className="site-foot-in">
            <span>{SITE_NAME} · free and open source</span>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/help">Help</Link>
            <a href={REPO_URL} target="_blank" rel="noreferrer">
              Source code
            </a>
            <span>Not affiliated with LinkedIn, Google or any employer.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
