import { inflateRawSync } from 'node:zlib';

/**
 * LinkedIn's "Get a copy of your data" export is a zip of CSVs. Read the few
 * that describe a career and write them out as plain résumé-like text, so the
 * export goes through the same review-then-parse path as a pasted résumé.
 *
 * Hand-rolled like the zip writer in docx.ts: a central-directory walk and
 * inflateRawSync are all a zip reader needs, and it avoids a dependency.
 */

export const NOT_LINKEDIN =
  'That zip is not a LinkedIn data export. Upload the zip LinkedIn emailed you, or the profile PDF.';

// Only wanted entries are inflated, each capped, so a small hostile zip cannot expand without limit.
const MAX_ENTRY = 5 * 1024 * 1024;

export function unzip(buf: Buffer, want: (name: string) => boolean): Map<string, Buffer> {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 22 - 0xffff); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('That file is not a zip.');

  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const out = new Map<string, Buffer>();

  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('That zip is damaged.');
    const method = buf.readUInt16LE(p + 10);
    const size = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOffset = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);
    p += 46 + nameLen + extraLen + commentLen;

    if (!want(name)) continue;
    const start = localOffset + 30 + buf.readUInt16LE(localOffset + 26) + buf.readUInt16LE(localOffset + 28);
    const data = buf.subarray(start, start + size);
    if (method === 0) out.set(name, data);
    else if (method === 8) out.set(name, inflateRawSync(data, { maxOutputLength: MAX_ENTRY }));
  }
  return out;
}

/** RFC 4180-ish: quoted fields may hold commas, newlines and "" escapes. First row is the header. */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  const s = text.replace(/^﻿/, '');

  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quoted) {
      if (c === '"' && s[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += c;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }

  const [head, ...body] = rows.filter((r) => r.some((x) => x.trim()));
  if (!head) return [];
  return body.map((r) => Object.fromEntries(head.map((h, j) => [h.trim(), (r[j] ?? '').trim()])));
}

const FILES = ['profile.csv', 'positions.csv', 'education.csv', 'skills.csv', 'email addresses.csv'];
const base = (name: string) => name.split('/').pop()!.toLowerCase();

export function linkedinZipToText(buf: Buffer): string {
  const files = unzip(buf, (n) => FILES.includes(base(n)));
  const csv = (file: string) => {
    for (const [n, d] of files) if (base(n) === file) return parseCsv(d.toString('utf8'));
    return [];
  };
  const profile = csv('profile.csv')[0];
  const positions = csv('positions.csv');
  const education = csv('education.csv');
  const skills = csv('skills.csv').map((s) => s.Name).filter(Boolean);
  const emails = csv('email addresses.csv');

  if (!profile && !positions.length && !education.length && !skills.length) throw new Error(NOT_LINKEDIN);

  const lines: string[] = [];
  if (profile) {
    lines.push(`${profile['First Name'] ?? ''} ${profile['Last Name'] ?? ''}`.trim());
    if (profile.Headline) lines.push(profile.Headline);
    if (profile['Geo Location']) lines.push(profile['Geo Location']);
  }
  const email = (emails.find((e) => e.Primary === 'Yes') ?? emails[0])?.['Email Address'];
  if (email) lines.push(email);

  if (profile?.Summary) lines.push('', 'Summary', profile.Summary);

  if (positions.length) {
    lines.push('', 'Experience');
    for (const r of positions) {
      lines.push('', [r.Title, r['Company Name'], r.Location].filter(Boolean).join(', '));
      lines.push(`${r['Started On'] ?? ''} – ${r['Finished On'] || 'Present'}`);
      if (r.Description) lines.push(r.Description);
    }
  }

  if (education.length) {
    lines.push('', 'Education');
    for (const e of education) {
      const years = [e['Start Date'], e['End Date']].filter(Boolean).join(' – ');
      lines.push([e['Degree Name'], e['School Name'], years].filter(Boolean).join(', '));
    }
  }

  if (skills.length) lines.push('', 'Skills', skills.join(', '));

  return lines.join('\n').trim();
}
