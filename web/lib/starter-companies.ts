import type { INDUSTRIES } from './search-profile';

type Industry = (typeof INDUSTRIES)[number];

/**
 * Companies people can follow with one click. Each careers link was checked live on
 * 2026-11-11 and answered with open jobs. Following still goes through the normal
 * follow route, so a board that has since moved shows the usual error.
 */
// shortcut: a small, tech-heavy hand list; grow it from the boards people follow, or replace it with role search.
export const STARTER_COMPANIES: { name: string; url: string; industries: Industry[] }[] = [
  { name: 'OpenAI', url: 'https://jobs.ashbyhq.com/openai', industries: ['AI and data'] },
  { name: 'Palantir', url: 'https://jobs.lever.co/palantir', industries: ['AI and data', 'Software and infrastructure'] },
  { name: 'Datadog', url: 'https://boards.greenhouse.io/datadog', industries: ['Software and infrastructure'] },
  { name: 'Cloudflare', url: 'https://boards.greenhouse.io/cloudflare', industries: ['Software and infrastructure'] },
  { name: 'GitLab', url: 'https://boards.greenhouse.io/gitlab', industries: ['Software and infrastructure'] },
  { name: 'MongoDB', url: 'https://boards.greenhouse.io/mongodb', industries: ['Software and infrastructure', 'AI and data'] },
  { name: 'Figma', url: 'https://boards.greenhouse.io/figma', industries: ['Business software'] },
  { name: 'Notion', url: 'https://jobs.ashbyhq.com/notion', industries: ['Business software'] },
  { name: 'Ashby', url: 'https://jobs.ashbyhq.com/ashby', industries: ['Business software'] },
  { name: 'Squarespace', url: 'https://boards.greenhouse.io/squarespace', industries: ['Business software', 'Consumer and media'] },
  { name: 'Stripe', url: 'https://boards.greenhouse.io/stripe', industries: ['Fintech'] },
  { name: 'Coinbase', url: 'https://boards.greenhouse.io/coinbase', industries: ['Fintech'] },
  { name: 'Robinhood', url: 'https://boards.greenhouse.io/robinhood', industries: ['Fintech'] },
  { name: 'Chime', url: 'https://boards.greenhouse.io/chime', industries: ['Fintech'] },
  { name: 'Affirm', url: 'https://boards.greenhouse.io/affirm', industries: ['Fintech'] },
  { name: 'Ramp', url: 'https://jobs.ashbyhq.com/ramp', industries: ['Fintech', 'Business software'] },
  { name: 'Oscar Health', url: 'https://boards.greenhouse.io/oscar', industries: ['Healthcare'] },
  { name: 'Flatiron Health', url: 'https://boards.greenhouse.io/flatironhealth', industries: ['Healthcare', 'AI and data'] },
  { name: 'Duolingo', url: 'https://boards.greenhouse.io/duolingo', industries: ['Education', 'Consumer and media'] },
  { name: 'Khan Academy', url: 'https://boards.greenhouse.io/khanacademy', industries: ['Education'] },
  { name: 'Spotify', url: 'https://jobs.lever.co/spotify', industries: ['Consumer and media'] },
  { name: 'Pinterest', url: 'https://boards.greenhouse.io/pinterest', industries: ['Consumer and media'] },
  { name: 'Reddit', url: 'https://boards.greenhouse.io/reddit', industries: ['Consumer and media'] },
  { name: 'Discord', url: 'https://boards.greenhouse.io/discord', industries: ['Consumer and media'] },
  { name: 'Airbnb', url: 'https://boards.greenhouse.io/airbnb', industries: ['Travel and transport', 'Consumer and media'] },
  { name: 'Lyft', url: 'https://boards.greenhouse.io/lyft', industries: ['Travel and transport'] },
];

/** Not yet followed; the person's industries first, then the rest. */
export function suggestCompanies(industries: string[], followed: { ats: string; token: string }[], parse: (u: string) => { ats: string; token: string } | null) {
  const have = new Set(followed.map((f) => `${f.ats}/${f.token}`));
  const open = STARTER_COMPANIES.filter((c) => {
    const b = parse(c.url);
    return b && !have.has(`${b.ats}/${b.token}`);
  });
  const hit = (c: (typeof open)[number]) => c.industries.some((i) => industries.includes(i));
  return { forYou: open.filter(hit), more: open.filter((c) => !hit(c)) };
}
