import { currentUser } from '@/lib/auth';
import { acceptTerms } from '@/lib/profile';
import { safeNext } from '@/lib/consent';
import { consentSetCookie } from '@/lib/consent-cookie';
import { backWithError, redirectTo } from '@/lib/redirect';
import { TERMS_VERSION } from '@/lib/site';

export const runtime = 'nodejs';

/** The agreement form. All three boxes are required; the browser enforces it and so does this. */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return redirectTo(req, '/login');

  const form = await req.formData();
  const next = safeNext(String(form.get('next') ?? ''));
  const all = ['agree_terms', 'agree_ai', 'age_ok'].every((k) => form.get(k) === '1');
  if (!all) {
    return backWithError(req, `/agree?next=${encodeURIComponent(next)}`, 'Tick all three boxes to continue.');
  }

  await acceptTerms(user.id, user.name, TERMS_VERSION);
  return redirectTo(req, next, (await consentSetCookie(req)) ?? undefined);
}
