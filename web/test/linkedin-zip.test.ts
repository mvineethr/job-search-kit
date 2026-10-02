import { describe, it, expect } from 'vitest';
import { zip } from '@/lib/docx';
import { parseCsv, linkedinZipToText, NOT_LINKEDIN } from '@/lib/linkedin-zip';

const f = (name: string, text: string) => ({ name, data: Buffer.from(text, 'utf8') });

describe('parseCsv', () => {
  it('handles quoted commas, quoted newlines, escaped quotes and CRLF', () => {
    const rows = parseCsv('﻿Name,Note\r\n"Smith, Jo","line one\nline ""two"""\r\n');
    expect(rows).toEqual([{ Name: 'Smith, Jo', Note: 'line one\nline "two"' }]);
  });
});

describe('linkedinZipToText', () => {
  const exportZip = zip([
    f('Basic_LinkedInDataExport/Profile.csv',
      'First Name,Last Name,Headline,Summary,Geo Location\nPriya,Raman,Platform engineer,"Runs infra, mostly Kubernetes",Leeds\n'),
    f('Basic_LinkedInDataExport/Positions.csv',
      'Company Name,Title,Description,Location,Started On,Finished On\nAcme,SRE,"Moved deploys to Argo CD\nCut pager noise",Leeds,Jun 2021,\n'),
    f('Basic_LinkedInDataExport/Education.csv',
      'School Name,Start Date,End Date,Notes,Degree Name,Activities\nUniversity of Leeds,2014,2017,,BSc Computer Science,\n'),
    f('Basic_LinkedInDataExport/Skills.csv', 'Name\nKubernetes\nTerraform\n'),
    f('Basic_LinkedInDataExport/Email Addresses.csv',
      'Email Address,Confirmed,Primary,Updated On\npriya@example.com,Yes,Yes,2024\n'),
    f('Basic_LinkedInDataExport/Connections.csv', 'ignored\n'),
  ]);

  it('writes the export out as résumé-like text', () => {
    const text = linkedinZipToText(exportZip);
    expect(text).toContain('Priya Raman');
    expect(text).toContain('Platform engineer');
    expect(text).toContain('priya@example.com');
    expect(text).toContain('Runs infra, mostly Kubernetes');
    expect(text).toContain('SRE, Acme, Leeds');
    expect(text).toContain('Jun 2021 – Present');
    expect(text).toContain('Moved deploys to Argo CD\nCut pager noise');
    expect(text).toContain('BSc Computer Science, University of Leeds, 2014 – 2017');
    expect(text).toContain('Kubernetes, Terraform');
    expect(text).not.toContain('ignored');
  });

  it('rejects a zip that is not a LinkedIn export', () => {
    expect(() => linkedinZipToText(zip([f('notes.txt', 'hello')]))).toThrow(NOT_LINKEDIN);
  });

  it('rejects something that is not a zip at all', () => {
    expect(() => linkedinZipToText(Buffer.from('not a zip'))).toThrow();
  });
});
