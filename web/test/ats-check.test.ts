import { describe, it, expect } from 'vitest';
import { checkExtractedText } from '@/lib/ats-check';

const good = `Priya Raman  priya@example.com  (512) 555-0142
Summary Site reliability engineer ${'with production experience '.repeat(12)}
Skills Kubernetes, Terraform
Experience Senior SRE, Meridian Freight  Mar 2022 – Present
Education BS Computer Science`;

const failed = (text: string) => checkExtractedText(text).filter((c) => !c.ok).map((c) => c.label);

describe('checkExtractedText', () => {
  it('passes a clean single-column extraction', () => {
    expect(failed(good)).toEqual([]);
  });

  it('accepts capitalised headings, as our own PDF export produces', () => {
    expect(failed(good.replace(/^(Summary|Skills|Experience|Education)/gm, (h) => h.toUpperCase()))).toEqual([]);
  });

  it('flags a scanned PDF with no text', () => {
    expect(failed('   \n  ')).toContain('Text can be read');
  });

  it('names the missing headings', () => {
    const c = checkExtractedText(good.replace('Experience', 'Where I made impact'));
    expect(c.find((x) => x.label === 'Standard section headings')?.detail).toContain('Experience');
  });

  it('flags font placeholders', () => {
    expect(failed(good + ' (cid:42)')).toEqual(['No garbled characters']);
  });
});
