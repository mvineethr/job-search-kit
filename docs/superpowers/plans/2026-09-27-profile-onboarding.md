# Profile Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** New testers set up a profile by giving a résumé and/or LinkedIn export (PDF or data-export zip), or build a résumé from guided questions when they have neither.

**Architecture:** A `profiles` table keyed by `sid` (no real accounts). `/` redirects brand-new sessions to `/start`. Inputs become text through `/api/extract` (which learns LinkedIn zips) and then go through the existing parse path, now shared as `saveMaster()`. The guided builder flattens answers to text, which becomes the source of truth, runs a new `core/resume-build.md` prompt, and passes the result through `verifyTailoring`.

**Tech Stack:** Next.js App Router (read `web/node_modules/next/dist/docs/` before using an unfamiliar API), Neon plain SQL, Zod, Vitest (jsdom), `node:zlib`.

Spec: `docs/superpowers/specs/2026-09-27-profile-onboarding-design.md`

## Global Constraints

- Every SQL query filters by `sid`.
- `core/` is the source of truth for prompts; new capability = `core/<name>.md` + `KNOWN` in `web/lib/prompts.ts`.
- Built résumés must go through `verifyTailoring`. Prompts never suggest a number; missing numbers are the literal `[METRIC NEEDED]`.
- No new npm dependencies.
- Form posts redirect with `redirectTo` / `backWithError` (`web/lib/redirect.ts`), never raw JSON to a browser form.
- Copy: no emoji, no exclamation marks, no "AI-powered", no outcome guarantees. Spacing via `var(--s-N)` tokens only.
- All commands run from `web/`. Tests: `npm test`. Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## File map

| File | Responsibility |
|---|---|
| `web/lib/linkedin-zip.ts` (new) | `unzip`, `parseCsv`, `linkedinZipToText` |
| `web/app/api/extract/route.ts` | + `.zip` branch |
| `web/components/TextOrFileInput.tsx` | label/accept/button props, `useId` ids |
| `web/lib/db.ts` | + `profiles` table |
| `web/lib/save-master.ts` (new) | parse text → insert master résumé |
| `web/lib/profile.ts` (new) | `upsertProfile`, `getProfile` |
| `web/app/api/resumes/route.ts` | uses `saveMaster` |
| `web/app/api/profile/route.ts` (new) | form post from `/start` |
| `web/app/page.tsx` | redirect to `/start`; name on identity card |
| `web/app/start/page.tsx` + `web/components/StartForm.tsx` (new) | onboarding page |
| `web/lib/build-answers.ts` (new) | `BuildAnswersSchema`, `answersToText` |
| `core/resume-build.md` (new) | build prompt |
| `web/app/api/profile/build/route.ts` (new) | JSON post from builder |
| `web/app/start/build/page.tsx` + `web/components/BuildForm.tsx` (new) | guided builder |

---

### Task 1: LinkedIn zip → text

**Files:**
- Create: `web/lib/linkedin-zip.ts`
- Test: `web/test/linkedin-zip.test.ts`

**Interfaces:**
- Consumes: `zip()` from `web/lib/docx.ts` (tests only).
- Produces: `unzip(buf: Buffer, want: (name: string) => boolean): Map<string, Buffer>`, `parseCsv(text: string): Record<string, string>[]`, `linkedinZipToText(buf: Buffer): string`, `NOT_LINKEDIN: string`.

- [ ] **Step 1: Write the failing test**

```ts
// web/test/linkedin-zip.test.ts
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
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npx vitest run test/linkedin-zip.test.ts`
Expected: FAIL, because `@/lib/linkedin-zip` cannot be resolved.

- [ ] **Step 3: Implement**

