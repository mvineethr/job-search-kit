import { describe, it, expect } from 'vitest';
import { botSubmitChannel, fetchForm, formUrl, readGreenhouseForm, wantedTitle } from '@/lib/apply';

describe('botSubmitChannel', () => {
  it('has no permitted way to submit for any site yet', () => {
    expect(botSubmitChannel()).toBeNull();
  });
});

describe('readGreenhouseForm', () => {
  const form = {
    questions: [
      { label: 'First Name', required: true, fields: [{ name: 'first_name', type: 'input_text' }] },
      { label: 'Resume/CV', required: true, fields: [{ name: 'resume', type: 'input_file' }, { name: 'resume_text', type: 'textarea' }] },
      { label: 'LinkedIn Profile', required: false, fields: [{ name: 'question_1', type: 'input_text' }] },
      { label: 'Will you now or in the future require visa sponsorship?', required: true, fields: [{ name: 'question_2', type: 'multi_value_single_select' }] },
      { label: '  ', required: true, fields: [] },
    ],
    location_questions: [{ label: 'Location (City)', required: true, fields: [{ name: 'location' }] }],
    compliance: [{ type: 'eeoc', questions: [{ label: 'Gender', required: false, fields: [{ name: 'gender' }] }] }],
  };

  it('puts standard fields in the kit and everything about the person with them', () => {
    expect(readGreenhouseForm(form)).toEqual([
      { label: 'First Name', required: true, who: 'kit' },
      { label: 'Resume/CV', required: true, who: 'kit' },
      { label: 'LinkedIn Profile', required: false, who: 'you' },
      { label: 'Will you now or in the future require visa sponsorship?', required: true, who: 'you' },
      { label: 'Location (City)', required: true, who: 'you' },
      { label: 'Gender', required: false, who: 'you' },
    ]);
  });

  it('survives junk', () => {
    expect(readGreenhouseForm(null)).toEqual([]);
    expect(readGreenhouseForm({ questions: 'x', compliance: [null] })).toEqual([]);
  });
});

describe('fetchForm', () => {
  it('reads only Greenhouse, and gives null when the form cannot be read', async () => {
    expect(formUrl('lever', 'acme', '1')).toBeNull();
    expect(formUrl('greenhouse', 'acme', '42')).toBe('https://boards-api.greenhouse.io/v1/boards/acme/jobs/42?questions=true');
    const down = (async () => new Response('', { status: 500 })) as unknown as typeof fetch;
    expect(await fetchForm('greenhouse', 'acme', '42', down)).toBeNull();
    const throws = (async () => { throw new Error('offline'); }) as unknown as typeof fetch;
    expect(await fetchForm('greenhouse', 'acme', '42', throws)).toBeNull();
    expect(await fetchForm('ashby', 'acme', '42', throws)).toBeNull();
  });
});

describe('wantedTitle', () => {
  it('needs every word of one wanted role in the title', () => {
    expect(wantedTitle('Senior Data Engineer, Platform', ['data engineer'])).toBe(true);
    expect(wantedTitle('Data Analyst', ['data engineer', 'product manager'])).toBe(false);
    expect(wantedTitle('C++ Developer', ['c++ developer'])).toBe(true);
    expect(wantedTitle('Anything', ['', ' '])).toBe(false);
  });
});
