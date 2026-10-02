'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import SignOutButton from './SignOutButton';
import { SITE_NAME } from '@/lib/site';

const NAV = [
  { href: '/', label: 'Home' },
  { href: '/jobs', label: 'Jobs' },
  { href: '/email', label: 'Cold email' },
  { href: '/linkedin', label: 'LinkedIn' },
];

type Me = { name: string; email: string; admin: boolean } | null;

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

export default function TopBar({ me }: { me: Me }) {
  const pathname = usePathname();
  const menu = useRef<HTMLDetailsElement>(null);

  // A native <details> menu: close it on navigation, on a click outside, and on Escape.
  useEffect(() => {
    if (menu.current) menu.current.open = false;
  }, [pathname]);
  useEffect(() => {
    const close = (e: Event) => {
      const el = menu.current;
      if (!el?.open) return;
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !el.contains(e.target as Node)) el.open = false;
    };
    document.addEventListener('click', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('click', close);
      document.removeEventListener('keydown', close);
    };
  }, []);

  return (
    <header className="topbar">
      <div className="topbar-in">
        <Link href="/" className="brand" style={{ textDecoration: 'none', color: 'inherit' }}>
          {SITE_NAME}
        </Link>
        {me && (
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
        )}
        {me ? (
          <details className="menu" ref={menu}>
            <summary className="avatar" aria-label={`Account menu for ${me.name}`}>
              {initials(me.name) || '?'}
            </summary>
            <div className="menu-pop">
              <div className="who">
                <strong>{me.name}</strong>
                <span>{me.email}</span>
              </div>
              <Link href="/start">Profile</Link>
              <Link href="/settings">Settings</Link>
              <Link href="/help">Help</Link>
              {me.admin && <Link href="/admin">Admin</Link>}
              <SignOutButton className="" />
            </div>
          </details>
        ) : (
          <Link href="/login" className="btn signin-link">
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}
