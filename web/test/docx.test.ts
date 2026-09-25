// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { inflateRawSync } from 'node:zlib';
import { resumeDocx, resumeDocumentXml } from '@/lib/docx';
import { ResumeSchema } from '@/lib/resume-schema';
import fixture from './fixtures/priya.json';

const resume = ResumeSchema.parse(fixture);

/** Reads entries back through the central directory, the way Word does. */
function unzip(buf: Buffer): Map<string, string> {
  const end = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  const count = buf.readUInt16LE(end + 10);
  let p = buf.readUInt32LE(end + 16);
  const out = new Map<string, string>();
  for (let i = 0; i < count; i++) {
    const size = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const offset = buf.readUInt32LE(p + 42);
    const name = buf.subarray(p + 46, p + 46 + nameLen).toString();
    const dataStart = offset + 30 + buf.readUInt16LE(offset + 26);
    out.set(name, inflateRawSync(buf.subarray(dataStart, dataStart + size)).toString());
    p += 46 + nameLen;
  }
  return out;
}

describe('resumeDocx', () => {
  it('is a zip holding the three parts Word needs', () => {
    const files = unzip(resumeDocx(resume));
    expect([...files.keys()]).toEqual(['[Content_Types].xml', '_rels/.rels', 'word/document.xml']);
    expect(files.get('word/document.xml')).toContain('Meridian Freight');
  });

  it('keeps the standard headings and every bullet', () => {
    const xml = resumeDocumentXml(resume);
    for (const h of ['Summary', 'Skills', 'Experience', 'Education']) expect(xml).toContain(`>${h}<`);
    const bullets = resume.experience.reduce((n, r) => n + r.bullets.length, 0);
    expect(xml.match(/•\t/g)?.length).toBe(bullets + (resume.certifications?.length ?? 0));
  });

  it('escapes text so a résumé cannot break the XML', () => {
    const xml = resumeDocumentXml({ ...resume, summary: 'R&D <lead> "quoted"' });
    expect(xml).toContain('R&amp;D &lt;lead&gt; &quot;quoted&quot;');
  });

  it('uses no tables, text boxes or headers', () => {
    expect(resumeDocumentXml(resume)).not.toMatch(/<w:tbl|<w:txbxContent|<w:headerReference/);
  });
});
