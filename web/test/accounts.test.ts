import { describe, it, expect } from 'vitest';
import { isAdmin } from '@/lib/admin';
import { emailConfigured } from '@/lib/email';

describe('isAdmin', () => {
  it('matches listed emails, ignoring case and spaces', () => {
    expect(isAdmin('Me@Example.com', ' me@example.com , other@example.com')).toBe(true);
    expect(isAdmin('other@example.com', 'me@example.com,other@example.com')).toBe(true);
  });

  it('lets nobody in when the list is empty or the email is missing', () => {
    expect(isAdmin('me@example.com', '')).toBe(false);
    expect(isAdmin('me@example.com', ' , ')).toBe(false);
    expect(isAdmin(null, 'me@example.com')).toBe(false);
    expect(isAdmin('', 'me@example.com')).toBe(false);
  });

  it('does not match on a substring', () => {
    expect(isAdmin('e@example.com', 'me@example.com')).toBe(false);
  });
});

describe('emailConfigured', () => {
  // A key alone cannot mail anyone but the Resend account owner, so both are required.
  it('needs both a key and a sender', () => {
    expect(emailConfigured({ RESEND_API_KEY: 'k', EMAIL_FROM: 'a <a@b.c>' })).toBe(true);
    expect(emailConfigured({ RESEND_API_KEY: 'k', EMAIL_FROM: '' })).toBe(false);
    expect(emailConfigured({ EMAIL_FROM: 'a <a@b.c>' })).toBe(false);
    expect(emailConfigured({ RESEND_API_KEY: '  ', EMAIL_FROM: 'x' })).toBe(false);
  });
});
