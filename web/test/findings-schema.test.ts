import { describe, it, expect } from 'vitest';
import { parseFindings, stripFindings } from '@/lib/findings-schema';

const good = `Your résumé reads as a list of duties.

\`\`\`json
[
  { "section": "summary", "severity": "critical", "finding": "Your summary names a title, not a person." },
  { "section": "experience", "severity": "worth-fixing", "finding": "Three bullets carry no number." }
]
\`\`\``;

describe('parseFindings', () => {
  it('pulls findings out of a fenced json block', () => {
    const f = parseFindings(good);
    expect(f).toHaveLength(2);
    expect(f[0].section).toBe('summary');
    expect(f[0].severity).toBe('critical');
  });

  it('returns an empty array when the model produced no json block', () => {
    expect(parseFindings('Looks fine to me.')).toEqual([]);
  });

  it('returns an empty array for malformed json rather than throwing mid-stream', () => {
    expect(parseFindings('```json\n[{ broken \n```')).toEqual([]);
  });

  it('drops findings with an unknown section instead of rendering an unanchored one', () => {
    const odd = '```json\n[{"section":"hobbies","severity":"critical","finding":"x"}]\n```';
    expect(parseFindings(odd)).toEqual([]);
  });
});

describe('stripFindings', () => {
  it('leaves the prose without the json block', () => {
    const prose = stripFindings(good);
    expect(prose).toBe('Your résumé reads as a list of duties.');
    expect(prose).not.toContain('json');
  });

  it('returns text unchanged when there is no block', () => {
    expect(stripFindings('Just prose.')).toBe('Just prose.');
  });
});
