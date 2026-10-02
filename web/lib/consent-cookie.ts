import { getSessionCookie } from 'better-auth/cookies';
import { CONSENT_COOKIE, consentCookieValue } from './consent';

/** Set-Cookie for the consent gate, bound to the request's session. Null without a session. */
export async function consentSetCookie(req: Request): Promise<string | null> {
  const session = getSessionCookie(req);
  if (!session) return null;
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${CONSENT_COOKIE}=${await consentCookieValue(session)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}${secure}`;
}
