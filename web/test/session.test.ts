import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { newCookieValue, readSid, passwordMatches } from '@/lib/session';

describe('session cookie', () => {
  beforeEach(() => vi.stubEnv('APP_PASSWORD', 'friends-only-2026'));
  afterEach(() => vi.unstubAllEnvs());

  it('round-trips a session id', () => {
    const cookie = newCookieValue();
    expect(readSid(cookie)).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('gives each visitor a different id', () => {
    expect(readSid(newCookieValue())).not.toBe(readSid(newCookieValue()));
  });

  it('rejects a tampered session id — you cannot read someone else\'s data', () => {
    const cookie = newCookieValue();
    const [, sig] = cookie.split('.');
    expect(readSid(`00000000-0000-4000-8000-000000000000.${sig}`)).toBeNull();
  });

  it('rejects a forged signature', () => {
    const cookie = newCookieValue();
    const [sid] = cookie.split('.');
    expect(readSid(`${sid}.not-a-real-signature`)).toBeNull();
  });

  it('rejects junk and empty cookies', () => {
    expect(readSid(undefined)).toBeNull();
    expect(readSid('')).toBeNull();
    expect(readSid('nodot')).toBeNull();
    expect(readSid('.onlysig')).toBeNull();
  });

  it('stops validating cookies if the password changes', () => {
    const cookie = newCookieValue();
    vi.stubEnv('APP_PASSWORD', 'rotated');
    expect(readSid(cookie)).toBeNull();
  });
});

describe('passwordMatches', () => {
  beforeEach(() => vi.stubEnv('APP_PASSWORD', 'friends-only-2026'));
  afterEach(() => vi.unstubAllEnvs());

  it('accepts the right password', () => {
    expect(passwordMatches('friends-only-2026')).toBe(true);
  });

  it('rejects a wrong password', () => {
    expect(passwordMatches('nope')).toBe(false);
  });

  it('rejects a prefix of the right password', () => {
    expect(passwordMatches('friends-only')).toBe(false);
  });

  it('rejects everything when no password is configured', () => {
    vi.stubEnv('APP_PASSWORD', '');
    expect(passwordMatches('')).toBe(false);
    expect(passwordMatches('anything')).toBe(false);
  });
});
