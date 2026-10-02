import { headers } from 'next/headers';
import { currentUser } from '@/lib/auth';
import { auth } from '@/lib/auth-server';
import { sql } from '@/lib/db';
import { backWithError } from '@/lib/redirect';
import { CONSENT_COOKIE } from '@/lib/consent';

export const runtime = 'nodejs';

/**
 * Deletes the account and everything stored for it, in one transaction, then
 * signs the browser out. Sessions and linked sign-in methods go with the user row
 * (cascade); pending reset tokens hold the user id in `value` and are removed here.
 * Nothing is kept: the record of which Terms they accepted goes with the profile.
 */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return backWithError(req, '/login', 'Sign in first.');

  const form = await req.formData();
  if (String(form.get('confirm') ?? '').trim().toLowerCase() !== 'delete') {
    return backWithError(req, '/settings', 'Type delete to confirm.');
  }

  // Sign out first, to collect the cookie-clearing headers while the session still exists.
  const out = await auth.api.signOut({ headers: await headers(), asResponse: true });

  const q = sql();
  const sid = user.id;
  await q.transaction([
    q`DELETE FROM letters WHERE sid = ${sid}`,
    q`DELETE FROM resumes WHERE sid = ${sid}`,
    q`DELETE FROM jobs WHERE sid = ${sid}`,
    q`DELETE FROM skill_answers WHERE sid = ${sid}`,
    q`DELETE FROM profiles WHERE sid = ${sid}`,
    q`DELETE FROM verification WHERE value = ${sid}`,
    q`DELETE FROM "user" WHERE id = ${sid}`,
  ]);

  const res = new Headers({ location: new URL('/login?deleted=1', req.url).toString() });
  for (const c of out.headers.getSetCookie()) res.append('set-cookie', c);
  res.append('set-cookie', `${CONSENT_COOKIE}=; Path=/; HttpOnly; Max-Age=0`);
  return new Response(null, { status: 303, headers: res });
}
