import { COOKIE_NAME, newCookieValue, passwordMatches } from '@/lib/session';

export const runtime = 'nodejs';

/**
 * Built by hand rather than with Response.redirect(), whose headers are
 * immutable — there is no way to attach a Set-Cookie to one.
 */
function redirect(to: string, req: Request, cookie?: string): Response {
  const headers = new Headers({ location: new URL(to, req.url).toString() });
  if (cookie) headers.append('set-cookie', cookie);
  return new Response(null, { status: 303, headers });
}

export async function POST(req: Request) {
  const form = await req.formData();
  const given = String(form.get('password') ?? '');

  if (!passwordMatches(given)) {
    return redirect('/login?wrong=1', req);
  }

  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  const cookie =
    `${COOKIE_NAME}=${newCookieValue()}; Path=/; HttpOnly; SameSite=Lax; ` +
    `Max-Age=${60 * 60 * 24 * 30}${secure}`;

  return redirect('/', req, cookie);
}

export async function DELETE(req: Request) {
  return redirect('/login', req, `${COOKIE_NAME}=; Path=/; HttpOnly; Max-Age=0`);
}
