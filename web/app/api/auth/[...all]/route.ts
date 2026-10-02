import { toNextJsHandler } from 'better-auth/next-js';
import { auth } from '@/lib/auth-server';
import { ensureSchema } from '@/lib/db';

export const runtime = 'nodejs';

const handlers = toNextJsHandler(auth);

// The auth tables must exist before the first sign-up, which can arrive before any page has run ensureSchema.
export async function GET(req: Request) {
  await ensureSchema();
  return handlers.GET(req);
}

export async function POST(req: Request) {
  await ensureSchema();
  return handlers.POST(req);
}
