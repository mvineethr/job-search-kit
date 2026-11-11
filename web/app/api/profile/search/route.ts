import { requireSid } from '@/lib/auth';
import { ensureSchema, sql } from '@/lib/db';
import { buildSearchProfile, parseSearchProfileForm, readSearchProfile, saveSearchProfile } from '@/lib/search-profile';
import { backWithError, redirectTo } from '@/lib/redirect';

export const runtime = 'nodejs';
export const maxDuration = 180; // op=build calls the model

const BACK = '/jobs/openings';

/** `op=build`: the model drafts the search profile from the résumé and profile. `op=save`: the person's edits. */
export async function POST(req: Request) {
  let sid: string;
  try {
    sid = await requireSid();
  } catch {
    return redirectTo(req, '/login');
  }
  const form = await req.formData();
  const op = String(form.get('op') ?? '');
  await ensureSchema();

  if (op === 'build') {
    const sp = await buildSearchProfile(sid);
    if (!sp) {
      return backWithError(req, BACK, 'Could not build your search profile. Add a résumé first, or try again in a minute.');
    }
    return redirectTo(req, `${BACK}?profile=built`);
  }

  if (op === 'save') {
    const rows = (await sql()`SELECT search_profile FROM profiles WHERE sid = ${sid}`) as { search_profile: unknown }[];
    const sp = parseSearchProfileForm(form, readSearchProfile(rows[0]?.search_profile));
    if (sp.roles.length === 0) return backWithError(req, BACK, 'Add at least one role you are looking for.');
    await saveSearchProfile(sid, sp);
    return redirectTo(req, `${BACK}?profile=saved`);
  }

  return backWithError(req, BACK, 'Unknown action.');
}
