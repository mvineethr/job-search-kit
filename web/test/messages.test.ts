import { describe, it, expect } from 'vitest';
import { tailorMessage, letterMessage, reviewMessage, matchMessage } from '@/lib/messages';
import { matchMessage as fromRunMatch } from '@/lib/run-match';

describe('message builders', () => {
  it('tailor: résumé, job, then answers, in the route format', () => {
    expect(tailorMessage('R', 'Acme — SRE', 'D', '\nA')).toBe('MY RESUME:\nR\n\nTHE JOB (Acme — SRE):\nD\nA');
    expect(tailorMessage('R', 'Acme — SRE', 'D')).toBe('MY RESUME:\nR\n\nTHE JOB (Acme — SRE):\nD');
  });
  it('letter: résumé then job', () => {
    expect(letterMessage('R', 'Acme — SRE', 'D')).toBe('MY RESUME:\nR\n\nTHE JOB (Acme — SRE):\nD');
  });
  it('review: the pasted text as is', () => {
    expect(reviewMessage('plain text')).toBe('plain text');
  });
  it('match: TODAY line first, and still exported from run-match', () => {
    const d = new Date('2026-10-16T12:00:00Z');
    expect(matchMessage('R', 'Acme — SRE', 'D', d)).toBe('TODAY: Oct 2026\n\nMY RESUME:\nR\n\nTHE JOB (Acme — SRE):\nD');
    expect(fromRunMatch).toBe(matchMessage);
  });
});
