import { currentUser } from '@/lib/auth';
import { ensureSchema, sql } from '@/lib/db';
import { SITE_NAME } from '@/lib/site';

export const runtime = 'nodejs';

/**
 * Everything stored about the signed-in person, as one JSON file: the right of
 * access and portability. Password hashes and session tokens are left out —
 * they are credentials, not data about the person.
 */
export async function GET() {
  const user = await currentUser();
  if (!user) return Response.json({ error: 'Sign in first.' }, { status: 401 });

  await ensureSchema();
  const q = sql();
  const sid = user.id;
  const [account, signIns, sessions, profile, resumes, jobs, letters, answers] = await Promise.all([
    q`SELECT id, name, email, "emailVerified", image, "createdAt", "updatedAt" FROM "user" WHERE id = ${sid}`,
    q`SELECT "providerId", "createdAt" FROM account WHERE "userId" = ${sid}`,
    q`SELECT "createdAt", "expiresAt", "ipAddress", "userAgent" FROM session WHERE "userId" = ${sid}`,
    q`SELECT * FROM profiles WHERE sid = ${sid}`,
    q`SELECT * FROM resumes WHERE sid = ${sid} ORDER BY created_at`,
    q`SELECT * FROM jobs WHERE sid = ${sid} ORDER BY created_at`,
    q`SELECT * FROM letters WHERE sid = ${sid} ORDER BY created_at`,
    q`SELECT * FROM skill_answers WHERE sid = ${sid}`,
  ]);

  const body = JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      service: SITE_NAME,
      account: account[0] ?? null,
      signInMethods: signIns,
      sessions,
      profile: profile[0] ?? null,
      resumes,
      jobs,
      letters,
      skillAnswers: answers,
    },
    null,
    2,
  );

  return new Response(body, {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'content-disposition': `attachment; filename="my-data-${new Date().toISOString().slice(0, 10)}.json"`,
      'cache-control': 'no-store',
    },
  });
}
