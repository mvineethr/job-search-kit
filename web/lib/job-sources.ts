/**
 * Job listings straight from a company's own hiring system. Greenhouse, Lever and
 * Ashby each publish a free, keyless JSON feed of a company's open jobs, meant to be
 * shown on other sites. Each feed is per company, so the person follows a company by
 * pasting its careers page link; nothing here crawls or guesses companies.
 *
 * No LinkedIn, Indeed or Workday: none offers a feed, and their terms forbid scraping
 * (see reviews/2026-11-11-job-sources-and-auto-apply.md in the project files).
 */

export type Ats = 'greenhouse' | 'lever' | 'ashby';
export type Board = { ats: Ats; token: string };

export type Posting = {
  externalId: string;
  title: string;
  location: string;
  url: string;
  description: string; // plain text
  postedAt: string | null; // ISO
};

const HOSTS: { ats: Ats; re: RegExp }[] = [
  // boards.greenhouse.io/acme, job-boards.greenhouse.io/acme, …/embed/job_board?for=acme
  { ats: 'greenhouse', re: /^(?:job-boards|boards)(?:\.eu)?\.greenhouse\.io$/ },
  { ats: 'lever', re: /^jobs(?:\.eu)?\.lever\.co$/ },
  { ats: 'ashby', re: /^jobs\.ashbyhq\.com$/ },
];

/** A careers page link → which hiring system and the company's board name, or null. */
export function parseBoardUrl(input: string): Board | null {
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(input.trim()) ? input.trim() : `https://${input.trim()}`);
  } catch {
    return null;
  }
  const host = HOSTS.find((h) => h.re.test(url.hostname.toLowerCase()));
  if (!host) return null;
  const first = url.pathname.split('/').filter(Boolean)[0] ?? '';
  const token = host.ats === 'greenhouse' && first === 'embed' ? (url.searchParams.get('for') ?? '') : first;
  // Board names are slugs; anything else would end up in a feed URL.
  if (!/^[A-Za-z0-9][\w.-]{0,99}$/.test(token)) return null;
  return { ats: host.ats, token: host.ats === 'ashby' ? token : token.toLowerCase() };
}

/** Where the board's feed lives. The token is a checked slug, still encoded to be safe. */
export function feedUrl({ ats, token }: Board): string {
  const t = encodeURIComponent(token);
  if (ats === 'greenhouse') return `https://boards-api.greenhouse.io/v1/boards/${t}/jobs?content=true`;
  if (ats === 'lever') return `https://api.lever.co/v0/postings/${t}?mode=json`;
  return `https://api.ashbyhq.com/posting-api/job-board/${t}`;
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" };

function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e: string) => {
    if (e[0] === '#') {
      const n = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

/** HTML → readable plain text: block tags become line breaks, list items get a dash. */
export function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
      .replace(/<li[^>]*>/gi, '\n- ')
      .replace(/<(br|\/p|\/div|\/h\d|\/ul|\/ol|\/tr)[^>]*>/gi, '\n')
      .replace(/<[^>]+>/g, ''),
  )
    .replace(/[ \t ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const str = (v: unknown) => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '');
const iso = (v: unknown) => {
  const d = typeof v === 'number' || typeof v === 'string' ? new Date(v) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toISOString() : null;
};

/** One feed's JSON → postings. Items without an id, title or link are skipped. */
export function readFeed(ats: Ats, data: unknown): Posting[] {
  const items: unknown[] =
    ats === 'lever' ? (Array.isArray(data) ? data : []) : ((data as { jobs?: unknown[] } | null)?.jobs ?? []);
  const out: Posting[] = [];
  for (const raw of Array.isArray(items) ? items : []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- untrusted JSON; every field goes through str()/iso()
    const j = (raw ?? {}) as Record<string, any>;
    let p: Posting;
    if (ats === 'greenhouse') {
      // Greenhouse's content is HTML with its entities escaped once more.
      p = {
        externalId: str(j.id),
        title: str(j.title),
        location: str(j.location?.name).trim(),
        url: str(j.absolute_url),
        description: htmlToText(decodeEntities(str(j.content))),
        postedAt: iso(j.first_published ?? j.updated_at),
      };
    } else if (ats === 'lever') {
      const lists = Array.isArray(j.lists)
        ? j.lists.map((l: { text?: unknown; content?: unknown } | null) => `${str(l?.text)}\n${htmlToText(str(l?.content))}`).join('\n\n')
        : '';
      p = {
        externalId: str(j.id),
        title: str(j.text),
        location: str(j.categories?.location),
        url: str(j.hostedUrl),
        description: [str(j.descriptionPlain) || htmlToText(str(j.description)), lists, str(j.additionalPlain)]
          .filter((s) => s.trim())
          .join('\n\n')
          .trim(),
        postedAt: iso(j.createdAt),
      };
    } else {
      if (j.isListed === false) continue;
      p = {
        externalId: str(j.id),
        title: str(j.title),
        location: str(j.location),
        url: str(j.jobUrl),
        description: str(j.descriptionPlain).trim() || htmlToText(str(j.descriptionHtml)),
        postedAt: iso(j.publishedAt),
      };
    }
    if (p.externalId && p.title && /^https:\/\//.test(p.url)) out.push(p);
  }
  return out;
}

/** Fetches one board. Throws with a plain message the follow form can show. */
export async function fetchBoard(board: Board, fetchImpl: typeof fetch = fetch): Promise<Posting[]> {
  let res: Response;
  try {
    res = await fetchImpl(feedUrl(board), {
      headers: { accept: 'application/json', 'user-agent': 'job-search-kit (job list for one person)' },
      signal: AbortSignal.timeout(15_000),
      cache: 'no-store',
    });
  } catch {
    throw new Error('Could not reach that careers page. Try again in a minute.');
  }
  if (res.status === 404) throw new Error('That careers page has no public job list. Check the link.');
  if (!res.ok) throw new Error(`The careers page answered ${res.status}. Try again later.`);
  return readFeed(board.ats, await res.json());
}

/** A readable company name from the board name, until the person renames it. */
export function nameFromToken(token: string): string {
  return token.replace(/[-_.]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
