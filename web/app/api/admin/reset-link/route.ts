import { headers } from 'next/headers';
import { currentUser } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import { auth, pendingResetLinks } from '@/lib/auth-server';
import { emailConfigured } from '@/lib/email';

export const runtime = 'nodejs';

/**
 * Makes a one-time password reset link for a user. With email configured the
 * link is emailed to them; without it, the link comes back here for the admin to
 * pass on by hand. It is returned in the response body only — never in a URL or
 * a log line, because whoever holds it can set the password.
 */
export async function POST(req: Request) {
  const me = await currentUser();
  if (!me || !isAdmin(me.email)) return Response.json({ error: 'Not allowed.' }, { status: 403 });

  const { email } = (await req.json().catch(() => ({}))) as { email?: string };
  if (!email) return Response.json({ error: 'No email given.' }, { status: 400 });
  const key = email.toLowerCase();

  pendingResetLinks.delete(key);
  await auth.api.requestPasswordReset({ body: { email, redirectTo: '/reset' }, headers: await headers() });

  if (emailConfigured()) return Response.json({ sent: true });

  const url = pendingResetLinks.get(key);
  pendingResetLinks.delete(key);
  // Better Auth answers the same way for unknown emails, so a missing link means no such account.
  if (!url) return Response.json({ error: 'No account uses that email, or it signs in with Google or LinkedIn only.' }, { status: 404 });
  return Response.json({ url });
}
