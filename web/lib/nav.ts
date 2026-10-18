export const NAV: { href: string; label: string; soon?: boolean }[] = [
  { href: '/', label: 'Home' },
  { href: '/resumes', label: 'Résumés' },
  { href: '/jobs', label: 'Jobs' },
  { href: '/linkedin', label: 'LinkedIn', soon: true },
  { href: '/email', label: 'Cold email', soon: true },
];

// Pages that live under another section's nav item.
const ALSO: Record<string, string[]> = { '/resumes': ['/resume'], '/jobs': ['/letter'] };

const under = (pathname: string, base: string) => pathname === base || pathname.startsWith(base + '/');

export function navCurrent(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return [href, ...(ALSO[href] ?? [])].some((base) => under(pathname, base));
}
