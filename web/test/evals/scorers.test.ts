import { describe, it, expect } from 'vitest';
import { newNumbers, scoreParse, scoreTailor, scoreLetter, scoreMatch, scoreReview } from '@/evals/score';
import type { Fixture } from '@/evals/fixtures';
import { ResumeSchema, type Resume } from '@/lib/resume-schema';
import priya from '../fixtures/priya.json';

const resume: Resume = ResumeSchema.parse(priya);
const fx: Fixture = {
  slug: 'priya',
  resumeText: [
    'Priya Raman', 'Site Reliability Engineer', 'Austin, TX · priya.raman@example.com · (512) 555-0142 · linkedin.com/in/priyaraman',
    resume.summary, 'Skills: ' + resume.skills.join(', '),
    ...resume.experience.flatMap((r) => [`${r.title}, ${r.company}, ${r.location ?? ''}, ${r.start} - ${r.end}`, ...r.bullets]),
    ...resume.education.map((e) => `${e.degree}, ${e.school}, ${e.year ?? ''}`),
    ...(resume.certifications ?? []),
  ].join('\n'),
  resume,
  company: 'Acme',
  role: 'SRE',
  description: 'We need Kubernetes, Terraform and Datadog. Team of 12.',
  truth: { supported: ['Kubernetes', 'Terraform'], traps: ['Datadog'], fitBand: 'high' },
};
const json = (o: unknown) => '```json\n' + JSON.stringify(o) + '\n```';

describe('scoreParse', () => {
  it('passes a faithful transcription', () => {
    const s = scoreParse(json(resume), fx);
    expect(s.gates).toEqual({ parses: true, noInventedWords: true });
    expect(s.metrics.lost).toBe(0);
  });
  it('fails on an invented word', () => {
    const bad = { ...resume, summary: resume.summary + ' Expert in Kafka.' };
    expect(scoreParse(json(bad), fx).gates.noInventedWords).toBe(false);
  });
  it('fails on unparseable output', () => {
    expect(scoreParse('sorry, no', fx)).toEqual({ gates: { parses: false }, metrics: {} });
  });
});

describe('scoreTailor', () => {
  it('passes the original résumé unchanged', () => {
    const s = scoreTailor(json(resume), fx);
    expect(Object.values(s.gates).every(Boolean)).toBe(true);
    expect(s.metrics.coverage).toBe(1);
  });
  it('fails when a trap appears in a bullet', () => {
    const bad = structuredClone(resume);
    bad.experience[0].bullets[0] = 'Ran Datadog for 40 services.';
    expect(scoreTailor(json(bad), fx).gates.noTrap).toBe(false);
  });
  it('fails on an invented number', () => {
    const bad = structuredClone(resume);
    bad.experience[0].bullets[0] = 'Cut deploy time by 73%.';
    expect(scoreTailor(json(bad), fx).gates.noUnsupportedNumbers).toBe(false);
  });
});

describe('scoreLetter', () => {
  const letter = (p: string) => json({ greeting: 'Dear team,', paragraphs: [p, 'I would welcome a conversation.'], name: 'Priya Raman' });
  it('passes, and allows numbers quoted from the posting', () => {
    expect(Object.values(scoreLetter(letter('I rebuilt pipelines across 40 services and would join your team of 12.'), fx).gates).every(Boolean)).toBe(true);
  });
  it('fails on a trap or an invented number', () => {
    expect(scoreLetter(letter('I have run Datadog for years.'), fx).gates.noTrap).toBe(false);
    expect(scoreLetter(letter('I cut costs by 73%.'), fx).gates.noNewNumbers).toBe(false);
  });
});

describe('scoreMatch', () => {
  const req = (o: object) => ({ id: 'r', skill: 'x', text: 'x', kind: 'must', category: 'skill', status: 'missing', evidence: '', question: '', why: '', ...o });
  it('scores with the app arithmetic and checks the band', () => {
    const s = scoreMatch(json({ requirements: [req({ id: 'a', skill: 'Kubernetes', text: 'Kubernetes', status: 'met', evidence: 'Migrated the core ledger service to Kubernetes' })] }), fx);
    expect(s.gates).toEqual({ parses: true, noTrapClaimed: true });
    expect(s.metrics.score).toBe(100);
    expect(s.metrics.bandHit).toBe(1);
  });
  it('fails when a trap is claimed with a quote that survives verification', () => {
    const s = scoreMatch(json({ requirements: [req({ skill: 'Datadog', text: 'Datadog monitoring', status: 'met', evidence: 'Prometheus' })] }), fx);
    expect(s.gates.noTrapClaimed).toBe(false);
  });
});

describe('scoreReview', () => {
  it('counts findings and critical ones', () => {
    const text = 'Prose.\n' + json([{ section: 'summary', severity: 'critical', finding: 'a' }, { section: 'skills', severity: 'worth-fixing', finding: 'b' }]);
    expect(scoreReview(text, fx)).toEqual({ gates: { parses: true }, metrics: { findings: 2, critical: 1 } });
  });
});

describe('newNumbers', () => {
  it('uses set membership, not substring', () => {
    expect(newNumbers('4 teams', '2024')).toEqual(['4']);
  });
  it('normalises dots, thousands commas and spaces before %', () => {
    expect(newNumbers('1,200.', '1200')).toEqual([]);
    expect(newNumbers('40 %', '40%')).toEqual([]);
  });
});

describe('numeric gates catch short numbers', () => {
  it('parse fails on an invented 40%', () => {
    const bad = { ...resume, summary: resume.summary + ' Cut costs by 40%.' };
    const s = scoreParse(json(bad), fx);
    expect(s.gates.noInventedWords).toBe(false);
    expect(s.metrics.invented).toBeGreaterThan(0);
  });
  it('tailor fails on "4 teams" when 4 only sits inside 2024 and the phone number', () => {
    const bad = structuredClone(resume);
    bad.experience[0].bullets[0] = 'Led 4 teams.';
    const fx2 = { ...fx, resumeText: fx.resumeText + '\nSince 2024. (512) 555-0142' };
    expect(scoreTailor(json(bad), fx2).gates.noUnsupportedNumbers).toBe(false);
  });
  it('match omits score and bandHit when every requirement is unknown', () => {
    const r = { id: 'r', skill: 'x', text: 'x', kind: 'must', category: 'skill', status: 'unknown', evidence: '', question: '', why: '' };
    const s = scoreMatch(json({ requirements: [r] }), fx);
    expect('score' in s.metrics).toBe(false);
    expect('bandHit' in s.metrics).toBe(false);
    expect(s.metrics.requirements).toBe(1);
  });
});
