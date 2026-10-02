import { headers } from 'next/headers';
import { auth } from './auth-server';
import { ensureSchema } from './db';

export type SessionUser = { id: string; name: string; email: string };

/** The signed-in user, or null. */
export async function currentUser(): Promise<SessionUser | null> {
  await ensureSchema();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const { id, name, email } = session.user;
  return { id, name, email };
}

/**
 * The id every table filters on. It is the account's user id; the column keeps
 * its old name `sid` from the shared-password test build.
 */
export async function currentSid(): Promise<string | null> {
  return (await currentUser())?.id ?? null;
}

/** For routes that cannot proceed without a signed-in user. */
export async function requireSid(): Promise<string> {
  const sid = await currentSid();
  if (!sid) throw new Error('UNAUTHENTICATED');
  return sid;
}
