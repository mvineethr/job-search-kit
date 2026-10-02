import { requireSid } from '@/lib/auth';
import { saveMaster } from '@/lib/save-master';
import { upsertProfile } from '@/lib/profile';
import { backWithError, redirectTo } from '@/lib/redirect';

export const runtime = 'nodejs';
export const maxDuration = 180;

/**
 * Onboarding. The résumé becomes the master when given; otherwise the LinkedIn
 * text does. LinkedIn text is kept on the profile either way, for the LinkedIn
 * feature — it is never merged into the résumé.
 */
export async function POST(req: Request) {
  let sid: string;
  try {
    sid = await requireSid();
  } catch {
    return redirectTo(req, '/login');
  }

  const form = await req.formData();
  const resumeText = String(form.get('resume_text') ?? '').trim();
  const linkedinText = String(form.get('linkedin_text') ?? '').trim();
  const source = resumeText || linkedinText;

  if (source.length < 80) {
    return backWithError(req, '/start', 'Add a résumé or your LinkedIn, or build one from scratch below.');
  }

  const { id, content } = await saveMaster(sid, source, resumeText ? 'My résumé' : 'From LinkedIn');
  await upsertProfile(sid, content?.name ?? '', linkedinText || null);
  return redirectTo(req, `/resume/${id}`);
}
