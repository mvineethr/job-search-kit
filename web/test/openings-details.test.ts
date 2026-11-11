import { describe, expect, it } from 'vitest';
import { payFromText, readFeed } from '@/lib/job-sources';
import { inPlace, placeChoices } from '@/lib/pool';
import { searchProfileMessage } from '@/lib/search-profile';

describe('pay from the feeds', () => {
  it('reads Greenhouse pay ranges in cents', () => {
    const [p] = readFeed('greenhouse', {
      jobs: [{ id: 1, title: 'Engineer', absolute_url: 'https://x.io/1', content: '', pay_input_ranges: [{ min_cents: 12000000, max_cents: 15000000, currency_type: 'USD', title: 'US' }] }],
    });
    expect(p.pay).toBe('$120,000 – $150,000');
  });
  it('reads Lever salary ranges with their interval', () => {
    const [p] = readFeed('lever', [
      { id: 'a', text: 'Engineer', hostedUrl: 'https://x.io/a', salaryRange: { min: 50, max: 60, currency: 'USD', interval: 'per-hour-wage' } },
    ]);
    expect(p.pay).toBe('$50 – $60 per hour');
  });
  it('reads Ashby compensation unless the employer hides it', () => {
    const job = { id: 'b', title: 'Engineer', jobUrl: 'https://x.io/b', compensation: { scrapeableCompensationSalarySummary: '$189K - $330K' } };
    expect(readFeed('ashby', { jobs: [job] })[0].pay).toBe('$189K - $330K');
    expect(readFeed('ashby', { jobs: [{ ...job, shouldDisplayCompensationOnJobPostings: false }] })[0].pay).toBe('');
  });
  it('quotes a range from the description, and invents nothing when there is none', () => {
    expect(payFromText('The base pay range is $95k–$120k plus equity.')).toBe('$95k–$120k');
    expect(payFromText('Competitive pay and benefits.')).toBe('');
  });
});

describe('location filters', () => {
  it('keeps "City, ST" together and splits lists', () => {
    expect(placeChoices('Austin, TX', 'Denver, Seattle; New York, NY')).toEqual(['Remote', 'Austin, TX', 'Denver', 'Seattle', 'New York, NY']);
    expect(placeChoices(null, null)).toEqual(['Remote']);
  });
  it('matches remote and cities', () => {
    expect(inPlace('Remote - US', 'Remote')).toBe(true);
    expect(inPlace('Austin, Texas', 'Austin, TX')).toBe(true);
    expect(inPlace('San Francisco, CA', 'Austin, TX')).toBe(false);
  });
});

describe('search profile message', () => {
  it('includes skill answers and LinkedIn text so nothing is asked twice', () => {
    const m = searchProfileMessage('{}', null, [{ skill: 'Kafka', level: 'solid', detail: 'ran it at work' }], 'Headline: Data engineer');
    expect(m).toContain('- Kafka: solid (ran it at work)');
    expect(m).toContain('MY LINKEDIN:\nHeadline: Data engineer');
  });
});

import { workingKnowledge } from '@/lib/answers';
import { renderResumeBody as renderResume } from '@/lib/render-resume';

describe('working knowledge', () => {
  const answers = [
    { skill: 'Azure', level: 'some' as const, detail: '' },
    { skill: 'GCP', level: 'none' as const, detail: '' },
    { skill: 'Terraform', level: 'some' as const, detail: '' },
    { skill: 'Kafka', level: 'solid' as const, detail: '' },
  ];
  it('lists only "tried it" skills the posting names', () => {
    expect(workingKnowledge(answers, 'Experience with Azure, GCP and Kafka', ['AWS'])).toEqual(['Azure']);
  });
  it('renders under its own label, never inside Skills', () => {
    const html = renderResume({
      name: 'Test Person',
      contact: {},
      summary: '',
      skills: ['AWS'],
      workingKnowledge: ['Azure'],
      experience: [{ title: 'Engineer', company: 'Acme', start: '2020', end: 'Present', bullets: ['Ran things'] }],
      education: [],
    });
    expect(html).toContain('<p>AWS</p>');
    expect(html).toContain('<p>Working knowledge: Azure</p>');
  });
});
