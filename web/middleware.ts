import { NextResponse, type NextRequest } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';

/**
 * Send signed-out visitors to the sign-in page.
 *
 * This only checks that a session cookie is present; it cannot validate it on
 * the edge runtime without a database call. Every route that reads or writes
 * data validates the session properly via requireSid(), so a forged cookie gets
 * past this and then fails where it matters.
 */
export function middleware(req: NextRequest) {
  if (getSessionCookie(req)) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = '/login';
  url.search = '';
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    // everything except sign-in, sign-up, password reset, the auth API, Next internals and static files
    '/((?!login|signup|reset|api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
};
