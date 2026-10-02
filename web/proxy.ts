import { NextResponse, type NextRequest } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';
import { CONSENT_COOKIE, consentCookieValue, isExempt } from '@/lib/consent';

/**
 * Two gates, in order.
 *
 * 1. Signed out → /login. This only checks that a session cookie is present;
 *    validating it here would cost a database call on every request. Every route
 *    that reads or writes data validates the session properly via requireSid().
 * 2. Signed in but not yet agreed to the current Terms → /api/consent/sync,
 *    which checks the database once and either sets the consent cookie or sends
 *    the person to /agree. 303 so a blocked POST becomes a GET.
 */
export async function proxy(req: NextRequest) {
  const session = getSessionCookie(req);
  const { pathname, search } = req.nextUrl;

  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    return NextResponse.redirect(url);
  }

  if (isExempt(pathname)) return NextResponse.next();
  if (req.cookies.get(CONSENT_COOKIE)?.value === (await consentCookieValue(session))) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = '/api/consent/sync';
  url.search = `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url, 303);
}

export const config = {
  matcher: [
    // everything except pages anyone may read, the auth flow, Next internals and static files
    '/((?!login|signup|reset|privacy|terms|help|api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
};
