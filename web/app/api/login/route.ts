import { COOKIE_NAME, newCookieValue, passwordMatches } from '@/lib/session';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const form = await req.formData();
  const given = String(form.get('password') ?? '');

  if (!passwordMatches(given)) {
    return Response.redirect(new URL('/login?wrong=1', req.url), 303);
  }

  const res = Response.redirect(new URL('/', req.url), 303);
  res.headers.append(
    'set-cookie',
    `${COOKIE_NAME}=${newCookieValue()}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}${
      process.env.NODE_ENV === 'production' ? '; Secure' : ''
    }`,
  );
  return res;
}

export async function DELETE(req: Request) {
  const res = Response.redirect(new URL('/login', req.url), 303);
  res.headers.append('set-cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; Max-Age=0`);
  return res;
}
