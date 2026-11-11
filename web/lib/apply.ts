import type { Ats } from './job-sources';

/**
 * The apply step for jobs saved from a followed company.
 *
 * The rule (owner, 2026-11-11): the app may submit an application by itself only
 * where that crosses no legal or ethical line; anything that needs a person stops
 * and waits in their notifications. Today no such channel exists: Greenhouse's and
 * Lever's submit APIs need the employer's own key, and their hosted forms use
 * captchas that only a disguised bot gets past. So every job waits for the person,
 * with everything the app can prepare already prepared.
 */
export function botSubmitChannel(): null {
  // shortcut: no permitted channel yet; return one here (e.g. an employer-granted key) and gate it on consent.
  return null;
}

export type FormQuestion = {
  label: string;
  required: boolean;
  /** 'kit': the app has it ready (name, contact, résumé, letter). 'you': only the person can answer it. */
  who: 'kit' | 'you';
};

// Greenhouse's standard field names. Everything else is the employer's own question.
const KIT_FIELDS = new Set([
  'first_name',
  'last_name',
  'preferred_name',
  'email',
  'phone',
  'resume',
  'resume_text',
  'cover_letter',
  'cover_letter_text',
]);

/**
 * Greenhouse's application form (`?questions=true`) → questions, sorted into what
 * the kit covers and what only the person can answer. Work authorization, sponsorship,
 * pay, "years of X" and demographic questions are always the person's: a wrong
 * answer there is a false statement made in their name.
 */
export function readGreenhouseForm(data: unknown): FormQuestion[] {
  const d = (data ?? {}) as { questions?: unknown; location_questions?: unknown; compliance?: unknown };
  const out: FormQuestion[] = [];
  const add = (raw: unknown, forceYou = false) => {
    const q = (raw ?? {}) as { label?: unknown; required?: unknown; fields?: unknown; description?: unknown };
    const label = typeof q.label === 'string' ? q.label.trim() : '';
    if (!label) return;
    const names = Array.isArray(q.fields)
      ? q.fields.map((f) => String((f as { name?: unknown })?.name ?? ''))
      : [];
    const kit = !forceYou && names.length > 0 && names.every((n) => KIT_FIELDS.has(n));
    out.push({ label, required: q.required === true, who: kit ? 'kit' : 'you' });
  };
  for (const q of Array.isArray(d.questions) ? d.questions : []) add(q);
  for (const q of Array.isArray(d.location_questions) ? d.location_questions : []) add(q, true);
  for (const c of Array.isArray(d.compliance) ? d.compliance : []) {
    const qs = (c as { questions?: unknown })?.questions;
    for (const q of Array.isArray(qs) ? qs : []) add(q, true);
  }
  return out;
}

/** Where the form lives, when the app can read it. Lever and Ashby publish no form feed. */
export function formUrl(ats: Ats, token: string, externalId: string): string | null {
  if (ats !== 'greenhouse') return null;
  return `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(token)}/jobs/${encodeURIComponent(externalId)}?questions=true`;
}

/** Best effort: null when the form can't be read, and the apply card says to check the page. */
export async function fetchForm(
  ats: Ats,
  token: string,
  externalId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<FormQuestion[] | null> {
  const url = formUrl(ats, token, externalId);
  if (!url) return null;
  try {
    const res = await fetchImpl(url, {
      headers: { accept: 'application/json', 'user-agent': 'job-search-kit (job list for one person)' },
      signal: AbortSignal.timeout(15_000),
      cache: 'no-store',
    });
    return res.ok ? readGreenhouseForm(await res.json()) : null;
  } catch {
    return null;
  }
}

/** Words of a role the person wants, all found in a posting title: "data engineer" matches "Senior Data Engineer". */
export function wantedTitle(title: string, roles: string[]): boolean {
  const t = title.toLowerCase();
  return roles.some((r) => {
    const words = r.toLowerCase().split(/[^a-z0-9+#]+/).filter((w) => w.length > 1);
    return words.length > 0 && words.every((w) => t.includes(w));
  });
}
