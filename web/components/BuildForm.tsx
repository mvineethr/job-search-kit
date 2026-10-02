'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Elapsed from './Elapsed';
import type { BuildAnswersInput } from '@/lib/build-answers';

type Role = { title: string; company: string; start: string; end: string; did: string };
type Edu = { degree: string; school: string; year: string };

const blankRole: Role = { title: '', company: '', start: '', end: '', did: '' };
const blankEdu: Edu = { degree: '', school: '', year: '' };
const STEPS = ['About you', 'Experience', 'Education and skills'];

function Field({
  label,
  value,
  onChange,
  hint,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  multiline?: boolean;
}) {
  return (
    <label className="field">
      <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>{label}</span>
      {multiline ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={5} />
      ) : (
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} />
      )}
      {hint && <span className="hint">{hint}</span>}
    </label>
  );
}

export default function BuildForm() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [about, setAbout] = useState({ name: '', targetTitle: '', email: '', phone: '', location: '', linkedin: '' });
  const [roles, setRoles] = useState<Role[]>([{ ...blankRole }]);
  const [education, setEducation] = useState<Edu[]>([]);
  const [skills, setSkills] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setRole = (i: number, patch: Partial<Role>) =>
    setRoles((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const setEdu = (i: number, patch: Partial<Edu>) =>
    setEducation((es) => es.map((e, j) => (j === i ? { ...e, ...patch } : e)));

  const stepOk = [
    about.name.trim().length > 0,
    roles.length > 0 && roles.every((r) => r.title.trim() && r.company.trim() && r.did.trim().length >= 10),
    education.every((e) => e.degree.trim() && e.school.trim()),
  ];

  async function submit() {
    setBusy(true);
    setError(null);
    const body: BuildAnswersInput = { ...about, roles, education, skills };
    try {
      const res = await fetch('/api/profile/build', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong.');
      router.push(`/resume/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
      <p className="note tnum">
        Step {step + 1} of {STEPS.length} · {STEPS[step]}
      </p>

      {step === 0 && (
        <>
          <Field label="Your name" value={about.name} onChange={(name) => setAbout({ ...about, name })} />
          <Field
            label="The job title you are aiming for"
            value={about.targetTitle}
            onChange={(targetTitle) => setAbout({ ...about, targetTitle })}
            hint="Optional."
          />
          <Field label="Email" value={about.email} onChange={(email) => setAbout({ ...about, email })} />
          <Field label="Phone" value={about.phone} onChange={(phone) => setAbout({ ...about, phone })} />
          <Field label="Town or city" value={about.location} onChange={(location) => setAbout({ ...about, location })} />
          <Field label="LinkedIn URL" value={about.linkedin} onChange={(linkedin) => setAbout({ ...about, linkedin })} hint="Optional." />
        </>
      )}

      {step === 1 && (
        <>
          <p className="note">
            Most recent first. Include part-time work, volunteering or placements. Write what you did
            the way you would say it out loud; it gets tidied into bullets, and nothing is added.
          </p>
          {roles.map((r, i) => (
            <div key={i} className="note" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
              <Field label="Job title" value={r.title} onChange={(title) => setRole(i, { title })} />
              <Field label="Company or organisation" value={r.company} onChange={(company) => setRole(i, { company })} />
              <div style={{ display: 'flex', gap: 'var(--s-3)', flexWrap: 'wrap' }}>
                <Field label="Started" value={r.start} onChange={(start) => setRole(i, { start })} hint="e.g. Mar 2022" />
                <Field label="Finished" value={r.end} onChange={(end) => setRole(i, { end })} hint="or Present" />
              </div>
              <Field
                label="What did you do there?"
                value={r.did}
                onChange={(did) => setRole(i, { did })}
                hint="Your own words are fine. Include any numbers you know: how many, how much, how often."
                multiline
              />
              {roles.length > 1 && (
                <button type="button" className="btn" style={{ alignSelf: 'flex-start' }} onClick={() => setRoles(roles.filter((_, j) => j !== i))}>
                  Remove this role
                </button>
              )}
            </div>
          ))}
          <button type="button" className="btn" style={{ alignSelf: 'flex-start' }} onClick={() => setRoles([...roles, { ...blankRole }])}>
            Add another role
          </button>
        </>
      )}

      {step === 2 && (
        <>
          {education.map((e, i) => (
            <div key={i} className="note" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
              <Field label="Qualification" value={e.degree} onChange={(degree) => setEdu(i, { degree })} />
              <Field label="School, college or university" value={e.school} onChange={(school) => setEdu(i, { school })} />
              <Field label="Year" value={e.year} onChange={(year) => setEdu(i, { year })} hint="Optional." />
              <button type="button" className="btn" style={{ alignSelf: 'flex-start' }} onClick={() => setEducation(education.filter((_, j) => j !== i))}>
                Remove
              </button>
            </div>
          ))}
          <button type="button" className="btn" style={{ alignSelf: 'flex-start' }} onClick={() => setEducation([...education, { ...blankEdu }])}>
            Add education
          </button>
          <Field
            label="Skills and tools"
            value={skills}
            onChange={setSkills}
            hint="Separate with commas. Only ones you could talk about in an interview."
          />
        </>
      )}

      {error && (
        <p role="alert" style={{ color: 'var(--danger)', fontSize: 'var(--text-sm)' }}>
          {error}
        </p>
      )}

      <div style={{ display: 'flex', gap: 'var(--s-2)', flexWrap: 'wrap' }}>
        {step > 0 && (
          <button type="button" className="btn" disabled={busy} onClick={() => setStep(step - 1)}>
            Back
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button type="button" className="btn btn-primary" disabled={!stepOk[step]} onClick={() => setStep(step + 1)}>
            Next
          </button>
        ) : (
          <button type="button" className="btn btn-primary" disabled={busy || !stepOk.every(Boolean)} onClick={submit}>
            {busy ? (
              <>
                Writing your résumé… about half a minute
                <Elapsed />
              </>
            ) : (
              'Write my résumé'
            )}
          </button>
        )}
      </div>
    </div>
  );
}
