import { METRIC_NEEDED, type Resume, type Role } from '@/lib/resume-schema';
import { DOCUMENT_CSS } from '@/styles/document';
import { dateRange } from '@/lib/render-resume';

/**
 * Marks numbers the audit could not find in the original, where they sit, so they
 * cannot be missed in a side panel. Whole numbers only: flagging "40" must not
 * mark the "40" inside "400".
 */
function Flagged({ text, numbers }: { text: string; numbers: string[] }) {
  if (numbers.length === 0) return <>{text}</>;
  const escaped = numbers.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const re = new RegExp(`(?<![\\d.,])(${escaped.join('|')})(?![\\d])`, 'g');
  return (
    <>
      {text.split(re).map((part, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="unsupported-number" title="Not in your original résumé. Check it before sending.">
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  );
}

function Bullet({ children, numbers }: { children: string; numbers: string[] }) {
  const parts = children.split(METRIC_NEEDED);
  return (
    <li>
      {parts.map((part, i) => (
        <span key={i}>
          <Flagged text={part} numbers={numbers} />
          {i < parts.length - 1 && <span className="metric-needed">{METRIC_NEEDED}</span>}
        </span>
      ))}
    </li>
  );
}

function RoleBlock({ role, numbers }: { role: Role; numbers: string[] }) {
  return (
    <div className="role">
      <div className="role-line">
        <span className="role-title">{role.title}</span>
        <span className="role-meta">{dateRange(role.start, role.end)}</span>
      </div>
      <div className="role-line">
        <span className="company">{role.company}</span>
        <span className="role-meta">{role.location ?? ''}</span>
      </div>
      <ul>
        {role.bullets.map((b, i) => (
          <Bullet key={i} numbers={numbers}>
            {b}
          </Bullet>
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
  unsupportedNumbers = [],
}: {
  resume: Resume;
  pendingSections?: string[];
  /** From the tailoring audit: highlighted on screen, plain in print. */
  unsupportedNumbers?: string[];
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

      {resume.summary && (
        <section id="sec-summary" style={pending('Summary')}>
          <h2>Summary</h2>
          <p>
            <Flagged text={resume.summary} numbers={unsupportedNumbers} />
          </p>
        </section>
      )}

      <section id="sec-skills" style={pending('Skills')}>
        <h2>Skills</h2>
        <p>{resume.skills.join(', ')}</p>
      </section>

      <section id="sec-experience" style={pending('Experience')}>
        <h2>Experience</h2>
        {resume.experience.map((role, i) => (
          <RoleBlock key={i} role={role} numbers={unsupportedNumbers} />
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
