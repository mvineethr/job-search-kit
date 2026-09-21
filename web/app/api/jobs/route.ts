import { randomUUID } from 'node:crypto';
import { requireSid } from '@/lib/auth';
import { ensureSchema, sql } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  let sid: string;
  try {
    sid = await requireSid();
  } catch {
    return Response.json({ error: 'Sign in first.' }, { status: 401 });
  }

  const form = await req.formData();
  const company = String(form.get('company') ?? '').trim();
  const role = String(form.get('role') ?? '').trim();
  const description = String(form.get('description') ?? '').trim();

  if (!company || !role || description.length < 80) {
    return Response.json(
      { error: 'Company, role, and the full posting are all needed.' },
      { status: 400 },
    );
  }

  await ensureSchema();
  const id = randomUUID();
  await sql()`
    INSERT INTO jobs (id, sid, company, role, description)
    VALUES (${id}, ${sid}, ${company}, ${role}, ${description})`;

  return new Response(null, { status: 303, headers: { location: new URL('/jobs', req.url).toString() } });
}
