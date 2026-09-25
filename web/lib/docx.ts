import { crc32, deflateRawSync } from 'node:zlib';
import type { Resume } from './resume-schema';
import { dateRange } from './render-resume';

/**
 * A résumé as a Word document, written by hand. A .docx is a zip of four small
 * XML files; the output here is single-column paragraphs with no tables, text
 * boxes or headers — the same ATS rules the PDF follows — so a library would
 * mostly add weight. Same section order and headings as render-resume.ts.
 */

const FONT = 'Calibri';
const PAGE_TEXT_WIDTH = 10800; // Letter width 12240 minus 0.5in margins, in twentieths of a point

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

type RunOpts = { bold?: boolean; size?: number };

function run(text: string, { bold = false, size = 21 }: RunOpts = {}): string {
  const props = `<w:rFonts w:ascii="${FONT}" w:hAnsi="${FONT}" w:cs="${FONT}"/>${bold ? '<w:b/>' : ''}<w:sz w:val="${size}"/>`;
  return `<w:r><w:rPr>${props}</w:rPr><w:t xml:space="preserve">${esc(text)}</w:t></w:r>`;
}

const TAB = `<w:r><w:tab/></w:r>`;

function para(runs: string, { after = 60, before = 0, indent = 0, rightTab = false } = {}): string {
  const tabs = rightTab ? `<w:tabs><w:tab w:val="right" w:pos="${PAGE_TEXT_WIDTH}"/></w:tabs>` : '';
  const ind = indent ? `<w:ind w:left="${indent}" w:hanging="220"/>` : '';
  return `<w:p><w:pPr>${tabs}<w:spacing w:before="${before}" w:after="${after}"/>${ind}</w:pPr>${runs}</w:p>`;
}

const heading = (text: string) => para(run(text, { bold: true, size: 24 }), { before: 200, after: 80 });
const bullet = (text: string) => para(run(`•\t${text}`), { indent: 360, after: 40 });

export function resumeDocumentXml(r: Resume): string {
  const c = r.contact;
  const body: string[] = [
    para(run(r.name, { bold: true, size: 32 }), { after: 40 }),
    ...(r.targetTitle ? [para(run(r.targetTitle, { size: 22 }), { after: 40 })] : []),
    para(run([c.location, c.phone, c.email, c.linkedin].filter(Boolean).join(' | ')), { after: 120 }),
  ];

  if (r.summary) body.push(heading('Summary'), para(run(r.summary)));
  body.push(heading('Skills'), para(run(r.skills.join(', '))));

  body.push(heading('Experience'));
  for (const role of r.experience) {
    body.push(
      para(run(role.title, { bold: true }) + TAB + run(dateRange(role.start, role.end)), { before: 120, after: 0, rightTab: true }),
      para(run(role.company) + (role.location ? TAB + run(role.location) : ''), { after: 40, rightTab: true }),
      ...role.bullets.map(bullet),
    );
  }

  body.push(heading('Education'));
  for (const e of r.education) {
    body.push(para(run(e.degree, { bold: true }) + run(`, ${e.school}${e.year ? `, ${e.year}` : ''}`)));
  }

  if (r.certifications?.length) body.push(heading('Certifications'), ...r.certifications.map(bullet));

  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>` +
    body.join('') +
    `<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720" w:header="0" w:footer="0" w:gutter="0"/></w:sectPr>` +
    `</w:body></w:document>`
  );
}

const CONTENT_TYPES =
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
  `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
  `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
  `<Default Extension="xml" ContentType="application/xml"/>` +
  `<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>` +
  `</Types>`;

const ROOT_RELS =
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
  `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
  `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>` +
  `</Relationships>`;

/** Minimal zip (deflate, no extras). Fixed 1980 timestamp so output is reproducible. */
export function zip(files: { name: string; data: Buffer }[]): Buffer {
  const locals: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;

  for (const f of files) {
    const name = Buffer.from(f.name, 'utf8');
    const packed = deflateRawSync(f.data);
    const crc = crc32(f.data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(0x0800, 6); // UTF-8 names
    local.writeUInt16LE(8, 8); // deflate
    local.writeUInt16LE(0, 10); // time
    local.writeUInt16LE(0x21, 12); // date: 1980-01-01
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(packed.length, 18);
    local.writeUInt32LE(f.data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    locals.push(local, name, packed);

    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(20, 4); // version made by
    cd.writeUInt16LE(20, 6);
    cd.writeUInt16LE(0x0800, 8);
    cd.writeUInt16LE(8, 10);
    cd.writeUInt16LE(0, 12);
    cd.writeUInt16LE(0x21, 14);
    cd.writeUInt32LE(crc, 16);
    cd.writeUInt32LE(packed.length, 20);
    cd.writeUInt32LE(f.data.length, 24);
    cd.writeUInt16LE(name.length, 28);
    // extra, comment, disk, internal/external attributes: all zero
    cd.writeUInt32LE(offset, 42);
    central.push(cd, name);

    offset += local.length + name.length + packed.length;
  }

  const cdBuf = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(cdBuf.length, 12);
  end.writeUInt32LE(offset, 16);

  return Buffer.concat([...locals, cdBuf, end]);
}

export function resumeDocx(r: Resume): Buffer {
  return zip([
    { name: '[Content_Types].xml', data: Buffer.from(CONTENT_TYPES) },
    { name: '_rels/.rels', data: Buffer.from(ROOT_RELS) },
    { name: 'word/document.xml', data: Buffer.from(resumeDocumentXml(r)) },
  ]);
}
