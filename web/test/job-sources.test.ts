import { describe, it, expect } from 'vitest';
import { feedUrl, fetchBoard, htmlToText, nameFromToken, parseBoardUrl, readFeed } from '@/lib/job-sources';
import { matchesSearch } from '@/lib/pool';

describe('parseBoardUrl', () => {
  it('reads Greenhouse, Lever and Ashby careers links', () => {
    expect(parseBoardUrl('https://boards.greenhouse.io/Northwind/jobs/123')).toEqual({ ats: 'greenhouse', token: 'northwind' });
    expect(parseBoardUrl('job-boards.greenhouse.io/northwind')).toEqual({ ats: 'greenhouse', token: 'northwind' });
    expect(parseBoardUrl('https://boards.greenhouse.io/embed/job_board?for=northwind')).toEqual({ ats: 'greenhouse', token: 'northwind' });
    expect(parseBoardUrl('https://jobs.lever.co/northwind/abc-123/apply')).toEqual({ ats: 'lever', token: 'northwind' });
    expect(parseBoardUrl('https://jobs.eu.lever.co/northwind')).toEqual({ ats: 'lever', token: 'northwind' });
    // Ashby board names are case-sensitive in its feed URL.
    expect(parseBoardUrl('https://jobs.ashbyhq.com/Northwind/0b1c')).toEqual({ ats: 'ashby', token: 'Northwind' });
  });

  it('rejects other sites and odd board names', () => {
    expect(parseBoardUrl('https://www.linkedin.com/jobs/view/1')).toBeNull();
    expect(parseBoardUrl('https://evil.example/boards.greenhouse.io/acme')).toBeNull();
    expect(parseBoardUrl('https://greenhouse.io.evil.example/acme')).toBeNull();
    expect(parseBoardUrl('https://jobs.lever.co/')).toBeNull();
    expect(parseBoardUrl('https://jobs.lever.co/%2e%2e')).toBeNull();
    expect(parseBoardUrl('not a url at all')).toBeNull();
  });

  it('builds the feed URL for each', () => {
    expect(feedUrl({ ats: 'greenhouse', token: 'acme' })).toBe('https://boards-api.greenhouse.io/v1/boards/acme/jobs?content=true');
    expect(feedUrl({ ats: 'lever', token: 'acme' })).toBe('https://api.lever.co/v0/postings/acme?mode=json');
    expect(feedUrl({ ats: 'ashby', token: 'Acme' })).toBe('https://api.ashbyhq.com/posting-api/job-board/Acme');
  });
});

describe('htmlToText', () => {
  it('keeps line breaks and list items, drops tags and decodes entities', () => {
    expect(htmlToText('<p>We&#39;re hiring &amp; growing.</p><ul><li>Go</li><li>SQL</li></ul><script>x()</script>')).toBe(
      "We're hiring & growing.\n\n- Go\n- SQL",
    );
  });
});

describe('readFeed', () => {
  it('reads Greenhouse, whose HTML is escaped twice', () => {
    const [p] = readFeed('greenhouse', {
      jobs: [
        {
          id: 7995153,
          title: 'Platform Engineer',
          location: { name: 'Berlin, Germany ' },
          absolute_url: 'https://boards.greenhouse.io/acme/jobs/7995153',
          content: '&lt;p&gt;Build &amp;amp; run things.&lt;/p&gt;',
          first_published: '2026-06-10T08:50:56-04:00',
        },
      ],
    });
    expect(p).toEqual({
      externalId: '7995153',
      title: 'Platform Engineer',
      location: 'Berlin, Germany',
      url: 'https://boards.greenhouse.io/acme/jobs/7995153',
      description: 'Build & run things.',
      postedAt: '2026-06-10T12:50:56.000Z',
    });
  });

  it('reads Lever, joining the description and its lists', () => {
    const [p] = readFeed('lever', [
      {
        id: 'abc',
        text: 'Data Analyst',
        categories: { location: 'Remote' },
        hostedUrl: 'https://jobs.lever.co/acme/abc',
        createdAt: 1767225600000,
        descriptionPlain: 'About the role.',
        lists: [{ text: 'Requirements', content: '<li>SQL</li><li>Python</li>' }],
        additionalPlain: '',
      },
    ]);
    expect(p.description).toBe('About the role.\n\nRequirements\n- SQL\n- Python');
    expect(p.postedAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('reads Ashby and skips unlisted jobs', () => {
    const jobs = readFeed('ashby', {
      jobs: [
        { id: 'u1', title: 'Designer', location: 'NYC', jobUrl: 'https://jobs.ashbyhq.com/acme/u1', descriptionPlain: 'Design.', publishedAt: '2026-03-04T14:29:08.532+00:00' },
        { id: 'u2', title: 'Hidden', isListed: false, jobUrl: 'https://jobs.ashbyhq.com/acme/u2' },
      ],
    });
    expect(jobs.map((j) => j.title)).toEqual(['Designer']);
  });

  it('drops items without an id, a title or an https link, and survives junk', () => {
    expect(readFeed('lever', [{ id: 'a', text: 'X', hostedUrl: 'javascript:alert(1)' }, null, { text: 'No id' }])).toEqual([]);
    expect(readFeed('greenhouse', null)).toEqual([]);
    expect(readFeed('lever', { jobs: [] })).toEqual([]);
  });
});

describe('fetchBoard', () => {
  it('gives a plain message for a board that does not exist', async () => {
    const fake = (async () => new Response('{}', { status: 404 })) as unknown as typeof fetch;
    await expect(fetchBoard({ ats: 'lever', token: 'nope' }, fake)).rejects.toThrow(/no public job list/);
  });
});

describe('helpers', () => {
  it('names a company from its board name and searches every word', () => {
    expect(nameFromToken('northwind-systems')).toBe('Northwind Systems');
    expect(matchesSearch({ title: 'Senior Data Engineer', location: 'Austin, TX' }, 'data austin')).toBe(true);
    expect(matchesSearch({ title: 'Senior Data Engineer', location: 'Austin, TX' }, 'data remote')).toBe(false);
    expect(matchesSearch({ title: 'Anything', location: '' }, '  ')).toBe(true);
  });
});
