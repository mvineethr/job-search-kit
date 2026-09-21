/**
 * Redirects for form posts.
 *
 * Built by hand because Response.redirect() returns immutable headers. And
 * errors go back to the page the form came from, as a message — a browser form
 * post that answers with raw JSON leaves the person staring at {"error":...}
 * with no way back.
 */
export function redirectTo(req: Request, path: string, cookie?: string): Response {
  const headers = new Headers({ location: new URL(path, req.url).toString() });
  if (cookie) headers.append('set-cookie', cookie);
  return new Response(null, { status: 303, headers });
}

export function backWithError(req: Request, path: string, message: string): Response {
  const url = new URL(path, req.url);
  url.searchParams.set('error', message);
  return redirectTo(req, url.pathname + url.search);
}
