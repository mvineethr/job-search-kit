import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { shouldFallback, pickConfig } from '@/lib/provider';

describe('shouldFallback', () => {
  it('falls back on rate limiting', () => {
    expect(shouldFallback({ status: 429 })).toBe(true);
  });

  it('falls back on server errors', () => {
    expect(shouldFallback({ status: 503 })).toBe(true);
  });

  it('does NOT fall back on a bad request — that is our bug, not theirs', () => {
    expect(shouldFallback({ status: 400 })).toBe(false);
  });

  it('does NOT fall back on a bad key', () => {
    expect(shouldFallback({ status: 401 })).toBe(false);
  });

  it('falls back on a network error with no status', () => {
    expect(shouldFallback({})).toBe(true);
  });
});

describe('pickConfig', () => {
  beforeEach(() => {
    vi.stubEnv('MODEL_PRIMARY_BASE_URL', 'https://primary.example/v1');
    vi.stubEnv('MODEL_PRIMARY_KEY', 'k1');
    vi.stubEnv('MODEL_PRIMARY_NAME', 'model-one');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('reads the primary from the environment', () => {
    const c = pickConfig('primary');
    expect(c?.model).toBe('model-one');
    expect(c?.baseURL).toBe('https://primary.example/v1');
  });

  it('returns null when no fallback is configured, rather than guessing one', () => {
    vi.stubEnv('MODEL_FALLBACK_BASE_URL', '');
    vi.stubEnv('MODEL_FALLBACK_KEY', '');
    vi.stubEnv('MODEL_FALLBACK_NAME', '');
    expect(pickConfig('fallback')).toBeNull();
  });

  it('throws when the primary is unconfigured rather than failing silently at request time', () => {
    vi.stubEnv('MODEL_PRIMARY_KEY', '');
    expect(() => pickConfig('primary')).toThrow();
  });
});
