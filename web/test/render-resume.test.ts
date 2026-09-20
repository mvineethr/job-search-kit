import { describe, it, expect } from 'vitest';
import { renderResumeHtml } from '@/lib/render-resume';
import { ResumeSchema, METRIC_NEEDED } from '@/lib/resume-schema';
import fixture from './fixtures/priya.json';

const resume = ResumeSchema.parse(fixture);

describe('renderResumeHtml', () => {
  const html = renderResumeHtml(resume);

  it('uses the exact ATS section headings', () => {
    expect(html).toContain('<h2>Summary</h2>');
    expect(html).toContain('<h2>Skills</h2>');
    expect(html).toContain('<h2>Experience</h2>');
    expect(html).toContain('<h2>Education</h2>');
  });

  it('contains no tables, columns or images', () => {
    expect(html).not.toMatch(/<table|<img|column-count|display:\s*grid/i);
  });

  it('renders every bullet from every role', () => {
    for (const role of resume.experience) {
      for (const bullet of role.bullets) {
        expect(html).toContain(bullet);
      }
    }
  });

  it('escapes HTML in user content', () => {
    const risky = structuredClone(resume);
    risky.summary = 'Ran <script>alert(1)</script> in production';
    const out = renderResumeHtml(risky);
    expect(out).not.toContain('<script>alert(1)</script>');
    expect(out).toContain('&lt;script&gt;');
  });

  it('marks a missing metric so it is visible rather than silent', () => {
    const gap = structuredClone(resume);
    gap.experience[0].bullets[0] = `Cut deploy time by ${METRIC_NEEDED}.`;
    const out = renderResumeHtml(gap);
    expect(out).toContain('class="metric-needed"');
  });

  it('omits the Certifications heading when there are none', () => {
    const none = structuredClone(resume);
    delete none.certifications;
    expect(renderResumeHtml(none)).not.toContain('<h2>Certifications</h2>');
  });
});
