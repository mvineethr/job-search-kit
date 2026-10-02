import { requireSid } from '@/lib/auth';
import { saveAbout, YEARS, SEARCH_STATUS } from '@/lib/profile';
import { redirectTo } from '@/lib/redirect';

export const runtime = 'nodejs';

/** Free text is trimmed and capped; the two choice fields only accept their listed values. */
function text(form: FormData, key: string): string | null {
  const v = String(form.get(key) ?? '').trim().slice(0, 200);
  return v || null;
}

function choice(form: FormData, key: string, allowed: readonly string[]): string | null {
  const v = String(form.get(key) ?? '');
  return allowed.includes(v) ? v : null;
}

export async function POST(req: Request) {
  let sid: string;
  try {
    sid = await requireSid();
  } catch {
    return redirectTo(req, '/login');
  }

  const form = await req.formData();
  await saveAbout(sid, {
    target_role: text(form, 'target_role'),
    years_experience: choice(form, 'years_experience', YEARS),
    location: text(form, 'location'),
    search_status: choice(form, 'search_status', SEARCH_STATUS),
    heard_from: text(form, 'heard_from'),
  });
  return redirectTo(req, '/start?saved=1');
}
