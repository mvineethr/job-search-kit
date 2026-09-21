import { cookies } from 'next/headers';
import { COOKIE_NAME } from './cookie';
import { readSid } from './session';

/** The current visitor's session id, or null if they have not entered the password. */
export async function currentSid(): Promise<string | null> {
  const jar = await cookies();
  return readSid(jar.get(COOKIE_NAME)?.value);
}

/** For routes that cannot proceed without a session. */
export async function requireSid(): Promise<string> {
  const sid = await currentSid();
  if (!sid) throw new Error('UNAUTHENTICATED');
  return sid;
}
