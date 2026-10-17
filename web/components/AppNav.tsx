'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import SignOutButton from './SignOutButton';
import { SITE_NAME } from '@/lib/site';
import { NAV, navCurrent } from '@/lib/nav';

type Me = { name: string; email: string; admin: boolean };

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

/** Close a native <details> menu on navigation, on a click outside, and on Escape. */
function useDetailsClose(ref: React.RefObject<HTMLDetailsElement | null>, pathname: string) {
  useEffect(() => {
    if (ref.current) ref.current.open = false;
  }, [ref, pathname]);
  useEffect(() => {
    const close = (e: Event) => {
      const el = ref.current;
      if (!el?.open) return;
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !el.contains(e.target as Node)) el.open = false;
    };
    document.addEventListener('click', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('click', close);
      document.removeEventListener('keydown', close);
    };
  }, [ref]);
}

function Links({ pathname }: { pathname: string }) {
  return (
    <>
      {NAV.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="nav-link"
          aria-current={navCurrent(pathname, item.href) ? 'page' : undefined}
        >
          {item.label}
          {item.soon && <span className="tag tag-soon">Soon</span>}
        </Link>
      ))}
    </>
  );
}

/** The signed-in bar: brand and sections on the left, the account menu on the right. Phones get the sections inside the menu. */
export default function AppNav({ me }: { me: Me }) {
  const pathname = usePathname();
  const account = useRef<HTMLDetailsElement>(null);
  useDetailsClose(account, pathname);

  return (
    <header className="topbar">
      <div className="topbar-in">
        <Link href="/" className="brand">
          <span className="brand-mark" aria-hidden="true" />
          {SITE_NAME}
        </Link>
        <nav className="top-nav" aria-label="Main">
          <Links pathname={pathname} />
        </nav>
        <details className="menu account" ref={account}>
          <summary aria-label={`Account menu for ${me.name}`}>
            <span className="avatar" aria-hidden="true">{initials(me.name) || '?'}</span>
            <span className="account-name">{me.name}</span>
          </summary>
          <div className="menu-pop">
            <nav className="menu-nav" aria-label="Main">
              <Links pathname={pathname} />
            </nav>
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
      </div>
    </header>
  );
}
