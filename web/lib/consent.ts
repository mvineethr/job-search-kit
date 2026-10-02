import { TERMS_VERSION } from './site';

/**
 * The Terms gate. Acceptance is recorded in the database (the evidence); this
 * cookie only spares the proxy a database call on every request.
 *
 * Its value binds the accepted version to the current session token, so a new
 * sign-in — possibly a different person on the same browser — is re-checked
 * against the database once, and a Terms update sends everyone back to /agree.
 * Forging it only lets someone skip the page for themselves; nothing is recorded.
 */
export const CONSENT_COOKIE = 'jsk_terms';

/** Paths a signed-in person may reach before accepting. */
export const CONSENT_EXEMPT = ['/agree', '/api/consent', '/privacy', '/terms', '/help', '/api/auth', '/login', '/signup', '/reset'];

export function isExempt(pathname: string): boolean {
  return CONSENT_EXEMPT.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function consentCookieValue(sessionToken: string, version = TERMS_VERSION): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(sessionToken));
  const hex = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
  return `${version}.${hex.slice(0, 16)}`;
}

/** Only same-site paths, so `next` can't bounce someone to another site after accepting. */
export function safeNext(next: string | null | undefined): string {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
}
