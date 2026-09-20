import { METRIC_NEEDED, type Resume, type Role } from '@/lib/resume-schema';
import { DOCUMENT_CSS } from '@/styles/document';

function Bullet({ children }: { children: string }) {
  const parts = children.split(METRIC_NEEDED);
  return (
    <li>
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {i < parts.length - 1 && <span className="metric-needed">{METRIC_NEEDED}</span>}
        </span>
      ))}
    </li>
  );
}

function RoleBlock({ role }: { role: Role }) {
  return (
    <div className="role">
      <div className="role-line">
        <span className="role-title">{role.title}</span>
        <span className="role-meta">
          {role.start} – {role.end}
        </span>
      </div>
      <div className="role-line">
        <span className="company">{role.company}</span>
        <span className="role-meta">{role.location ?? ''}</span>
      </div>
      <ul>
        {role.bullets.map((b, i) => (
          <Bullet key={i}>{b}</Bullet>
        ))}
      </ul>
    </div>
  );
}

/**
 * The résumé as the user sees it. Shares DOCUMENT_CSS with the export renderer
 * so what is on screen is what prints. Section ids let review findings link to
 * the part of the document they criticise.
 */
export default function ResumeDocument({
  resume,
  pendingSections = [],
}: {
  resume: Resume;
  pendingSections?: string[];
}) {
  const pending = (name: string) =>
    pendingSections.includes(name) ? { opacity: 0.38 } : undefined;

  const c = resume.contact;
  const contact = [c.location, c.phone, c.email, c.linkedin].filter(Boolean).join(' | ');

  return (
    <article className="resume">
      <style>{DOCUMENT_CSS}</style>
      <h1>{resume.name}</h1>
      {resume.targetTitle && <p className="target">{resume.targetTitle}</p>}
      <p className="contact">{contact}</p>

      <section id="sec-summary" style={pending('Summary')}>
        <h2>Summary</h2>
        <p>{resume.summary}</p>
      </section>

      <section id="sec-skills" style={pending('Skills')}>
        <h2>Skills</h2>
        <p>{resume.skills.join(', ')}</p>
      </section>

      <section id="sec-experience" style={pending('Experience')}>
        <h2>Experience</h2>
        {resume.experience.map((role, i) => (
          <RoleBlock key={i} role={role} />
        ))}
      </section>

      <section id="sec-education" style={pending('Education')}>
        <h2>Education</h2>
        {resume.education.map((e, i) => (
          <p key={i}>
            <strong>{e.degree}</strong>, {e.school}
            {e.year ? `, ${e.year}` : ''}
          </p>
        ))}
      </section>

      {resume.certifications && resume.certifications.length > 0 && (
        <section id="sec-certifications" style={pending('Certifications')}>
          <h2>Certifications</h2>
          <ul>
            {resume.certifications.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
