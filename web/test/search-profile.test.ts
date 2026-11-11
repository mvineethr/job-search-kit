import { describe, it, expect } from 'vitest';
import { FIELDS, INDUSTRIES, SENIORITIES, parseSearchProfileForm, verifySearchProfile, wantedRoles, type SearchProfile } from '@/lib/search-profile';
import { STARTER_COMPANIES, suggestCompanies } from '@/lib/starter-companies';
import { parseBoardUrl } from '@/lib/job-sources';
import { loadPrompt } from '@/lib/prompts';

const source = 'built payment apis in go and postgresql. ran kafka pipelines.';

describe('verifySearchProfile', () => {
  it('keeps listed fields, industries and levels, and only skills written on the résumé', () => {
    const sp = verifySearchProfile(
      {
        summary: 'Backend engineer in payments.',
        roles: ['Backend Engineer', 'backend engineer', ' Software Engineer '],
        nearby_roles: ['Platform Engineer', 'Software Engineer'],
        fields: ['Software engineering', 'Rocket science'],
        industries: ['Fintech', 'Crypto'],
        seniority: 'Senior',
        skills: ['Go', 'PostgreSQL', 'Kubernetes', 'Kafka'],
      },
      source,
    )!;
    expect(sp.roles).toEqual(['Backend Engineer', 'Software Engineer']);
    expect(sp.nearby_roles).toEqual(['Platform Engineer']);
    expect(sp.fields).toEqual(['Software engineering']);
    expect(sp.industries).toEqual(['Fintech']);
    expect(sp.seniority).toBe('Senior');
    expect(sp.skills).toEqual(['Go', 'PostgreSQL', 'Kafka']);
    expect(sp.edited).toBe(false);
  });

  it('rejects answers with no roles or the wrong shape, and drops unknown levels', () => {
    expect(verifySearchProfile({ roles: [] }, source)).toBeNull();
    expect(verifySearchProfile('nope', source)).toBeNull();
    expect(verifySearchProfile({ roles: ['Analyst'], seniority: 'Wizard' }, source)!.seniority).toBe('');
  });
});

describe('parseSearchProfileForm', () => {
  it('takes the person’s words, caps lists, and accepts only listed choices', () => {
    const f = new FormData();
    f.set('roles', 'Data Analyst, Product Analyst,\nBI Analyst, a, b, c');
    f.set('nearby_roles', '');
    f.append('fields', 'Data and analytics');
    f.append('fields', 'Made up');
    f.append('industries', 'Healthcare');
    f.set('seniority', 'Mid level');
    f.set('skills', 'SQL, Tableau');
    const sp = parseSearchProfileForm(f, null);
    expect(sp.roles).toEqual(['Data Analyst', 'Product Analyst', 'BI Analyst', 'a', 'b']);
    expect(sp.nearby_roles).toEqual([]);
    expect(sp.fields).toEqual(['Data and analytics']);
    expect(sp.industries).toEqual(['Healthcare']);
    expect(sp.skills).toEqual(['SQL', 'Tableau']);
    expect(sp.edited).toBe(true);
  });
});

describe('wantedRoles', () => {
  it('joins what they typed with the profile’s roles and nearby roles, without repeats', () => {
    const sp = { roles: ['Data Analyst'], nearby_roles: ['Product Analyst'] } as SearchProfile;
    expect(
      wantedRoles(sp, { target_role: 'data analyst', preferences: { target_roles: ['BI Analyst'] } as never }),
    ).toEqual(['data analyst', 'BI Analyst', 'Product Analyst']);
    expect(wantedRoles(null, null)).toEqual([]);
  });
});

describe('starter companies', () => {
  it('every link is a board the follow route accepts, with no repeats', () => {
    const keys = STARTER_COMPANIES.map((c) => parseBoardUrl(c.url));
    expect(keys.every(Boolean)).toBe(true);
    expect(new Set(keys.map((k) => `${k!.ats}/${k!.token}`)).size).toBe(STARTER_COMPANIES.length);
  });

  it('suggests the person’s industries first and leaves out companies already followed', () => {
    const { forYou, more } = suggestCompanies(['Healthcare'], [{ ats: 'greenhouse', token: 'oscar' }], parseBoardUrl);
    expect(forYou.map((c) => c.name)).toEqual(['Flatiron Health']);
    expect(more.some((c) => c.name === 'Oscar Health')).toBe(false);
    expect(forYou.length + more.length).toBe(STARTER_COMPANIES.length - 1);
  });
});

describe('search-profile prompt', () => {
  it('loads, and lists the same fields and industries the code accepts', () => {
    const p = loadPrompt('search-profile');
    expect(p).toContain('Never invent experience');
    expect(p).toContain(FIELDS.join(', '));
    expect(p).toContain(INDUSTRIES.join(', '));
    expect(p).toContain(SENIORITIES.join(', '));
  });
});