```ts
// web/lib/linkedin-zip.ts
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
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `npx vitest run test/linkedin-zip.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/linkedin-zip.ts test/linkedin-zip.test.ts
git commit -m "feat(web): read LinkedIn data-export zips into text"
```

---

### Task 2: Accept zips in extract; make the upload input reusable

**Files:**
- Modify: `web/app/api/extract/route.ts`
- Modify: `web/components/TextOrFileInput.tsx`

**Interfaces:**
- Consumes: `linkedinZipToText`, `NOT_LINKEDIN` (Task 1).
- Produces: `TextOrFileInput` props `{ onConfirm: (text: string) => void; label?: string; accept?: string; buttonLabel?: string }`. The defaults keep today's behaviour on `/review`.

- [ ] **Step 1: Add the zip branch to `/api/extract`**

Add `import { linkedinZipToText, NOT_LINKEDIN } from '@/lib/linkedin-zip';` at the top. Insert this directly after the plain-text branch, before the `application/pdf` check:

```ts
  const isZip =
    file.type === 'application/zip' ||
    file.type === 'application/x-zip-compressed' ||
    file.name.toLowerCase().endsWith('.zip');
  if (isZip) {
    try {
      return Response.json({ text: linkedinZipToText(Buffer.from(buffer)), pages: 1 });
    } catch (err) {
      const known = err instanceof Error && (err.message === NOT_LINKEDIN || err.message.startsWith('That '));
      if (!known) console.error('[extract] zip failed', err);
      return Response.json(
        { error: known ? (err as Error).message : 'That zip could not be read. Try the profile PDF instead.' },
        { status: 422 },
      );
    }
  }
```

Change the 415 message to `'Upload a PDF, a text file or a LinkedIn zip, or paste the text instead.'`.

- [ ] **Step 2: Add props to `TextOrFileInput`**

Change the signature and ids (two instances on one page must not share ids):

```tsx
import { useId, useState } from 'react';

const MIN_CHARS = 50;

