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
          className={item.soon ? 'side-link side-soon' : 'side-link'}
          aria-current={navCurrent(pathname, item.href) ? 'page' : undefined}
        >
          {item.label}
          {item.soon && <span className="tag tag-soon">Soon</span>}
        </Link>
      ))}
    </>
  );
}

function AccountLinks({ me }: { me: Me }) {
  return (
    <>
      <div className="who">
        <strong>{me.name}</strong>
        <span>{me.email}</span>
      </div>
      <Link href="/start">Profile</Link>
      <Link href="/settings">Settings</Link>
      <Link href="/help">Help</Link>
      {me.admin && <Link href="/admin">Admin</Link>}
      <SignOutButton className="" />
    </>
  );
}

export default function Sidebar({ me }: { me: Me }) {
  const pathname = usePathname();
  const account = useRef<HTMLDetailsElement>(null);
  const mobile = useRef<HTMLDetailsElement>(null);
  useDetailsClose(account, pathname);
  useDetailsClose(mobile, pathname);

  const brand = (
    <Link href="/" className="brand">
      <span className="brand-mark" aria-hidden="true" />
      {SITE_NAME}
    </Link>
  );

  return (
    <>
      <aside className="sidebar" aria-label="Main">
        {brand}
        <nav className="side-nav">
          <Links pathname={pathname} />
        </nav>
        <details className="menu side-account" ref={account}>
          <summary aria-label={`Account menu for ${me.name}`}>
            <span className="avatar" aria-hidden="true">{initials(me.name) || '?'}</span>
            <span className="side-name">{me.name}</span>
          </summary>
          <div className="menu-pop menu-up">
            <AccountLinks me={me} />
          </div>
        </details>
      </aside>

      <header className="mobile-bar">
        {brand}
        <details className="menu" ref={mobile}>
          <summary className="btn btn-sm" aria-label="Menu">Menu</summary>
          <div className="menu-pop">
            <nav className="side-nav">
              <Links pathname={pathname} />
            </nav>
            <AccountLinks me={me} />
          </div>
        </details>
      </header>
    </>
  );
}
