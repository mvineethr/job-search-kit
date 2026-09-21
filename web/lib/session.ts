import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

export { COOKIE_NAME } from './cookie';

/**
 * A shared password keeps strangers out; the session id keeps testers' data
 * apart. One signed cookie carries both facts: holding a valid signature proves
 * the password was entered, and the payload says whose data this is.
 *
 * This is a testing gate, not an account system. It cannot tell two people on
 * the same browser apart, and clearing cookies loses the work.
 */
function secret(): string {
  const s = process.env.APP_PASSWORD ?? '';
  if (!s) throw new Error('APP_PASSWORD is not set.');
  return s;
}

function sign(sid: string): string {
  return createHmac('sha256', secret()).update(sid).digest('base64url');
}

export function newCookieValue(): string {
  const sid = randomUUID();
  return `${sid}.${sign(sid)}`;
}

/** Returns the session id if the cookie is intact, else null. */
export function readSid(cookieValue: string | undefined): string | null {
  if (!cookieValue) return null;
  const dot = cookieValue.lastIndexOf('.');
  if (dot <= 0) return null;

  const sid = cookieValue.slice(0, dot);
  const given = cookieValue.slice(dot + 1);
  const expected = sign(sid);

  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;
  if (!timingSafeEqual(a, b)) return null;

  return sid;
}

/** Constant-time password check, so a wrong guess reveals nothing by timing. */
export function passwordMatches(given: string): boolean {
  const expected = process.env.APP_PASSWORD ?? '';
  if (!expected) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