export default function TextOrFileInput({
  onConfirm,
  label = 'Upload your résumé',
  accept = 'application/pdf,text/plain,text/markdown,.md,.txt',
  buttonLabel = 'Review this résumé',
}: {
  onConfirm: (text: string) => void;
  label?: string;
  accept?: string;
  buttonLabel?: string;
}) {
  const id = useId();
```

Replace `htmlFor="resume-file"`/`id="resume-file"` with `` `${id}-file` ``, `resume-text` with `` `${id}-text` ``, the label text `Upload your résumé` with `{label}`, the `accept` string with `{accept}`, and `'Review this résumé'` with `buttonLabel`.

- [ ] **Step 3: Typecheck and run the tests**

Run: `npx tsc --noEmit && npm test`
Expected: no type errors; all tests pass.

- [ ] **Step 4: Commit**

```bash
git add app/api/extract/route.ts components/TextOrFileInput.tsx
git commit -m "feat(web): accept LinkedIn zips in extract; reusable upload input"
```

---

### Task 3: Profiles table, shared master save, `POST /api/profile`

**Files:**
- Modify: `web/lib/db.ts` (inside `ensureSchema`, before the indexes)
- Create: `web/lib/save-master.ts`, `web/lib/profile.ts`, `web/app/api/profile/route.ts`
- Modify: `web/app/api/resumes/route.ts`

**Interfaces:**
- Produces: `saveMaster(sid: string, text: string, title: string): Promise<{ id: string; content: Resume | null }>`; `upsertProfile(sid: string, name: string, linkedinText?: string | null): Promise<void>`; `getProfile(sid: string): Promise<{ name: string } | null>`.

- [ ] **Step 1: Add the table in `ensureSchema()`** (after the `skill_answers` table)

```ts
  // One row per session: who this is, and the LinkedIn text kept for the LinkedIn feature.
  await q`
    CREATE TABLE IF NOT EXISTS profiles (
      sid           TEXT PRIMARY KEY,
      name          TEXT NOT NULL DEFAULT '',
      linkedin_text TEXT,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;
```

- [ ] **Step 2: Create `web/lib/save-master.ts`** (the body moved out of `/api/resumes`)

```ts
import { randomUUID } from 'node:crypto';
import { ensureSchema, sql } from './db';
import { loadPrompt } from './prompts';
import { completeText } from './provider';
import { extractJsonObject } from './extract-json';
import { ResumeSchema, type Resume } from './resume-schema';

/**
 * Stores text as a master résumé, with a model reading it into sections. Parsing
 * failure is not fatal: the text is kept either way, so the person does not lose
 * what they gave.
 */
export async function saveMaster(
  sid: string,
  text: string,
  title: string,
): Promise<{ id: string; content: Resume | null }> {
  let content: Resume | null = null;
  try {
    const { text: reply } = await completeText({
      system: loadPrompt('resume-parse'),
      tier: 'fast', // transcription needs no deliberation
      messages: [{ role: 'user', content: text }],
    });
    const parsed = ResumeSchema.safeParse(extractJsonObject(reply));
    if (parsed.success) content = parsed.data;
    else console.error('[save-master] parsed JSON did not match the schema');
  } catch (err) {
    console.error('[save-master] parse failed', err);
  }

  await ensureSchema();
  const id = randomUUID();
  await sql()`
    INSERT INTO resumes (id, sid, title, source_text, content)
    VALUES (${id}, ${sid}, ${title}, ${text}, ${content ? JSON.stringify(content) : null})`;
  return { id, content };
}
```

- [ ] **Step 3: Rewrite `web/app/api/resumes/route.ts` to use it**

```ts
import { requireSid } from '@/lib/auth';
import { saveMaster } from '@/lib/save-master';

export const runtime = 'nodejs';
// Fluid Compute gives Hobby up to 300s. Tailoring measured at ~51s on kimi-k3;
// 180 leaves headroom for long résumés while still stopping a runaway request.
export const maxDuration = 180;

/** Saves a pasted or uploaded résumé as a master. */
export async function POST(req: Request) {
  let sid: string;
  try {
    sid = await requireSid();
  } catch {
    return Response.json({ error: 'Sign in first.' }, { status: 401 });
  }

  const form = await req.formData();
  const text = String(form.get('text') ?? '').trim();
  const title = String(form.get('title') ?? '').trim() || 'My résumé';

  if (text.length < 80) {
    return Response.json({ error: 'That looks too short to be a résumé.' }, { status: 400 });
  }

  const { id } = await saveMaster(sid, text, title);
  return new Response(null, { status: 303, headers: { location: new URL(`/resume/${id}`, req.url).toString() } });
}
```

- [ ] **Step 4: Create `web/lib/profile.ts`**

```ts
import { ensureSchema, sql } from './db';

/** A blank name or missing LinkedIn text never overwrites what is already stored. */
export async function upsertProfile(sid: string, name: string, linkedinText?: string | null): Promise<void> {
  await ensureSchema();
  await sql()`
    INSERT INTO profiles (sid, name, linkedin_text)
    VALUES (${sid}, ${name}, ${linkedinText ?? null})
    ON CONFLICT (sid) DO UPDATE SET
      name = CASE WHEN EXCLUDED.name <> '' THEN EXCLUDED.name ELSE profiles.name END,
      linkedin_text = COALESCE(EXCLUDED.linkedin_text, profiles.linkedin_text)`;
}

export async function getProfile(sid: string): Promise<{ name: string } | null> {
  await ensureSchema();
  const rows = (await sql()`SELECT name FROM profiles WHERE sid = ${sid}`) as { name: string }[];
  return rows[0] ?? null;
}
```

- [ ] **Step 5: Create `web/app/api/profile/route.ts`**

```ts
import { requireSid } from '@/lib/auth';
import { saveMaster } from '@/lib/save-master';
import { upsertProfile } from '@/lib/profile';
import { backWithError, redirectTo } from '@/lib/redirect';

export const runtime = 'nodejs';
export const maxDuration = 180;

/**
 * Onboarding. The résumé becomes the master when given; otherwise the LinkedIn
 * text does. LinkedIn text is kept on the profile either way, for the LinkedIn
 * feature — it is never merged into the résumé.
 */
export async function POST(req: Request) {
  let sid: string;
  try {
    sid = await requireSid();
  } catch {
    return redirectTo(req, '/login');
  }

  const form = await req.formData();
  const resumeText = String(form.get('resume_text') ?? '').trim();
  const linkedinText = String(form.get('linkedin_text') ?? '').trim();
  const source = resumeText || linkedinText;

  if (source.length < 80) {
    return backWithError(req, '/start', 'Add a résumé or your LinkedIn, or build one from scratch below.');
  }

  const { id, content } = await saveMaster(sid, source, resumeText ? 'My résumé' : 'From LinkedIn');
  await upsertProfile(sid, content?.name ?? '', linkedinText || null);
  return redirectTo(req, `/resume/${id}`);
}
```

- [ ] **Step 6: Typecheck and run the tests**

Run: `npx tsc --noEmit && npm test`
Expected: no type errors; all tests pass.

- [ ] **Step 7: Commit**

```bash
git add lib/db.ts lib/save-master.ts lib/profile.ts app/api/resumes/route.ts app/api/profile/route.ts
git commit -m "feat(web): profiles table and onboarding save route"
```

---

### Task 4: `/start` page and home redirect

**Files:**
- Create: `web/app/start/page.tsx`, `web/components/StartForm.tsx`
- Modify: `web/app/page.tsx`

**Interfaces:**
- Consumes: `TextOrFileInput` props (Task 2), `POST /api/profile` fields `resume_text`, `linkedin_text` (Task 3), `getProfile` (Task 3), `Elapsed`.

- [ ] **Step 1: Create `web/components/StartForm.tsx`**

```tsx
'use client';

import { useState } from 'react';
import TextOrFileInput from './TextOrFileInput';
import Elapsed from './Elapsed';

function Added({ text, onChange }: { text: string; onChange: () => void }) {
  return (
    <div className="note" style={{ display: 'flex', gap: 'var(--s-3)', alignItems: 'center', flexWrap: 'wrap' }}>
      <span className="tnum">Added · {text.length.toLocaleString()} characters</span>
      <button type="button" className="btn" onClick={onChange}>
        Change
      </button>
    </div>
  );
}

export default function StartForm() {
  const [resume, setResume] = useState<string | null>(null);
  const [linkedin, setLinkedin] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <>
      <div className="sec">
        <div className="sec-head">
          <h2>Your résumé</h2>
        </div>
        {resume ? (
          <Added text={resume} onChange={() => setResume(null)} />
        ) : (
          <TextOrFileInput onConfirm={setResume} buttonLabel="Use this résumé" />
        )}
      </div>

      <div className="sec">
        <div className="sec-head">
          <h2>Your LinkedIn</h2>
        </div>
        <p className="note" style={{ marginBottom: 'var(--s-3)' }}>
          Either the PDF from your profile (More, then Save to PDF) or the zip from Settings, Data
          privacy, Get a copy of your data. With a résumé as well, this is kept for fixing your
          LinkedIn later and does not change the résumé.
        </p>
        {linkedin ? (
          <Added text={linkedin} onChange={() => setLinkedin(null)} />
        ) : (
          <TextOrFileInput
            onConfirm={setLinkedin}
            label="Upload your LinkedIn PDF or zip"
            accept="application/pdf,application/zip,.zip,text/plain,.txt"
            buttonLabel="Use this profile"
          />
        )}
      </div>

      <form method="post" action="/api/profile" onSubmit={() => setBusy(true)} className="sec">
        <input type="hidden" name="resume_text" value={resume ?? ''} />
        <input type="hidden" name="linkedin_text" value={linkedin ?? ''} />
        <button type="submit" className="btn btn-primary" disabled={busy || (!resume && !linkedin)}>
          {busy ? (
            <>
              Reading it… about half a minute
              <Elapsed />
            </>
          ) : (
            'Set up my profile'
          )}
        </button>
      </form>
    </>
  );
}
```

- [ ] **Step 2: Create `web/app/start/page.tsx`**

```tsx
import Link from 'next/link';
import StartForm from '@/components/StartForm';

export default async function StartPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;

  return (
    <div className="wrap" style={{ maxWidth: 720 }}>
      <div className="page-head">
        <h1>Set up your profile</h1>
        <p className="sub">
          Start from what you already have: a résumé, your LinkedIn, or both. Files are turned into
          text and then discarded. Check the text before you continue.
        </p>
      </div>

      {error && (
        <p role="alert" style={{ color: 'var(--danger)', fontSize: 'var(--text-sm)', marginBottom: 'var(--s-4)' }}>
          {error}
        </p>
      )}

      <StartForm />

      <div className="sec">
        <div className="sec-head">
          <h2>No résumé and no LinkedIn?</h2>
        </div>
        <Link href="/start/build" className="entry entry-lead">
          <strong>Build one with me</strong>
          <span>
            Answer a few questions about your work in your own words. They are turned into a résumé,
            and nothing you did not say is added.
          </span>
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Redirect new sessions and show the name on the home page**

In `web/app/page.tsx`: add `import { redirect } from 'next/navigation';` and `import { getProfile } from '@/lib/profile';`. After the `jobs` query, add:

```ts
  const profile = await getProfile(sid);
  // Brand-new session: onboarding first. Anyone who already has a résumé is left alone.
  if (!profile && resumes.length === 0) redirect('/start');

  const displayName = profile?.name || 'Test build';
  const initials =
    profile?.name
      ?.split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase() || 'JS';
```

In the identity card, replace the `JS` avatar text with `{initials}`, `<strong>Test build</strong>` with `<strong>{displayName}</strong>`, and add before the `Switch session` form:

```tsx
        <Link href="/start" className="btn">
          Profile
        </Link>
```

- [ ] **Step 4: Typecheck, test, build**

Run: `npx tsc --noEmit && npm test && npm run build`
Expected: all pass; the build output lists `/start`.

- [ ] **Step 5: Commit**

```bash
git add app/start/page.tsx components/StartForm.tsx app/page.tsx
git commit -m "feat(web): onboarding page for new sessions"
```

---

### Task 5: Builder answers and prompt

**Files:**
- Create: `web/lib/build-answers.ts`, `core/resume-build.md`
- Modify: `web/lib/prompts.ts` (`KNOWN`)
- Test: `web/test/build-answers.test.ts`, `web/test/prompts.test.ts`

**Interfaces:**
- Produces: `BuildAnswersSchema` (Zod), `type BuildAnswers = z.infer<typeof BuildAnswersSchema>`, `type BuildAnswersInput = z.input<typeof BuildAnswersSchema>`, `answersToText(a: BuildAnswers): string`; prompt name `'resume-build'`.

- [ ] **Step 1: Write the failing tests**

```ts
// web/test/build-answers.test.ts
import { describe, it, expect } from 'vitest';
import { BuildAnswersSchema, answersToText } from '@/lib/build-answers';
import { verifyTailoring } from '@/lib/verify-tailoring';
import type { Resume } from '@/lib/resume-schema';

const answers = BuildAnswersSchema.parse({
  name: 'Sam Okafor',
  email: 'sam@example.com',
  roles: [
    { title: 'Shift lead', company: 'Corner Café', start: '2022', end: 'Present', did: 'Ran the morning shift, trained 4 new staff, did the stock orders' },
  ],
  education: [{ degree: 'BTEC Business', school: 'Leeds College' }],
  skills: 'Excel, rota planning',
});

describe('answersToText', () => {
  it('keeps every answer, in the person’s own words', () => {
    const t = answersToText(answers);
    expect(t).toContain('Name: Sam Okafor');
    expect(t).toContain('Company: Corner Café');
    expect(t).toContain('Dates: 2022 – Present');
    expect(t).toContain('trained 4 new staff');
    expect(t).toContain('Education: BTEC Business, Leeds College');
    expect(t).toContain('Skills: Excel, rota planning');
  });
});

describe('BuildAnswersSchema', () => {
  it('needs a name and at least one role with a description', () => {
    expect(BuildAnswersSchema.safeParse({ name: 'X', roles: [] }).success).toBe(false);
    expect(
      BuildAnswersSchema.safeParse({ name: '', roles: [{ title: 'a', company: 'b', did: 'did lots of things' }] }).success,
    ).toBe(false);
  });
});

describe('verifying a built résumé against the answers', () => {
  const built: Resume = {
    name: 'Sam Okafor',
    contact: { email: 'sam@example.com' },
    summary: '',
    skills: ['Excel', 'Salesforce'],
    experience: [
      {
        title: 'Shift lead',
        company: 'Corner Café',
        start: '2022',
        end: 'Present',
        bullets: ['Trained 4 new staff', 'Cut waste by 30%'],
      },
    ],
    education: [],
  };

  it('strips a skill the answers never mention and flags an invented number', () => {
    const { cleaned, audit } = verifyTailoring(built, null, answersToText(answers));
    expect(cleaned.skills).toEqual(['Excel']);
    expect(audit.unsupportedNumbers).toContain('30%');
    expect(audit.unsupportedNumbers).not.toContain('4');
  });
});
```

Append to `web/test/prompts.test.ts` inside the `describe`:

```ts
  it('loads the build prompt with the ATS rules substituted', () => {
    const p = loadPrompt('resume-build');
    expect(p).toContain('Resume Build');
    expect(p).not.toContain('{{ATS_RULES}}');
  });
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `npx vitest run test/build-answers.test.ts test/prompts.test.ts`
Expected: FAIL, because the module is missing and `Unknown capability: resume-build` is thrown.

- [ ] **Step 3: Create `web/lib/build-answers.ts`**

```ts
import { z } from 'zod';

const text = z.string().trim();

/**
 * What the guided builder collects. Flattened by answersToText, that text is the
 * source of truth for the built résumé: the verifier checks the model's output
 * against it, and later tailoring treats it as the original.
 */
export const BuildAnswersSchema = z.object({
  name: text.min(1),
  targetTitle: text.default(''),
  email: text.default(''),
  phone: text.default(''),
  location: text.default(''),
  linkedin: text.default(''),
  roles: z
    .array(
      z.object({
        title: text.min(1),
        company: text.min(1),
        start: text.default(''),
        end: text.default(''),
        did: text.min(10),
      }),
    )
    .min(1),
  education: z
    .array(z.object({ degree: text.min(1), school: text.min(1), year: text.default('') }))
    .default([]),
  skills: text.default(''),
});

export type BuildAnswers = z.infer<typeof BuildAnswersSchema>;
export type BuildAnswersInput = z.input<typeof BuildAnswersSchema>;

export function answersToText(a: BuildAnswers): string {
  const lines = [`Name: ${a.name}`];
  const opt = (label: string, v: string) => {
    if (v) lines.push(`${label}: ${v}`);
  };
  opt('Target title', a.targetTitle);
  opt('Email', a.email);
  opt('Phone', a.phone);
  opt('Location', a.location);
  opt('LinkedIn', a.linkedin);

  for (const r of a.roles) {
    lines.push('', `Role: ${r.title}`, `Company: ${r.company}`);
    const dates = [r.start, r.end].filter(Boolean).join(' – ');
    if (dates) lines.push(`Dates: ${dates}`);
    lines.push(`What I did: ${r.did}`);
  }

  if (a.education.length) lines.push('');
  for (const e of a.education) {
    lines.push(`Education: ${[e.degree, e.school, e.year].filter(Boolean).join(', ')}`);
  }

  if (a.skills) lines.push('', `Skills: ${a.skills}`);
  return lines.join('\n');
}
```

- [ ] **Step 4: Create `core/resume-build.md`**

````markdown
# Resume Build

Someone without a résumé answered questions about their work in their own words. Turn their
answers into a résumé. You are **rephrasing, not adding**: every fact in the résumé must come
from the answers.

## The rules you work within

{{ATS_RULES}}

## What you produce

A single fenced `json` block and nothing else — no preamble, no commentary after it.

```json
{
  "name": "string",
  "targetTitle": "string, optional — only if the answers give one",
  "contact": {
    "location": "string, optional",
    "email": "string, optional",
    "phone": "string, optional",
    "linkedin": "string, optional"
  },
  "summary": "string",
  "skills": ["string"],
  "experience": [
    {
      "title": "string",
      "company": "string",
      "start": "Mon YYYY",
      "end": "Mon YYYY or Present",
      "bullets": ["string"]
    }
  ],
  "education": [{ "degree": "string", "school": "string", "year": "string, optional" }]
}
```

## Rules

- **Only facts the person wrote.** No tools, skills, employers, titles, dates, team sizes or
  results they did not state. If an answer is thin, the bullets are few; do not pad.
- **Bullets:** 2–5 per role, from that role's "What I did" answer. Start each with a strong
  past-tense verb (present tense for a current role). One idea per bullet.
- **Never invent a number.** Keep numbers the person gave, exactly. Where a bullet describes
  an outcome that would normally be measured and no number was given, end the bullet with the
  literal `[METRIC NEEDED]`. Never suggest what the number might be.
- **Skills:** the ones listed, plus tools or skills named in the role answers, spelled as the
  person spelled them. Nothing else.
- **Summary:** one or two sentences built only from the answers. Use an empty string if
  there is too little to say honestly.
- **Dates:** normalise the format only (`Mar 2022`, `2022`, `Present`). Never add a month
  that was not given. If no dates were given, use empty strings.
- **Education and contact details** are transcribed as given; leave out anything not given.
- Roles stay in the order given.
````

- [ ] **Step 5: Register the prompt**

In `web/lib/prompts.ts`, add `'resume-build'` to `KNOWN`:

```ts
const KNOWN = new Set(['resume-review', 'resume-parse', 'resume-build', 'resume-tailor', 'cover-letter', 'job-match', 'metric-questions', 'metric-fill']);
```

- [ ] **Step 6: Run the tests and confirm they pass**

Run: `npx vitest run test/build-answers.test.ts test/prompts.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/build-answers.ts lib/prompts.ts test/build-answers.test.ts test/prompts.test.ts ../core/resume-build.md
git commit -m "feat: resume-build prompt and builder answers"
```

---

### Task 6: `POST /api/profile/build` and the guided builder page

**Files:**
- Create: `web/app/api/profile/build/route.ts`, `web/app/start/build/page.tsx`, `web/components/BuildForm.tsx`

**Interfaces:**
- Consumes: `BuildAnswersSchema`, `BuildAnswersInput`, `answersToText` (Task 5); `upsertProfile` (Task 3); `verifyTailoring(tailored, null, raw)`; `completeText({ system, tier, messages })`; `extractJsonObject`; `ResumeSchema`; `Elapsed`.
- Produces: `POST /api/profile/build` accepting JSON `BuildAnswersInput` → `200 { id }` | `4xx/5xx { error }`.

- [ ] **Step 1: Create the route**

```ts
// web/app/api/profile/build/route.ts
import { randomUUID } from 'node:crypto';
import { requireSid } from '@/lib/auth';
import { ensureSchema, sql } from '@/lib/db';
import { loadPrompt } from '@/lib/prompts';
import { completeText } from '@/lib/provider';
import { extractJsonObject } from '@/lib/extract-json';
import { ResumeSchema } from '@/lib/resume-schema';
import { verifyTailoring } from '@/lib/verify-tailoring';
import { BuildAnswersSchema, answersToText } from '@/lib/build-answers';
import { upsertProfile } from '@/lib/profile';

export const runtime = 'nodejs';
export const maxDuration = 180;

/**
 * Builds a master résumé from guided answers. Called with fetch, not a form post,
 * so a failure leaves the answers on screen. The flattened answers are stored as
 * source_text: they are the person's own words and the original for tailoring.
 */
export async function POST(req: Request) {
  let sid: string;
  try {
    sid = await requireSid();
  } catch {
    return Response.json({ error: 'Sign in first.' }, { status: 401 });
  }

  const parsed = BuildAnswersSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { error: 'Add your name, and for each role a title, company and what you did there.' },
      { status: 400 },
    );
  }
  const answers = parsed.data;
  const source = answersToText(answers);

  try {
    const { text: reply } = await completeText({
      system: loadPrompt('resume-build'),
      tier: 'primary', // writing bullets needs judgment; parse-grade models over-reach
      messages: [{ role: 'user', content: source }],
    });
    const built = ResumeSchema.safeParse(extractJsonObject(reply));
    if (!built.success) throw new Error('built JSON did not match the schema');

    // Anything the answers do not support is removed; the answers are the source.
    const { cleaned } = verifyTailoring(built.data, null, source);

    await ensureSchema();
    const id = randomUUID();
    await sql()`
      INSERT INTO resumes (id, sid, title, source_text, content)
      VALUES (${id}, ${sid}, 'My résumé', ${source}, ${JSON.stringify(cleaned)})`;
    await upsertProfile(sid, answers.name);
    return Response.json({ id });
  } catch (err) {
    console.error('[profile/build] failed', err);
    return Response.json(
      { error: 'The résumé could not be written this time. Your answers are still here — try again.' },
      { status: 502 },
    );
  }
}
```

- [ ] **Step 2: Create `web/components/BuildForm.tsx`**

```tsx
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
```

- [ ] **Step 3: Create `web/app/start/build/page.tsx`**

```tsx
import Link from 'next/link';
import BuildForm from '@/components/BuildForm';

export default function BuildPage() {
  return (
    <div className="wrap" style={{ maxWidth: 720 }}>
      <div className="page-head">
        <h1>Build your résumé</h1>
        <p className="sub">
          A few questions about your work. Your answers are turned into a résumé you can review and
          tailor. Where a number would help and you did not give one, it says [METRIC NEEDED] rather
          than guessing.
        </p>
      </div>
      <BuildForm />
      <p className="note" style={{ marginTop: 'var(--s-6)' }}>
        Have a résumé or LinkedIn after all? <Link href="/start">Start from that instead.</Link>
      </p>
    </div>
  );
}
```

- [ ] **Step 4: Typecheck, test, build**

Run: `npx tsc --noEmit && npm test && npm run build`
Expected: all pass; the build output lists `/start/build` and `/api/profile/build`.

- [ ] **Step 5: Commit**

```bash
git add app/api/profile/build/route.ts app/start/build/page.tsx components/BuildForm.tsx
git commit -m "feat(web): guided résumé builder for people with neither"
```

---

### Task 7: Verify in the browser

Uses `web/.env.local` (present in this worktree) and `.claude/launch.json`.

- [ ] **Step 1:** Start the dev server with `preview_start`, log in (the password is in `.env.local`; type it without printing it), and tick the AI box.
- [ ] **Step 2:** On a fresh session, `/` must land on `/start`. Screenshot it.
- [ ] **Step 3:** Upload a LinkedIn zip built from the Task 1 test data (write it to the scratchpad with a small `node -e` script using `zip()`). The extracted text must appear, and "Set up my profile" must land on `/resume/[id]` with sections parsed. The home card must show the name.
- [ ] **Step 4:** New session (clear the cookie) → `/start/build`. Fill one role with no numbers and write the résumé. It must land on `/resume/[id]`, and the bullets must contain `[METRIC NEEDED]` and no invented skills.
- [ ] **Step 5:** `/start` with nothing added: the button stays disabled. Posting the form empty via `curl.exe` must redirect back with the error.
- [ ] **Step 6:** Check `read_console_messages` and `preview_logs` for errors, and fix any before finishing.
````
