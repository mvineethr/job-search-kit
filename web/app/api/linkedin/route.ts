import { randomUUID } from 'node:crypto';
import { requireSid } from '@/lib/auth';
import { sql } from '@/lib/db';
import { loadPrompt } from '@/lib/prompts';
import { completeText } from '@/lib/provider';
import { extractJsonObject } from '@/lib/extract-json';
import { linkedinMessage } from '@/lib/messages';
import { loadMaster } from '@/lib/load-master';
import { getLinkedInText, getProfile, upsertProfile } from '@/lib/profile';
import { LinkedInSchema, verifyLinkedIn, type StoredLinkedIn } from '@/lib/outreach';
import { backWithError, redirectTo } from '@/lib/redirect';

export const runtime = 'nodejs';
export const maxDuration = 180;

const MAX_TEXT = 60_000;

/**
 * Audits the stored LinkedIn text (or new text, which replaces it) against the master résumé
 * and writes paste-back text. Never connects to LinkedIn and never posts.
 */
export async function POST(req: Request) {
  let sid: string;
  try {
    sid = await requireSid();
  } catch {
    return redirectTo(req, '/login');
  }

  const form = await req.formData();
  const fresh = String(form.get('linkedin_text') ?? '').trim().slice(0, MAX_TEXT);
  if (fresh) await upsertProfile(sid, '', fresh);

  const master = await loadMaster(sid);
  if (!master) return backWithError(req, '/linkedin', 'Add a résumé first — the rewrite is checked against it.');

  const q = sql();
  const [profile, linkedinText, saved] = await Promise.all([
    getProfile(sid),
    fresh ? Promise.resolve(fresh) : getLinkedInText(sid),
    q`SELECT role FROM jobs WHERE sid = ${sid} ORDER BY created_at DESC LIMIT 5` as unknown as Promise<{ role: string }[]>,
  ]);

  let reply: string;
  try {
    const out = await completeText({
      system: loadPrompt('linkedin-profile'),
      messages: [
        {
          role: 'user',
          content: linkedinMessage({
            aimingFor: profile?.target_role ?? null,
            savedRoles: saved.map((j) => j.role),
            linkedinText: linkedinText ?? '',
            resumeText: master.text,
          }),
        },
      ],
    });
    reply = out.text;
  } catch (err) {
    console.error('[linkedin] provider failed', err);
    return backWithError(req, '/linkedin', 'The rewrite did not go through. Try again in a moment.');
  }

  const parsed = LinkedInSchema.safeParse(extractJsonObject(reply));
  if (!parsed.success) {
    console.error('[linkedin] schema mismatch:', parsed.error.issues.slice(0, 5).map((i) => `${i.path.join('.')}: ${i.message}`));
    return backWithError(req, '/linkedin', 'The rewrite came back in a shape we could not read. Nothing was saved — try again.');
  }

  const li = linkedinText ?? '';
  const content: StoredLinkedIn = {
    ...verifyLinkedIn(parsed.data, `${master.source}\n${li}`, li),
    fromLinkedIn: Boolean(li),
  };

  const id = randomUUID();
  await q`
    INSERT INTO letters (id, sid, kind, job_id, resume_id, content)
    VALUES (${id}, ${sid}, 'linkedin', NULL, ${master.id}, ${JSON.stringify(content)})`;
  return redirectTo(req, `/linkedin/${id}`);
}
