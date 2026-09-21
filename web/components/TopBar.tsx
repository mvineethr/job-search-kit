'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/', label: 'Home' },
  { href: '/jobs', label: 'Jobs' },
  { href: '/email', label: 'Cold email' },
  { href: '/linkedin', label: 'LinkedIn' },
];

export default function TopBar() {
  const pathname = usePathname();

  return (
    <header className="topbar">
      <div className="topbar-in">
        <Link href="/" className="brand" style={{ textDecoration: 'none', color: 'inherit' }}>
          Job Search Kit
        </Link>
        <nav className="nav">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={
                item.href === '/' ? (pathname === '/' ? 'page' : undefined)
                : pathname.startsWith(item.href) ? 'page'
                : undefined
              }
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="avatar" aria-hidden="true">
          JS
        </div>
      </div>
    </header>
  );
}
