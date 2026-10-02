import { currentUser } from '@/lib/auth';
import { acceptedTermsVersion } from '@/lib/profile';
import { safeNext } from '@/lib/consent';
import { consentSetCookie } from '@/lib/consent-cookie';
import { redirectTo } from '@/lib/redirect';
import { TERMS_VERSION } from '@/lib/site';

export const runtime = 'nodejs';

/**
 * Where the proxy sends a signed-in request without a matching consent cookie:
 * once per sign-in, or after a Terms update. Already agreed → set the cookie and
 * carry on; not yet → the agreement page.
 */
export async function GET(req: Request) {
  const next = safeNext(new URL(req.url).searchParams.get('next'));
  const user = await currentUser();
  if (!user) return redirectTo(req, '/login');

  if ((await acceptedTermsVersion(user.id)) === TERMS_VERSION) {
    return redirectTo(req, next, (await consentSetCookie(req)) ?? undefined);
  }
  return redirectTo(req, `/agree?next=${encodeURIComponent(next)}`);
}
