'use client';

import { useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { Resume, Role } from '@/lib/resume-schema';
import { moveBullet } from '@/lib/resume-edit';
import { DOCUMENT_CSS } from '@/styles/document';
import EditableText from './EditableText';
import MarkedText from './MarkedText';

type Education = Resume['education'][number];
type Status = { kind: 'idle' } | { kind: 'saving' } | { kind: 'saved' } | { kind: 'error'; message: string };

const replaceAt = <T,>(xs: T[], i: number, v: T) => xs.map((x, j) => (j === i ? v : x));
const removeAt = <T,>(xs: T[], i: number) => xs.filter((_, j) => j !== i);
const confirmRemove = (what: string) => window.confirm(`Delete this ${what}?`);

/** A small edit control. Hidden in print, so the PDF matches the export. */
function Ctl({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button type="button" className="edit-ctl edit-only" aria-label={label} title={label} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

/** "+ Add …" that becomes an empty field; an empty commit adds nothing. */
function AddText({ label, multiline, onAdd }: { label: string; multiline?: boolean; onAdd: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  if (!open) return <Ctl label={label} onClick={() => setOpen(true)}>+ {label}</Ctl>;
  return (
    <EditableText
      value=""
      label={label}
      multiline={multiline}
      startEditing
      onCommit={(v) => {
        setOpen(false);
        if (v) onAdd(v);
      }}
      onCancel={() => setOpen(false)}
    />
  );
}

/**
 * A role needs a title, a company and a bullet before it is valid, so it is added
 * through a small form rather than with placeholder text that could be saved.
 */
function AddRole({ onAdd }: { onAdd: (r: Role) => void }) {
  const empty = { title: '', company: '', start: '', end: '', bullet: '' };
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(empty);
  if (!open) return <Ctl label="Add a role" onClick={() => setOpen(true)}>+ Add a role</Ctl>;
  const ready = Boolean(f.title.trim() && f.company.trim() && f.bullet.trim());
  const field = (k: keyof typeof empty, label: string) => (
    <label className="edit-form-row">
      {label}
      <input className="edit-field" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
    </label>
  );
  return (
    <div className="edit-form edit-only">
      {field('title', 'Title')}
      {field('company', 'Company')}
      {field('start', 'Start')}
      {field('end', 'End')}
      {field('bullet', 'First bullet')}
      <div>
        <button
          type="button"
          className="edit-ctl"
          disabled={!ready}
          onClick={() => {
            onAdd({ title: f.title.trim(), company: f.company.trim(), start: f.start.trim(), end: f.end.trim(), bullets: [f.bullet.trim()] });
            setF(empty);
            setOpen(false);
          }}
        >
          Add role
        </button>
        <button type="button" className="edit-ctl" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function AddEducation({ onAdd }: { onAdd: (e: Education) => void }) {
  const empty = { degree: '', school: '', year: '' };
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(empty);
  if (!open) return <Ctl label="Add education" onClick={() => setOpen(true)}>+ Add education</Ctl>;
  const ready = Boolean(f.degree.trim() && f.school.trim());
  const field = (k: keyof typeof empty, label: string) => (
    <label className="edit-form-row">
      {label}
      <input className="edit-field" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
    </label>
  );
  return (
    <div className="edit-form edit-only">
      {field('degree', 'Degree')}
      {field('school', 'School')}
      {field('year', 'Year')}
      <div>
        <button
          type="button"
          className="edit-ctl"
          disabled={!ready}
          onClick={() => {
            onAdd({ degree: f.degree.trim(), school: f.school.trim(), ...(f.year.trim() ? { year: f.year.trim() } : {}) });
            setF(empty);
            setOpen(false);
          }}
        >
          Add education
        </button>
        <button type="button" className="edit-ctl" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </div>
  );
}

/**
 * The résumé as it prints, editable in place. Shares DOCUMENT_CSS with the export
 * renderer so what is on screen is what prints. Every change sends the whole
 * résumé; the server validates it. Saves run one at a time, and only the latest
 * waiting one is sent.
 */
export default function EditableResume({ id, initial, flags: initialFlags }: { id: string; initial: Resume; flags: string[] }) {
  const router = useRouter();
  const [resume, setResume] = useState(initial);
  const [flags, setFlags] = useState(initialFlags);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const inFlight = useRef(false);
  const queued = useRef<Resume | null>(null);

  async function save(next: Resume) {
    if (inFlight.current) {
      queued.current = next;
      return;
    }
    inFlight.current = true;
    setStatus({ kind: 'saving' });
    try {
      const res = await fetch(`/api/resumes/${id}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ content: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus({ kind: 'error', message: data.error ?? "That change couldn't be saved." });
      } else {
        setFlags(data.unsupportedNumbers ?? []);
        setStatus({ kind: 'saved' });
        router.refresh(); // side panels (missing numbers, filler phrases) read the saved text
      }
    } catch {
      setStatus({ kind: 'error', message: "Couldn't reach the server." });
    } finally {
      inFlight.current = false;
      const waiting = queued.current;
      queued.current = null;
      if (waiting) void save(waiting);
    }
  }

  function change(next: Resume) {
    setResume(next);
    void save(next);
  }

  const setRole = (i: number, patch: Partial<Role>) =>
    change({ ...resume, experience: replaceAt(resume.experience, i, { ...resume.experience[i], ...patch }) });
  const marked = (t: string) => <MarkedText text={t} numbers={flags} />;

  const c = resume.contact;
  const contactFields = [
    ['location', 'Location'],
    ['phone', 'Phone'],
    ['email', 'Email'],
    ['linkedin', 'LinkedIn'],
  ] as const;
  const firstFilled = contactFields.findIndex(([k]) => c[k]);
  const certs = resume.certifications ?? [];

  return (
    <>
      <p className="edit-status edit-only" aria-live="polite">
        {status.kind === 'idle' && 'Click any text to edit it. Changes save when you click away.'}
        {status.kind === 'saving' && 'Saving…'}
        {status.kind === 'saved' && 'Saved'}
        {status.kind === 'error' && (
          <>
            {`Couldn't save: ${status.message}`}
            <button type="button" className="edit-ctl" onClick={() => void save(resume)}>
              Retry
            </button>
          </>
        )}
      </p>

      <article className="resume">
        <style>{DOCUMENT_CSS}</style>
        <h1>
          <EditableText value={resume.name} label="Name" onCommit={(v) => change({ ...resume, name: v })} />
        </h1>
        <p className={resume.targetTitle ? 'target' : 'target edit-only'}>
          <EditableText
            value={resume.targetTitle ?? ''}
            label="Target title"
            placeholder="+ Target title"
            onCommit={(v) => change({ ...resume, targetTitle: v })}
          />
        </p>
        <p className="contact">
          {contactFields.map(([k, label], i) => {
            const v = c[k] ?? '';
            return (
              <span key={k} className={v ? undefined : 'edit-only'}>
                {v ? (i > firstFilled ? ' | ' : '') : ' '}
                <EditableText
                  value={v}
                  label={label}
                  placeholder={`+ ${label}`}
                  onCommit={(nv) => change({ ...resume, contact: { ...c, [k]: nv } })}
                />
              </span>
            );
          })}
        </p>

        <section id="sec-summary" className={resume.summary ? undefined : 'edit-only'}>
          <h2>Summary</h2>
          <p>
            <EditableText
              multiline
              value={resume.summary}
              label="Summary"
              placeholder="+ Add a summary"
              render={marked}
              onCommit={(v) => change({ ...resume, summary: v })}
            />
          </p>
        </section>

        <section id="sec-skills" className={resume.skills.length ? undefined : 'edit-only'}>
          <h2>Skills</h2>
          <p>
            {resume.skills.map((s, i) => (
              <span key={i}>
                {i > 0 && ', '}
                <EditableText
                  value={s}
                  label={`Skill ${i + 1}`}
                  onCommit={(v) => change({ ...resume, skills: replaceAt(resume.skills, i, v) })}
                />
                <Ctl label={`Remove skill ${s}`} onClick={() => change({ ...resume, skills: removeAt(resume.skills, i) })}>
                  ×
                </Ctl>
              </span>
            ))}
            <AddText label="Add a skill" onAdd={(v) => change({ ...resume, skills: [...resume.skills, v] })} />
          </p>
        </section>

        <section id="sec-experience">
          <h2>Experience</h2>
          {resume.experience.map((role, i) => (
            <div className="role" key={i}>
              <div className="role-line">
                <span className="role-title">
                  <EditableText value={role.title} label={`Role ${i + 1} title`} onCommit={(v) => setRole(i, { title: v })} />
                </span>
                <span className="role-meta">
                  <EditableText
                    value={role.start}
                    label={`Role ${i + 1} start date`}
                    placeholder="+ Start"
                    onCommit={(v) => setRole(i, { start: v })}
                  />
                  {role.start && role.end ? ' – ' : ' '}
                  <EditableText
                    value={role.end}
                    label={`Role ${i + 1} end date`}
                    placeholder="+ End"
                    onCommit={(v) => setRole(i, { end: v })}
                  />
                </span>
              </div>
              <div className="role-line">
                <span className="company">
                  <EditableText value={role.company} label={`Role ${i + 1} company`} onCommit={(v) => setRole(i, { company: v })} />
                </span>
                <span className="role-meta">
                  <EditableText
                    value={role.location ?? ''}
                    label={`Role ${i + 1} location`}
                    placeholder="+ Location"
                    onCommit={(v) => setRole(i, { location: v })}
                  />
                </span>
              </div>
              <ul>
                {role.bullets.map((b, j) => (
                  <li key={j}>
                    <EditableText
                      multiline
                      value={b}
                      label={`Bullet ${j + 1}, ${role.title} at ${role.company}`}
                      render={marked}
                      onCommit={(v) => setRole(i, { bullets: replaceAt(role.bullets, j, v) })}
                    />
                    <Ctl label="Move bullet up" disabled={j === 0} onClick={() => change(moveBullet(resume, i, j, j - 1))}>
                      ↑
                    </Ctl>
                    <Ctl
                      label="Move bullet down"
                      disabled={j === role.bullets.length - 1}
                      onClick={() => change(moveBullet(resume, i, j, j + 1))}
                    >
                      ↓
                    </Ctl>
                    <Ctl
                      label="Delete bullet"
                      disabled={role.bullets.length === 1}
                      onClick={() => confirmRemove('bullet') && setRole(i, { bullets: removeAt(role.bullets, j) })}
                    >
                      ×
                    </Ctl>
                  </li>
                ))}
                <li className="edit-only">
                  <AddText label="Add a bullet" multiline onAdd={(v) => setRole(i, { bullets: [...role.bullets, v] })} />
                </li>
              </ul>
              <Ctl
                label={`Delete role ${role.title} at ${role.company}`}
                disabled={resume.experience.length === 1}
                onClick={() => confirmRemove('role') && change({ ...resume, experience: removeAt(resume.experience, i) })}
              >
                Delete role
              </Ctl>
            </div>
          ))}
          <AddRole onAdd={(r) => change({ ...resume, experience: [...resume.experience, r] })} />
        </section>

        <section id="sec-education" className={resume.education.length ? undefined : 'edit-only'}>
          <h2>Education</h2>
          {resume.education.map((e, i) => {
            const set = (patch: Partial<Education>) =>
              change({ ...resume, education: replaceAt(resume.education, i, { ...e, ...patch }) });
            return (
              <p key={i}>
                <strong>
                  <EditableText value={e.degree} label={`Degree ${i + 1}`} onCommit={(v) => set({ degree: v })} />
                </strong>
                {', '}
                <EditableText value={e.school} label={`School ${i + 1}`} onCommit={(v) => set({ school: v })} />
                <span className={e.year ? undefined : 'edit-only'}>
                  {', '}
                  <EditableText value={e.year ?? ''} label={`Year ${i + 1}`} placeholder="+ Year" onCommit={(v) => set({ year: v })} />
                </span>
                <Ctl
                  label={`Delete ${e.degree}`}
                  onClick={() => confirmRemove('education entry') && change({ ...resume, education: removeAt(resume.education, i) })}
                >
                  ×
                </Ctl>
              </p>
            );
          })}
          <AddEducation onAdd={(e) => change({ ...resume, education: [...resume.education, e] })} />
        </section>

        <section id="sec-certifications" className={certs.length ? undefined : 'edit-only'}>
          <h2>Certifications</h2>
          <ul>
            {certs.map((x, i) => (
              <li key={i}>
                <EditableText
                  value={x}
                  label={`Certification ${i + 1}`}
                  onCommit={(v) => change({ ...resume, certifications: replaceAt(certs, i, v) })}
                />
                <Ctl label={`Remove ${x}`} onClick={() => change({ ...resume, certifications: removeAt(certs, i) })}>
                  ×
                </Ctl>
              </li>
            ))}
            <li className="edit-only">
              <AddText label="Add a certification" onAdd={(v) => change({ ...resume, certifications: [...certs, v] })} />
            </li>
          </ul>
        </section>
      </article>
    </>
  );
}
