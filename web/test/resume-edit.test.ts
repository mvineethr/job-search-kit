import { describe, it, expect } from 'vitest';
import { ResumeSchema, type Resume } from '@/lib/resume-schema';
import { parseEdit, clearFlags, moveBullet, isMatchStale, readNote } from '@/lib/resume-edit';

const base: Resume = ResumeSchema.parse({
  name: 'Sam Rivera',
  contact: { email: 'sam@example.com' },
  summary: 'Platform engineer.',
  skills: ['Kubernetes', 'Go'],
  experience: [
    {
      title: 'Senior Engineer',
      company: 'Acme',
      start: 'Mar 2021',
      end: 'Present',
      bullets: ['Cut deploy time by 40%', 'Ran on-call for 12 services', 'Wrote the runbook'],
    },
    { title: 'Engineer', company: 'Globex', start: '2018', end: '2021', bullets: ['Built the billing API'] },
  ],
  education: [{ degree: 'BSc Computer Science', school: 'State University' }],
});

const withBullets = (bullets: string[]): Resume => ({
  ...base,
  experience: [{ ...base.experience[0], bullets }, base.experience[1]],
});

describe('parseEdit', () => {
  it('accepts a valid résumé and trims every string', () => {
    const r = parseEdit({ ...base, name: '  Sam Rivera ' });
    expect(r.ok && r.resume.name).toBe('Sam Rivera');
  });

  it('drops keys the schema does not know', () => {
    const r = parseEdit({ ...base, evil: 'x' });
    expect(r.ok).toBe(true);
    expect(r.ok && 'evil' in r.resume).toBe(false);
  });

  it('names an empty name', () => {
    expect(parseEdit({ ...base, name: '   ' })).toEqual({ ok: false, message: "Name can't be empty." });
  });

  it('names an emptied bullet, and says to delete it instead', () => {
    expect(parseEdit(withBullets(['  ', 'x']))).toEqual({
      ok: false,
      message: "A bullet can't be empty. Delete it instead.",
    });
  });

  it('names a role with no bullets', () => {
    expect(parseEdit(withBullets([]))).toEqual({ ok: false, message: 'A role needs at least one bullet.' });
  });

  it('names a résumé with no roles', () => {
    expect(parseEdit({ ...base, experience: [] })).toEqual({ ok: false, message: 'Keep at least one role.' });
  });

  it('names an empty skill', () => {
    expect(parseEdit({ ...base, skills: ['Go', ''] })).toEqual({
      ok: false,
      message: "A skill can't be empty. Delete it instead.",
    });
  });

  it('gives a general message for anything else, including no content', () => {
    expect(parseEdit(undefined)).toEqual({
      ok: false,
      message: "That change couldn't be saved. Check the field you just edited.",
    });
  });
});

describe('clearFlags', () => {
  const flags = ['40%', '12'];

  it('clears a number once the person has edited the text it is in', () => {
    const after = withBullets(['Cut deploy time by 40% across 3 teams', 'Ran on-call for 12 services', 'Wrote the runbook']);
    expect(clearFlags(base, after, flags)).toEqual(['12']);
  });

  it('clears a number that is no longer anywhere in the document', () => {
    const after = withBullets(['Cut deploy time', 'Ran on-call for 12 services', 'Wrote the runbook']);
    expect(clearFlags(base, after, flags)).toEqual(['12']);
  });

  it('keeps flags when nothing they are in was edited, e.g. a reorder', () => {
    expect(clearFlags(base, moveBullet(base, 0, 0, 2), flags)).toEqual(flags);
  });

  it('never adds a flag for a number the person typed', () => {
    const after = withBullets([...base.experience[0].bullets, 'Saved 99 hours a month']);
    expect(clearFlags(base, after, [])).toEqual([]);
  });

  it('matches whole numbers only: "4" is not kept alive by "40%"', () => {
    expect(clearFlags(base, base, ['4'])).toEqual([]);
  });
});

describe('moveBullet', () => {
  it('moves a bullet down and up within its role', () => {
    expect(moveBullet(base, 0, 0, 1).experience[0].bullets).toEqual([
      'Ran on-call for 12 services',
      'Cut deploy time by 40%',
      'Wrote the runbook',
    ]);
    expect(moveBullet(base, 0, 2, 1).experience[0].bullets[1]).toBe('Wrote the runbook');
  });

  it('leaves other roles alone', () => {
    expect(moveBullet(base, 0, 0, 1).experience[1]).toBe(base.experience[1]);
  });

  it('returns the same résumé for out-of-range moves', () => {
    expect(moveBullet(base, 0, 0, -1)).toBe(base);
    expect(moveBullet(base, 0, 2, 3)).toBe(base);
    expect(moveBullet(base, 5, 0, 1)).toBe(base);
  });
});

describe('isMatchStale', () => {
  it('is stale when the master changed after the score', () => {
    expect(isMatchStale('2026-10-16T12:00:00Z', '2026-10-16T11:00:00Z')).toBe(true);
  });

  it('is fresh when the score is newer', () => {
    expect(isMatchStale(new Date('2026-10-16T10:00:00Z'), '2026-10-16T11:00:00Z')).toBe(false);
  });

  it('treats matches stored before created_at existed as stale', () => {
    expect(isMatchStale('2026-10-16T10:00:00Z', '')).toBe(true);
  });
});

describe('readNote', () => {
  it('reads {note, audit} JSON', () => {
    const audit = { removedSkills: [], unsupportedNumbers: ['3'], unsupportedEmployers: [], bulletsDropped: 0, bulletsRestored: 0 };
    expect(readNote(JSON.stringify({ note: 'n', audit }))).toEqual({ note: 'n', audit });
  });

  it('treats older plain-text rows as the note', () => {
    expect(readNote('plain words')).toEqual({ note: 'plain words', audit: null });
    expect(readNote(null)).toEqual({ note: '', audit: null });
  });
});
