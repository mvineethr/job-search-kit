import { describe, it, expect } from 'vitest';
import { consentCookieValue, isExempt, safeNext } from '@/lib/consent';

describe('consentCookieValue', () => {
  it('is stable for a session and version', async () => {
    expect(await consentCookieValue('tok', 'v1')).toBe(await consentCookieValue('tok', 'v1'));
  });

  it('changes with a new session or a new terms version', async () => {
    const base = await consentCookieValue('tok', 'v1');
    expect(await consentCookieValue('other', 'v1')).not.toBe(base);
    expect(await consentCookieValue('tok', 'v2')).not.toBe(base);
  });

  it('does not contain the session token', async () => {
    expect(await consentCookieValue('secret-session-token', 'v1')).not.toContain('secret');
  });
});

describe('isExempt', () => {
  it('lets the legal pages and the agreement through, nothing else', () => {
    for (const p of ['/agree', '/privacy', '/terms', '/help', '/api/consent', '/api/consent/sync', '/api/auth/sign-out']) {
      expect(isExempt(p)).toBe(true);
    }
    for (const p of ['/', '/start', '/jobs', '/api/jobs', '/agreement', '/termsx']) {
      expect(isExempt(p)).toBe(false);
    }
  });
});

describe('safeNext', () => {
  it('keeps same-site paths and rejects anything else', () => {
    expect(safeNext('/jobs/1')).toBe('/jobs/1');
    expect(safeNext('//evil.com')).toBe('/');
    expect(safeNext('https://evil.com')).toBe('/');
    expect(safeNext(null)).toBe('/');
  });
});
