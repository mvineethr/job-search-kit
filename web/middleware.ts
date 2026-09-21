import { NextResponse, type NextRequest } from 'next/server';
import { COOKIE_NAME } from '@/lib/cookie';

/**
 * Gate the whole app behind the test password.
 *
 * The signature is NOT verified here — middleware runs on the edge runtime,
 * where node:crypto is unavailable. This only checks a cookie is present, which
 * is enough to redirect strangers to the login page. Every route that reads or
 * writes data verifies the signature properly via requireSid(), so a forged
 * cookie gets past this and then fails where it matters.
 */
export function middleware(req: NextRequest) {
  if (req.cookies.has(COOKIE_NAME)) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = '/login';
  url.search = '';
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    // everything except the login flow, Next internals, and static files
    '/((?!login|api/login|_next/static|_next/image|favicon.ico).*)',
  ],
};
