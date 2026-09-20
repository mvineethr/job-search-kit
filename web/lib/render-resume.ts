import { METRIC_NEEDED, type Resume, type Role } from './resume-schema';
import { DOCUMENT_CSS } from '../styles/document';

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Escape first, then wrap the metric marker so it is visible on screen but plain in print. */
function text(s: string): string {
  return escapeHtml(s)
    .split(escapeHtml(METRIC_NEEDED))
    .join(`<span class="metric-needed">${escapeHtml(METRIC_NEEDED)}</span>`);
}

function renderRole(role: Role): string {
  const loc = role.location ? text(role.location) : '';
  return `  <div class="role">
    <div class="role-line">
      <span class="role-title">${text(role.title)}</span>
      <span class="role-meta">${text(role.start)} – ${text(role.end)}</span>
    </div>
    <div class="role-line">
      <span class="company">${text(role.company)}</span>
      <span class="role-meta">${loc}</span>
    </div>
    <ul>
${role.bullets.map((b) => `      <li>${text(b)}</li>`).join('\n')}
    </ul>
  </div>`;
}

/** The résumé body. Section order and headings are fixed by core/ats-rules.md. */
export function renderResumeBody(resume: Resume): string {
  const c = resume.contact;
  const contactLine = [c.location, c.phone, c.email, c.linkedin]
    .filter(Boolean)
    .map((v) => text(String(v)))
    .join(' | ');

  const certs =
    resume.certifications && resume.certifications.length > 0
      ? `
  <h2>Certifications</h2>
  <ul>
${resume.certifications.map((x) => `    <li>${text(x)}</li>`).join('\n')}
  </ul>`
      : '';

  return `<div class="resume">
  <h1>${text(resume.name)}</h1>
  ${resume.targetTitle ? `<p class="target">${text(resume.targetTitle)}</p>` : ''}
  <p class="contact">${contactLine}</p>

  <h2>Summary</h2>
  <p>${text(resume.summary)}</p>

  <h2>Skills</h2>
  <p>${resume.skills.map(text).join(', ')}</p>

  <h2>Experience</h2>
${resume.experience.map(renderRole).join('\n')}

  <h2>Education</h2>
${resume.education
  .map(
    (e) =>
      `  <p><strong>${text(e.degree)}</strong>, ${text(e.school)}${
        e.year ? `, ${text(e.year)}` : ''
      }</p>`,
  )
  .join('\n')}${certs}
</div>`;
}

/** A complete standalone document, used for PDF export. */
export function renderResumeHtml(resume: Resume): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(resume.name)} — Resume</title>
<style>${DOCUMENT_CSS}</style>
</head>
<body>
${renderResumeBody(resume)}
</body>
</html>`;
}
