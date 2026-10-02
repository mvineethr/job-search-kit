import { requireSid } from '@/lib/auth';
import { saveMaster } from '@/lib/save-master';

export const runtime = 'nodejs';
// Fluid Compute gives Hobby up to 300s. Tailoring measured at ~51s on kimi-k3;
// 180 leaves headroom for long résumés while still stopping a runaway request.
export const maxDuration = 180;

/** Saves a pasted or uploaded résumé as a master. */
export async function POST(req: Request) {
  let sid: string;
  try {
    sid = await requireSid();
  } catch {
    return Response.json({ error: 'Sign in first.' }, { status: 401 });
  }

  const form = await req.formData();
  const text = String(form.get('text') ?? '').trim();
  const title = String(form.get('title') ?? '').trim() || 'My résumé';

  if (text.length < 80) {
    return Response.json({ error: 'That looks too short to be a résumé.' }, { status: 400 });
  }

  const { id } = await saveMaster(sid, text, title);
  return new Response(null, { status: 303, headers: { location: new URL(`/resume/${id}`, req.url).toString() } });
}
