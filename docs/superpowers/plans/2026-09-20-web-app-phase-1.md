# Job Search Kit Web App — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the slice that is a real product on its own — a signed-out user pastes or uploads a résumé, gets an honest review anchored to the document, and exports an ATS-safe PDF.

**Architecture:** A Next.js app in `web/` renders a résumé document from structured JSON. The model never calls tools: it returns JSON (for documents) or structured findings (for reviews), and the server renders deterministically. The eight capability prompts move to `core/` as agent-agnostic Markdown, consumed identically by the existing Claude Code plugin and by this app.

**Tech Stack:** Next.js 15 (App Router) · React 19 · TypeScript · plain CSS with custom properties (no Tailwind) · Zod · Vitest · the `openai` SDK pointed at any OpenAI-compatible base URL · `unpdf` for PDF text extraction.

## Global Constraints

Copied from `docs/superpowers/specs/2026-09-19-web-app-design.md` and `2026-09-19-ux-architecture.md`. Every task's requirements implicitly include these.

- **No tool calling, ever.** Models return text or JSON. All rendering is server-side code.
- **Never fabricate a metric.** A missing number is the literal string `[METRIC NEEDED]` in JSON, rendered as a chip.
- **ATS structure is enforced by the renderer, not the model.** Section headings are exactly `Summary`, `Skills`, `Experience`, `Education`, `Certifications`. Single column. No tables, no images, real selectable text.
- **Uploaded files are parsed to text and discarded.** Never written to disk or a bucket.
- **Design tokens are fixed** — the values in Task 1 come from the UX spec and the approved mockup. Do not invent new colors or spacing values. Spacing set: `4, 8, 12, 16, 24, 32, 48, 64`. Type scale: `12, 14, 16, 18, 22, 28px`. No type larger than 28px anywhere.
- **Copy rules:** no exclamation marks, no emoji in UI chrome, no "AI-powered" framing, buttons are verbs naming the outcome.
- **Model config is environment-driven.** No model ID, base URL, or key is ever hardcoded.
- **Node 20+.** Commit after every task.

---

## File Structure

```
core/                              NEW — agent-agnostic prompt substance
  resume-review.md                 extracted from skills/resume-review/SKILL.md
  ats-rules.md                     symlink target / copy of shared/ats-rules.md

web/                               NEW — the Next.js app
  package.json
  tsconfig.json
  next.config.ts
  vitest.config.ts
  .env.example
  app/
    layout.tsx                     shell, font loading, theme tokens
    page.tsx                       the canvas route (Phase 1 has one screen)
    globals.css                    design tokens + app chrome
    api/
      chat/route.ts                the harness — streams from the provider
      extract/route.ts             uploaded file → plain text
  lib/
    resume-schema.ts               Zod schema + TypeScript types
    render-resume.ts               ResumeJSON → ATS-safe HTML string
    findings-schema.ts             Zod schema for review findings
    prompts.ts                     loads core/*.md at build time
    provider.ts                    OpenAI-compatible client + fallback
  components/
    ResumeDocument.tsx             renders ResumeJSON as the on-screen document
    AssistantPanel.tsx             streaming output, findings, follow-up
    FindingsList.tsx               findings with jump-to-section links
    TextOrFileInput.tsx            paste-or-drop + confirm extracted text
  styles/
    document.css                   the document's own type + print rules
  test/
    fixtures/priya.json            a complete ResumeJSON used across tests
    render-resume.test.ts
    resume-schema.test.ts
    prompts.test.ts
    provider.test.ts
```

**Why `core/` is first.** Today's `SKILL.md` files mix substance with Claude Code mechanics (`${CLAUDE_PLUGIN_ROOT}`, "run `render_pdf.py`"). Those cannot be system prompts. Extracting once means the plugin, this app, and a later MCP server read the same file instead of drifting into three copies.

---

### Task 1: Scaffold the app and lock the design tokens

**Files:**
- Create: `web/package.json`, `web/tsconfig.json`, `web/next.config.ts`, `web/vitest.config.ts`, `web/.env.example`, `web/.gitignore`
- Create: `web/app/layout.tsx`, `web/app/page.tsx`, `web/app/globals.css`

**Interfaces:**
- Consumes: nothing.
- Produces: a running dev server; CSS custom properties every later task styles against.

- [ ] **Step 1: Create the Next.js app**

Run from the repo root:

```bash
npx create-next-app@latest web --typescript --app --eslint --no-tailwind --no-src-dir --import-alias "@/*" --use-npm
```

When prompted about Turbopack, accept the default.

- [ ] **Step 2: Add the test and validation dependencies**

```bash
cd web && npm install zod openai unpdf && npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react
```

- [ ] **Step 3: Create `web/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['test/**/*.test.ts', 'test/**/*.test.tsx'],
  },
  resolve: {
    alias: { '@': fileURLToPath(new URL('.', import.meta.url)) },
  },
});
```

- [ ] **Step 4: Add the test script to `web/package.json`**

In the `"scripts"` block, add:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: Write `web/app/globals.css`**

Replace the generated file entirely. These values are fixed by the spec — do not adjust them.

```css
:root{
  --bg-page:#faf9f7; --bg-surface:#ffffff; --bg-subtle:#f2f0ed;
  --border:#e3e0da; --border-strong:#c9c4bb;
  --text:#1c1b19; --text-muted:#6b665e; --text-faint:#8f8a81;
  --accent:#1f4d7a; --accent-hover:#17395a; --accent-subtle:#e8eef4;
  --warn:#8a6410; --warn-subtle:#fdf4e0;
  --danger:#9b3030; --ok:#3d6b45;

  /* the document is always light — it is going to be printed */
  --doc-bg:#ffffff; --doc-text:#1c1b19; --doc-muted:#6b665e; --doc-border:#e3e0da;

  --shadow:0 1px 3px rgba(28,27,25,.08);
  --sans:'Inter',system-ui,-apple-system,'Segoe UI',sans-serif;
  --serif:'Source Serif 4',Georgia,'Times New Roman',serif;

  --text-xs:.75rem; --text-sm:.875rem; --text-base:1rem;
  --text-lg:1.125rem; --text-xl:1.375rem; --text-2xl:1.75rem;

  --s-1:4px; --s-2:8px; --s-3:12px; --s-4:16px;
  --s-6:24px; --s-8:32px; --s-12:48px; --s-16:64px;
}

@media (prefers-color-scheme:dark){
  :root:not([data-theme="light"]){
    --bg-page:#16161a; --bg-surface:#1e1e23; --bg-subtle:#26262c;
    --border:#33333a; --border-strong:#4a4a53;
    --text:#e8e6e1; --text-muted:#a09b93; --text-faint:#77726b;
    --accent:#7aa8d4; --accent-hover:#9cc0e3; --accent-subtle:#1c2c3c;
    --warn:#d9a84a; --warn-subtle:#2e2717;
    --danger:#d97a7a; --ok:#7fae88;
    --shadow:0 1px 3px rgba(0,0,0,.4);
  }
}
:root[data-theme="dark"]{
  --bg-page:#16161a; --bg-surface:#1e1e23; --bg-subtle:#26262c;
  --border:#33333a; --border-strong:#4a4a53;
  --text:#e8e6e1; --text-muted:#a09b93; --text-faint:#77726b;
  --accent:#7aa8d4; --accent-hover:#9cc0e3; --accent-subtle:#1c2c3c;
  --warn:#d9a84a; --warn-subtle:#2e2717;
  --danger:#d97a7a; --ok:#7fae88;
  --shadow:0 1px 3px rgba(0,0,0,.4);
}

*{box-sizing:border-box}
html,body{padding:0; margin:0}
body{
  background:var(--bg-page); color:var(--text);
  font-family:var(--sans); font-size:var(--text-sm); line-height:1.45;
  -webkit-font-smoothing:antialiased;
}
h1,h2,h3{margin:0; line-height:1.25; font-weight:600; text-wrap:balance}
p{margin:0}
button{font:inherit; color:inherit; cursor:pointer; border:0; background:none; text-align:left}
:focus-visible{outline:2px solid var(--accent); outline-offset:2px; border-radius:2px}
.tnum{font-variant-numeric:tabular-nums}

@media (prefers-reduced-motion:reduce){
  *{animation:none!important; transition:none!important}
}
```

- [ ] **Step 6: Write `web/app/layout.tsx`**

```tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Job Search Kit',
  description: 'Fix your résumé against the jobs you actually want.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 7: Write a placeholder `web/app/page.tsx`**

```tsx
export default function Page() {
  return <main style={{ padding: 'var(--s-8) var(--s-4)' }}>Canvas goes here.</main>;
}
```

- [ ] **Step 8: Create `web/.env.example`**

```bash
# Primary model — an OpenAI-compatible endpoint.
# Verify the current base URL and model id in your provider's dashboard before use.
MODEL_PRIMARY_BASE_URL=
MODEL_PRIMARY_KEY=
MODEL_PRIMARY_NAME=

# Fallback, used ONLY on 429 / 5xx from the primary. Optional.
MODEL_FALLBACK_BASE_URL=
MODEL_FALLBACK_KEY=
MODEL_FALLBACK_NAME=
```

- [ ] **Step 9: Verify the app builds and runs**

```bash
cd web && npm run build
```

Expected: build succeeds with no type errors.

- [ ] **Step 10: Commit**

```bash
git add web/ && git commit -m "feat(web): scaffold Next.js app with design tokens"
```

---

### Task 2: The résumé JSON schema

**Files:**
- Create: `web/lib/resume-schema.ts`
- Create: `web/test/fixtures/priya.json`
- Test: `web/test/resume-schema.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `ResumeSchema` (a Zod schema), `type Resume`, and the constants `SECTION_HEADINGS` and `METRIC_NEEDED`. Every later task imports these.

- [ ] **Step 1: Write the failing test**

Create `web/test/resume-schema.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { ResumeSchema, METRIC_NEEDED } from '@/lib/resume-schema';
import fixture from './fixtures/priya.json';

describe('ResumeSchema', () => {
  it('accepts a complete résumé', () => {
    const parsed = ResumeSchema.safeParse(fixture);
    expect(parsed.success).toBe(true);
  });

  it('rejects a résumé with no name', () => {
    const bad = { ...fixture, name: '' };
    expect(ResumeSchema.safeParse(bad).success).toBe(false);
  });

  it('allows the literal metric-needed marker inside a bullet', () => {
    const withGap = structuredClone(fixture);
    withGap.experience[0].bullets[0] = `Cut deploy time by ${METRIC_NEEDED}.`;
    expect(ResumeSchema.safeParse(withGap).success).toBe(true);
  });

  it('requires at least one bullet per role', () => {
    const bad = structuredClone(fixture);
    bad.experience[0].bullets = [];
    expect(ResumeSchema.safeParse(bad).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

```bash
cd web && npx vitest run test/resume-schema.test.ts
```

Expected: FAIL — cannot resolve `@/lib/resume-schema`.

- [ ] **Step 3: Write `web/lib/resume-schema.ts`**

```ts
import { z } from 'zod';

/** The literal marker used wherever a real number is missing. Never invent one. */
export const METRIC_NEEDED = '[METRIC NEEDED]';

/** Exact headings required by shared/ats-rules.md. The UI must never let a user rename these. */
export const SECTION_HEADINGS = [
  'Summary',
  'Skills',
  'Experience',
  'Education',
  'Certifications',
] as const;

const RoleSchema = z.object({
  title: z.string().min(1),
  company: z.string().min(1),
  location: z.string().optional(),
  start: z.string().min(1), // "Mar 2022"
  end: z.string().min(1),   // "Present"
  bullets: z.array(z.string().min(1)).min(1),
});

const EducationSchema = z.object({
  degree: z.string().min(1),
  school: z.string().min(1),
  year: z.string().optional(),
});

export const ResumeSchema = z.object({
  name: z.string().min(1),
  targetTitle: z.string().optional(),
  contact: z.object({
    location: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    linkedin: z.string().optional(),
  }),
  summary: z.string().min(1),
  skills: z.array(z.string().min(1)),
  experience: z.array(RoleSchema).min(1),
  education: z.array(EducationSchema),
  certifications: z.array(z.string().min(1)).optional(),
});

export type Resume = z.infer<typeof ResumeSchema>;
export type Role = z.infer<typeof RoleSchema>;
```

- [ ] **Step 4: Write `web/test/fixtures/priya.json`**

```json
{
  "name": "Priya Raman",
  "targetTitle": "Site Reliability Engineer",
  "contact": {
    "location": "Austin, TX",
    "email": "priya.raman@example.com",
    "phone": "(512) 555-0142",
    "linkedin": "linkedin.com/in/priyaraman"
  },
  "summary": "Site reliability engineer with eight years running production infrastructure for payments and logistics platforms.",
  "skills": ["Kubernetes", "Terraform", "AWS", "Go", "Python", "Prometheus", "CI/CD"],
  "experience": [
    {
      "title": "Senior Site Reliability Engineer",
      "company": "Meridian Freight",
      "location": "Austin, TX",
      "start": "Mar 2022",
      "end": "Present",
      "bullets": [
        "Rebuilt the deployment pipeline across 40 services, cutting median deploy time from 34 minutes to 6.",
        "Led incident response for the 2024 regional outage; wrote the post-mortem that produced nine follow-up actions."
      ]
    },
    {
      "title": "Site Reliability Engineer",
      "company": "Halcyon Payments",
      "location": "Remote",
      "start": "Jun 2019",
      "end": "Feb 2022",
      "bullets": [
        "Migrated the core ledger service to Kubernetes with zero customer-visible downtime across a six-week cutover.",
        "Introduced error-budget policy for six teams, cutting change-related incidents by 41% year over year."
      ]
    }
  ],
  "education": [
    { "degree": "B.E. Computer Science", "school": "Anna University", "year": "2015" }
  ],
  "certifications": ["Certified Kubernetes Administrator"]
}
```

- [ ] **Step 5: Enable JSON imports in `web/tsconfig.json`**

In `compilerOptions`, ensure `"resolveJsonModule": true` is present.

- [ ] **Step 6: Run the tests to verify they pass**

```bash
cd web && npx vitest run test/resume-schema.test.ts
```

Expected: 4 passed.

- [ ] **Step 7: Commit**

```bash
git add web/lib/resume-schema.ts web/test/ web/tsconfig.json
git commit -m "feat(web): add résumé JSON schema and fixture"
```

---

### Task 3: The ATS renderer

The single most important piece of code in the product. ATS safety becomes a property of this function rather than something a model is asked to remember.

**Files:**
- Create: `web/lib/render-resume.ts`
- Create: `web/styles/document.css`
- Test: `web/test/render-resume.test.ts`

**Interfaces:**
- Consumes: `Resume`, `SECTION_HEADINGS`, `METRIC_NEEDED` from Task 2.
- Produces: `renderResumeHtml(resume: Resume): string` — a complete standalone HTML document string, and `escapeHtml(s: string): string`.

- [ ] **Step 1: Write the failing test**

Create `web/test/render-resume.test.ts`:

```ts
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
```

- [ ] **Step 2: Run it to make sure it fails**

```bash
cd web && npx vitest run test/render-resume.test.ts
```

Expected: FAIL — cannot resolve `@/lib/render-resume`.

- [ ] **Step 3: Write `web/styles/document.css`**

Single column, standard fonts, print rules. Referenced by the renderer and by `ResumeDocument`.

```css
.resume{
  font-family:Georgia,'Times New Roman',serif;
  font-size:11pt; line-height:1.45; color:#1c1b19; background:#ffffff;
  max-width:7.5in; margin:0 auto; padding:0.5in;
}
.resume h1{font-size:20pt; margin:0 0 2pt; font-weight:700}
.resume .target{font-size:11pt; color:#444; margin:0 0 4pt}
.resume .contact{font-size:9.5pt; color:#444; margin:0 0 14pt}
.resume h2{
  font-size:10pt; text-transform:uppercase; letter-spacing:.08em;
  border-bottom:1px solid #999; padding-bottom:2pt; margin:14pt 0 6pt;
}
.resume p, .resume li{margin:0 0 4pt}
.resume ul{margin:4pt 0 0; padding-left:16pt}
.resume .role{margin-bottom:10pt}
.resume .role-line{display:flex; justify-content:space-between; gap:12pt}
.resume .role-title{font-weight:700}
.resume .role-meta{color:#444; font-size:9.5pt; white-space:nowrap}
.resume .metric-needed{
  background:#fdf4e0; color:#8a6410; padding:0 3pt; border-radius:2pt; font-weight:600;
}

@media print{
  @page{margin:0.5in}
  .resume{padding:0; max-width:none}
  .resume .metric-needed{background:none; color:#1c1b19; font-weight:400}
  .resume .role{break-inside:avoid}
  .resume h2{break-after:avoid}
}
```

Note the print rule on `.metric-needed`: the marker stays legible on screen but must not print as a highlighted box on a document someone submits.

- [ ] **Step 4: Write `web/lib/render-resume.ts`**

```ts
import { METRIC_NEEDED, type Resume, type Role } from './resume-schema';

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Escape first, then wrap the metric marker so it is visible but never printed as a box. */
function text(s: string): string {
  return escapeHtml(s).split(escapeHtml(METRIC_NEEDED)).join(
    `<span class="metric-needed">${escapeHtml(METRIC_NEEDED)}</span>`,
  );
}

function renderRole(role: Role): string {
  const loc = role.location ? text(role.location) : '';
  return `
  <div class="role">
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

/** Renders the résumé body. Section order and headings are fixed by shared/ats-rules.md. */
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
<style>__DOCUMENT_CSS__</style>
</head>
<body>
${renderResumeBody(resume)}
</body>
</html>`;
}
```

- [ ] **Step 5: Inline the stylesheet at build time**

Replace the `__DOCUMENT_CSS__` placeholder by importing the CSS as a string. Add to the top of `web/lib/render-resume.ts`:

```ts
import documentCss from '../styles/document.css?raw';
```

And change the `<style>` line in `renderResumeHtml` to:

```ts
<style>${documentCss}</style>
```

Then add to `web/next.config.ts` so `?raw` imports work in the Next build:

```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      '*.css': { loaders: ['raw-loader'], as: '*.js' },
    },
  },
};

export default nextConfig;
```

If that proves awkward, the simpler fallback is to move the CSS into a `export const DOCUMENT_CSS = \`...\`` in `web/styles/document.ts` and import it normally. Prefer whichever builds cleanly; the test asserts behaviour, not mechanism.

- [ ] **Step 6: Run the tests to verify they pass**

```bash
cd web && npx vitest run test/render-resume.test.ts
```

Expected: 6 passed.

- [ ] **Step 7: Commit**

```bash
git add web/lib/render-resume.ts web/styles/ web/test/render-resume.test.ts web/next.config.ts
git commit -m "feat(web): render résumé JSON to ATS-safe HTML"
```

---

### Task 4: The ResumeDocument component

**Files:**
- Create: `web/components/ResumeDocument.tsx`
- Modify: `web/app/page.tsx`

**Interfaces:**
- Consumes: `Resume` and `METRIC_NEEDED` from Task 2, and `styles/document.css` from Task 3. It does **not** use `renderResumeBody` — that function produces the standalone export document, while this component renders React so it can carry section anchors and, in Phase 2, inline editing. The two share the stylesheet, which is what keeps screen and print identical.
- Produces: `<ResumeDocument resume={resume} pendingSections={['Experience']} />`. Every section carries `id="sec-summary"`, `id="sec-skills"`, `id="sec-experience"`, `id="sec-education"`, `id="sec-certifications"` so findings can link to them.

**Note on sequencing:** this component is built before anything generates `ResumeJSON`, and Phase 1's shipping UI displays pasted text instead. That is deliberate — proving the document renders correctly from a fixture de-risks every later task, and it costs one evening. It goes live as the first task of Phase 2.

- [ ] **Step 1: Write `web/components/ResumeDocument.tsx`**

The on-screen document shares the printed document's structure so what is seen is what prints. It renders React rather than reusing the HTML string, because it needs section anchors and, later, inline editing.

```tsx
import { METRIC_NEEDED, type Resume, type Role } from '@/lib/resume-schema';
import '@/styles/document.css';

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
```

- [ ] **Step 2: Render the fixture on the page**

Replace `web/app/page.tsx`:

```tsx
import ResumeDocument from '@/components/ResumeDocument';
import { ResumeSchema } from '@/lib/resume-schema';
import fixture from '@/test/fixtures/priya.json';

export default function Page() {
  const resume = ResumeSchema.parse(fixture);
  return (
    <main style={{ padding: 'var(--s-6) var(--s-4)' }}>
      <ResumeDocument resume={resume} />
    </main>
  );
}
```

- [ ] **Step 3: Look at it**

```bash
cd web && npm run dev
```

Open http://localhost:3000. Expected: a single-column résumé, serif, readable, one column at every window width. Check it at a phone width (~400px) — the role lines must wrap rather than overflow.

- [ ] **Step 4: Verify the build is clean**

```bash
cd web && npm run build
```

Expected: success, no type errors.

- [ ] **Step 5: Commit**

```bash
git add web/components/ResumeDocument.tsx web/app/page.tsx
git commit -m "feat(web): render the résumé document on screen"
```

---

### Task 5: Extract the prompt substance into `core/`

**Files:**
- Create: `core/resume-review.md`
- Create: `core/ats-rules.md`
- Create: `web/lib/prompts.ts`
- Modify: `skills/resume-review/SKILL.md`
- Test: `web/test/prompts.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `loadPrompt(name: string): string` — returns the core Markdown with `{{ATS_RULES}}` already substituted. Throws on an unknown name.

- [ ] **Step 1: Write `core/ats-rules.md`**

Copy `shared/ats-rules.md` verbatim, then delete the "File / output" section — it describes running a Python script, which is Claude Code mechanics, not substance. Keep every Layout, Content, Theming and Banned rule exactly as written.

- [ ] **Step 2: Write `core/resume-review.md`**

The substance of `skills/resume-review/SKILL.md` with the agent mechanics removed and the output contract made explicit. Note the structured findings requirement — the UI anchors each finding to a section.

````markdown
# Resume Review

A no-flattery diagnostic of an existing resume. **Do not rewrite anything** — find problems only.

## The rules you judge against

{{ATS_RULES}}

## What you produce

First, a short prose verdict addressed to the person. Then a fenced `json` block, and nothing after it.

The JSON is an array of findings:

```json
[
  {
    "section": "summary" | "skills" | "experience" | "education" | "certifications" | "document",
    "severity": "critical" | "worth-fixing",
    "finding": "One or two sentences. Quote their actual words back."
  }
]
```

Order findings worst-first. Between four and twelve of them.

## What to look for

1. **Verdict** — would this pass a six-second recruiter scan and an ATS parse?
2. **Identity** — what role does this resume currently read as?
3. **Bullet quality** — quote the weakest bullets verbatim and say why: no number, vague verb, responsibility rather than achievement.
4. **Metric coverage** — what proportion of bullets carry a real number.
5. **ATS risks** — non-standard headings, abbreviations, anything that parses badly.
6. **Formatting, length, ordering** — one page? reverse-chronological? consistent dates?

## Rules

- Quote the person's actual lines back to them. Do not soften.
- Never fabricate. Where a metric is missing, say it is missing — never invent one.
- Write plainly and in the second person. No exclamation marks. Criticism is specific and attached to a fix.
- You are reviewing, not rewriting. Do not produce improved bullets here.
````

- [ ] **Step 3: Point the existing skill at the core file**

Edit `skills/resume-review/SKILL.md`, keeping its frontmatter unchanged, and replace the body below the frontmatter with:

```markdown
# Resume Review (diagnose, don't rewrite)

Read and follow `${CLAUDE_PLUGIN_ROOT}/core/resume-review.md`. It is the single source of
truth for this capability and is shared with the web app.

Where that file says `{{ATS_RULES}}`, read `${CLAUDE_PLUGIN_ROOT}/core/ats-rules.md`.

**Additional instructions for Claude Code only:**

- Read the user's resume from the filesystem when they name a path.
- Present the prose verdict directly. You may render the findings as a readable list
  rather than raw JSON, since there is no UI here to consume the JSON.
```

- [ ] **Step 4: Write the failing test**

Create `web/test/prompts.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { loadPrompt } from '@/lib/prompts';

describe('loadPrompt', () => {
  it('loads the review prompt', () => {
    const p = loadPrompt('resume-review');
    expect(p).toContain('Resume Review');
  });

  it('substitutes the ATS rules into the prompt', () => {
    const p = loadPrompt('resume-review');
    expect(p).not.toContain('{{ATS_RULES}}');
    expect(p).toContain('Single column only');
  });

  it('throws on an unknown capability rather than returning an empty prompt', () => {
    expect(() => loadPrompt('does-not-exist')).toThrow();
  });
});
```

- [ ] **Step 5: Run it to make sure it fails**

```bash
cd web && npx vitest run test/prompts.test.ts
```

Expected: FAIL — cannot resolve `@/lib/prompts`.

- [ ] **Step 6: Write `web/lib/prompts.ts`**

```ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const CORE_DIR = join(process.cwd(), '..', 'core');

/** Capabilities the web app can run. Adding one means adding a core/<name>.md file. */
const KNOWN = new Set(['resume-review']);

const cache = new Map<string, string>();

export function loadPrompt(name: string): string {
  if (!KNOWN.has(name)) {
    throw new Error(`Unknown capability: ${name}`);
  }
  const cached = cache.get(name);
  if (cached) return cached;

  const body = readFileSync(join(CORE_DIR, `${name}.md`), 'utf8');
  const rules = readFileSync(join(CORE_DIR, 'ats-rules.md'), 'utf8');
  const resolved = body.split('{{ATS_RULES}}').join(rules);

  cache.set(name, resolved);
  return resolved;
}
```

Note: `process.cwd()` is `web/` in both dev and the Vercel build, so `../core` resolves. Task 10 verifies this holds on Vercel, where `core/` must be included in the deployment.

- [ ] **Step 7: Run the tests to verify they pass**

```bash
cd web && npx vitest run test/prompts.test.ts
```

Expected: 3 passed.

- [ ] **Step 8: Commit**

```bash
git add core/ web/lib/prompts.ts web/test/prompts.test.ts skills/resume-review/SKILL.md
git commit -m "feat: extract resume-review substance into core/"
```

---

### Task 6: The model provider with fallback

**Files:**
- Create: `web/lib/provider.ts`
- Test: `web/test/provider.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `streamCompletion(opts): Promise<{ stream: AsyncIterable<string>; degraded: boolean }>` where `opts` is `{ system: string; messages: Array<{ role: 'user' | 'assistant'; content: string }> }`. `degraded` is `true` when the fallback served the request.

- [ ] **Step 1: Write the failing test**

Create `web/test/provider.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { shouldFallback, pickConfig } from '@/lib/provider';

describe('shouldFallback', () => {
  it('falls back on rate limiting', () => {
    expect(shouldFallback({ status: 429 })).toBe(true);
  });

  it('falls back on server errors', () => {
    expect(shouldFallback({ status: 503 })).toBe(true);
  });

  it('does NOT fall back on a bad request — that is our bug, not theirs', () => {
    expect(shouldFallback({ status: 400 })).toBe(false);
  });

  it('does NOT fall back on a bad key', () => {
    expect(shouldFallback({ status: 401 })).toBe(false);
  });

  it('falls back on a network error with no status', () => {
    expect(shouldFallback({})).toBe(true);
  });
});

describe('pickConfig', () => {
  beforeEach(() => {
    vi.stubEnv('MODEL_PRIMARY_BASE_URL', 'https://primary.example/v1');
    vi.stubEnv('MODEL_PRIMARY_KEY', 'k1');
    vi.stubEnv('MODEL_PRIMARY_NAME', 'model-one');
  });

  it('reads the primary from the environment', () => {
    const c = pickConfig('primary');
    expect(c.model).toBe('model-one');
    expect(c.baseURL).toBe('https://primary.example/v1');
  });

  it('returns null when no fallback is configured, rather than guessing one', () => {
    vi.stubEnv('MODEL_FALLBACK_BASE_URL', '');
    vi.stubEnv('MODEL_FALLBACK_KEY', '');
    vi.stubEnv('MODEL_FALLBACK_NAME', '');
    expect(pickConfig('fallback')).toBeNull();
  });

  it('throws when the primary is unconfigured rather than failing silently at request time', () => {
    vi.stubEnv('MODEL_PRIMARY_KEY', '');
    expect(() => pickConfig('primary')).toThrow();
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

```bash
cd web && npx vitest run test/provider.test.ts
```

Expected: FAIL — cannot resolve `@/lib/provider`.

- [ ] **Step 3: Write `web/lib/provider.ts`**

```ts
import OpenAI from 'openai';

export type Tier = 'primary' | 'fallback';

export type ProviderConfig = {
  baseURL: string;
  apiKey: string;
  model: string;
};

export type ChatMessage = { role: 'user' | 'assistant'; content: string };

/**
 * Fall back only when the primary is unavailable — rate limited, down, or unreachable.
 * A 4xx that is not 429 means we sent something wrong; retrying elsewhere would hide our bug.
 */
export function shouldFallback(err: { status?: number }): boolean {
  const status = err?.status;
  if (status === undefined) return true; // network-level failure
  if (status === 429) return true;
  return status >= 500;
}

export function pickConfig(tier: Tier): ProviderConfig | null {
  const prefix = tier === 'primary' ? 'MODEL_PRIMARY' : 'MODEL_FALLBACK';
  const baseURL = process.env[`${prefix}_BASE_URL`] ?? '';
  const apiKey = process.env[`${prefix}_KEY`] ?? '';
  const model = process.env[`${prefix}_NAME`] ?? '';

  if (!baseURL || !apiKey || !model) {
    if (tier === 'primary') {
      throw new Error(
        'Primary model is not configured. Set MODEL_PRIMARY_BASE_URL, MODEL_PRIMARY_KEY and MODEL_PRIMARY_NAME.',
      );
    }
    return null; // a fallback is optional
  }
  return { baseURL, apiKey, model };
}

async function* toTextStream(
  stream: AsyncIterable<{ choices: Array<{ delta?: { content?: string | null } }> }>,
): AsyncIterable<string> {
  for await (const chunk of stream) {
    const piece = chunk.choices[0]?.delta?.content;
    if (piece) yield piece;
  }
}

async function open(config: ProviderConfig, system: string, messages: ChatMessage[]) {
  const client = new OpenAI({ apiKey: config.apiKey, baseURL: config.baseURL });
  return client.chat.completions.create({
    model: config.model,
    stream: true,
    messages: [{ role: 'system', content: system }, ...messages],
  });
}

export async function streamCompletion(opts: {
  system: string;
  messages: ChatMessage[];
}): Promise<{ stream: AsyncIterable<string>; degraded: boolean }> {
  const primary = pickConfig('primary')!;
  try {
    const s = await open(primary, opts.system, opts.messages);
    return { stream: toTextStream(s), degraded: false };
  } catch (err) {
    if (!shouldFallback(err as { status?: number })) throw err;

    const fallback = pickConfig('fallback');
    if (!fallback) throw err;

    const s = await open(fallback, opts.system, opts.messages);
    return { stream: toTextStream(s), degraded: true };
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
cd web && npx vitest run test/provider.test.ts
```

Expected: 8 passed.

- [ ] **Step 5: Commit**

```bash
git add web/lib/provider.ts web/test/provider.test.ts
git commit -m "feat(web): model provider with fallback on 429 and 5xx"
```

---

### Task 7: The chat route

**Files:**
- Create: `web/app/api/chat/route.ts`
- Create: `web/lib/findings-schema.ts`
- Test: `web/test/findings-schema.test.ts`

**Interfaces:**
- Consumes: `loadPrompt` (Task 5), `streamCompletion` (Task 6).
- Produces: `POST /api/chat` taking `{ capability: string; messages: ChatMessage[] }` and returning a `text/plain` stream. The header `x-degraded: true` is set when a fallback served it. Also produces `parseFindings(text: string): Finding[]` and `type Finding`.

- [ ] **Step 1: Write the failing test**

Create `web/test/findings-schema.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parseFindings } from '@/lib/findings-schema';

const good = `Your résumé reads as a list of duties.

\`\`\`json
[
  { "section": "summary", "severity": "critical", "finding": "Your summary names a title, not a person." },
  { "section": "experience", "severity": "worth-fixing", "finding": "Three bullets carry no number." }
]
\`\`\``;

describe('parseFindings', () => {
  it('pulls findings out of a fenced json block', () => {
    const f = parseFindings(good);
    expect(f).toHaveLength(2);
    expect(f[0].section).toBe('summary');
    expect(f[0].severity).toBe('critical');
  });

  it('returns an empty array when the model produced no json block', () => {
    expect(parseFindings('Looks fine to me.')).toEqual([]);
  });

  it('returns an empty array for malformed json rather than throwing mid-stream', () => {
    expect(parseFindings('```json\n[{ broken \n```')).toEqual([]);
  });

  it('drops findings with an unknown section instead of rendering an unanchored one', () => {
    const odd = '```json\n[{"section":"hobbies","severity":"critical","finding":"x"}]\n```';
    expect(parseFindings(odd)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

```bash
cd web && npx vitest run test/findings-schema.test.ts
```

Expected: FAIL — cannot resolve `@/lib/findings-schema`.

- [ ] **Step 3: Write `web/lib/findings-schema.ts`**

```ts
import { z } from 'zod';

export const FindingSchema = z.object({
  section: z.enum([
    'summary',
    'skills',
    'experience',
    'education',
    'certifications',
    'document',
  ]),
  severity: z.enum(['critical', 'worth-fixing']),
  finding: z.string().min(1),
});

export type Finding = z.infer<typeof FindingSchema>;

const FENCE = /```json\s*([\s\S]*?)```/;

/**
 * Findings arrive at the end of a streamed prose answer, inside a fenced json block.
 * Anything unparseable yields an empty array — the prose is still useful on its own,
 * and throwing here would blank a review the user already watched arrive.
 */
export function parseFindings(text: string): Finding[] {
  const match = text.match(FENCE);
  if (!match) return [];
  try {
    const raw = JSON.parse(match[1]);
    const parsed = z.array(FindingSchema).safeParse(raw);
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

/** The prose half, with the json block removed, for display. */
export function stripFindings(text: string): string {
  return text.replace(FENCE, '').trim();
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
cd web && npx vitest run test/findings-schema.test.ts
```

Expected: 4 passed.

- [ ] **Step 5: Write `web/app/api/chat/route.ts`**

```ts
import { loadPrompt } from '@/lib/prompts';
import { streamCompletion, type ChatMessage } from '@/lib/provider';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: Request) {
  let body: { capability?: string; messages?: ChatMessage[] };
  try {
    body = await req.json();
  } catch {
    return new Response('Malformed request body.', { status: 400 });
  }

  const { capability, messages } = body;
  if (!capability || !Array.isArray(messages) || messages.length === 0) {
    return new Response('A capability and at least one message are required.', { status: 400 });
  }

  let system: string;
  try {
    system = loadPrompt(capability);
  } catch {
    return new Response(`Unknown capability: ${capability}`, { status: 404 });
  }

  let result: Awaited<ReturnType<typeof streamCompletion>>;
  try {
    result = await streamCompletion({ system, messages });
  } catch {
    return new Response(
      'That did not go through. Your résumé is unchanged — try again in a moment.',
      { status: 502 },
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const piece of result.stream) {
          controller.enqueue(encoder.encode(piece));
        }
      } catch {
        controller.enqueue(encoder.encode('\n\n[The connection dropped before this finished.]'));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-store',
      'x-degraded': String(result.degraded),
    },
  });
}
```

- [ ] **Step 6: Verify the route by hand**

Fill in `web/.env.local` from `.env.example` with a real key, then:

```bash
cd web && npm run dev
```

In another terminal:

```bash
curl -N -X POST http://localhost:3000/api/chat -H 'content-type: application/json' -d '{"capability":"resume-review","messages":[{"role":"user","content":"Summary: Passionate engineer. Experience: Responsible for servers."}]}'
```

Expected: prose streams in, followed by a fenced `json` block of findings.

- [ ] **Step 7: Verify the unknown-capability path**

```bash
curl -i -X POST http://localhost:3000/api/chat -H 'content-type: application/json' -d '{"capability":"nope","messages":[{"role":"user","content":"x"}]}'
```

Expected: `HTTP/1.1 404`.

- [ ] **Step 8: Commit**

```bash
git add web/app/api/chat/ web/lib/findings-schema.ts web/test/findings-schema.test.ts
git commit -m "feat(web): streaming chat route with structured findings"
```

---

### Task 8: Upload, extract, confirm

The confirm step exists because silent PDF extraction produces a confidently wrong review, and the user has no way to know why.

**Files:**
- Create: `web/app/api/extract/route.ts`
- Create: `web/components/TextOrFileInput.tsx`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `POST /api/extract` taking `multipart/form-data` with a `file` field, returning `{ text: string; pages: number }`. And `<TextOrFileInput onConfirm={(text: string) => void} />`.

- [ ] **Step 1: Write `web/app/api/extract/route.ts`**

```ts
import { extractText, getDocumentProxy } from 'unpdf';

export const runtime = 'nodejs';
export const maxDuration = 30;

const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get('file');

  if (!(file instanceof File)) {
    return Response.json({ error: 'No file was attached.' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: 'That file is larger than 5MB.' }, { status: 413 });
  }

  const buffer = new Uint8Array(await file.arrayBuffer());

  // Plain text files need no extraction.
  if (file.type.startsWith('text/')) {
    return Response.json({ text: new TextDecoder().decode(buffer), pages: 1 });
  }

  if (file.type !== 'application/pdf') {
    return Response.json(
      { error: 'Upload a PDF or a text file, or paste the text instead.' },
      { status: 415 },
    );
  }

  try {
    const pdf = await getDocumentProxy(buffer);
    const { text, totalPages } = await extractText(pdf, { mergePages: true });
    return Response.json({ text: String(text), pages: totalPages });
  } catch {
    return Response.json(
      { error: "That PDF could not be read. Paste the text instead — it works just as well." },
      { status: 422 },
    );
  }
  // The buffer goes out of scope here. Nothing is written to disk or to storage.
}
```

- [ ] **Step 2: Write `web/components/TextOrFileInput.tsx`**

```tsx
'use client';

import { useState } from 'react';

export default function TextOrFileInput({
  onConfirm,
}: {
  onConfirm: (text: string) => void;
}) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extracted, setExtracted] = useState(false);

  async function handleFile(file: File) {
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/extract', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'That file could not be read.');
        return;
      }
      setText(data.text);
      setExtracted(true);
    } catch {
      setError('That file could not be read. Paste the text instead.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
      <label htmlFor="resume-text" style={{ fontWeight: 500 }}>
        Paste your résumé, or drop the file
      </label>

      <input
        id="resume-file"
        type="file"
        accept="application/pdf,text/plain,text/markdown"
        aria-label="Upload your résumé"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
        }}
      />

      <textarea
        id="resume-text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={14}
        placeholder="Paste the whole thing…"
        style={{
          font: 'inherit',
          padding: 'var(--s-3)',
          borderRadius: 4,
          border: '1px solid var(--border-strong)',
          background: 'var(--bg-page)',
          color: 'var(--text)',
        }}
      />

      {extracted && (
        <p
          style={{
            fontSize: 'var(--text-xs)',
            color: 'var(--warn)',
            background: 'var(--warn-subtle)',
            padding: 'var(--s-2) var(--s-3)',
            borderRadius: 4,
          }}
        >
          This is what came out of your file. PDF extraction mangles things — read it over and
          fix anything wrong before continuing.
        </p>
      )}

      {error && (
        <p role="alert" style={{ fontSize: 'var(--text-xs)', color: 'var(--danger)' }}>
          {error}
        </p>
      )}

      <button
        type="button"
        disabled={busy || text.trim().length < 50}
        onClick={() => onConfirm(text)}
        style={{
          padding: 'var(--s-2) var(--s-3)',
          borderRadius: 4,
          background: 'var(--accent)',
          color: '#fff',
          alignSelf: 'flex-start',
          opacity: busy || text.trim().length < 50 ? 0.5 : 1,
        }}
      >
        {busy ? 'Reading your file…' : 'Review this résumé'}
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Verify extraction by hand**

With the dev server running, export any résumé or document to PDF and:

```bash
curl -X POST http://localhost:3000/api/extract -F "file=@/path/to/some.pdf"
```

Expected: JSON with a `text` field containing readable text and a `pages` count.

- [ ] **Step 4: Verify the rejection path**

```bash
curl -i -X POST http://localhost:3000/api/extract -F "file=@/path/to/image.png"
```

Expected: `415` with the message about pasting text instead.

- [ ] **Step 5: Commit**

```bash
git add web/app/api/extract/ web/components/TextOrFileInput.tsx
git commit -m "feat(web): extract uploaded résumés to text with a confirm step"
```

---

### Task 9: Wire the review flow end to end

**Files:**
- Create: `web/components/FindingsList.tsx`
- Create: `web/components/AssistantPanel.tsx`
- Modify: `web/app/page.tsx`

**Interfaces:**
- Consumes: `TextOrFileInput` (Task 8), `parseFindings` / `stripFindings` (Task 7), `ResumeDocument` (Task 4).
- Produces: the working product — paste, review, jump to the criticised section.

- [ ] **Step 1: Write `web/components/FindingsList.tsx`**

```tsx
'use client';

import type { Finding } from '@/lib/findings-schema';

const SECTION_LABEL: Record<Finding['section'], string> = {
  summary: 'Summary',
  skills: 'Skills',
  experience: 'Experience',
  education: 'Education',
  certifications: 'Certifications',
  document: 'Whole document',
};

function jump(section: Finding['section']) {
  if (section === 'document') return;
  const el = document.getElementById(`sec-${section}`);
  if (!el) return;
  el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  el.style.outline = '2px solid var(--accent)';
  el.style.outlineOffset = '8px';
  window.setTimeout(() => {
    el.style.outline = '';
    el.style.outlineOffset = '';
  }, 2200);
}

export default function FindingsList({ findings }: { findings: Finding[] }) {
  if (findings.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
      {findings.map((f, i) => (
        <div
          key={i}
          style={{
            border: '1px solid var(--border)',
            borderLeft: `3px solid ${f.severity === 'critical' ? 'var(--danger)' : 'var(--warn)'}`,
            borderRadius: 4,
            padding: 'var(--s-3)',
            background: 'var(--bg-page)',
          }}
        >
          <p
            style={{
              fontSize: 'var(--text-xs)',
              textTransform: 'uppercase',
              letterSpacing: '.06em',
              color: 'var(--text-faint)',
              marginBottom: 'var(--s-1)',
            }}
          >
            {f.severity === 'critical' ? 'Critical' : 'Worth fixing'} · {SECTION_LABEL[f.section]}
          </p>
          <p style={{ marginBottom: 'var(--s-2)' }}>{f.finding}</p>
          {f.section !== 'document' && (
            <button
              onClick={() => jump(f.section)}
              style={{
                fontSize: 'var(--text-xs)',
                color: 'var(--accent)',
                fontWeight: 500,
                textDecoration: 'underline',
                textUnderlineOffset: 2,
                padding: 0,
              }}
            >
              Jump to {SECTION_LABEL[f.section]}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Write `web/components/AssistantPanel.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { parseFindings, stripFindings, type Finding } from '@/lib/findings-schema';
import FindingsList from './FindingsList';

export default function AssistantPanel({ resumeText }: { resumeText: string }) {
  const [raw, setRaw] = useState('');
  const [findings, setFindings] = useState<Finding[]>([]);
  const [running, setRunning] = useState(false);
  const [degraded, setDegraded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [controller, setController] = useState<AbortController | null>(null);

  async function run() {
    const ac = new AbortController();
    setController(ac);
    setRunning(true);
    setRaw('');
    setFindings([]);
    setError(null);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          capability: 'resume-review',
          messages: [{ role: 'user', content: resumeText }],
        }),
        signal: ac.signal,
      });

      if (!res.ok || !res.body) {
        setError(await res.text());
        return;
      }
      setDegraded(res.headers.get('x-degraded') === 'true');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setRaw(acc);
      }
      setFindings(parseFindings(acc));
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        setError('That did not finish. Your résumé is unchanged — try again?');
      }
    } finally {
      setRunning(false);
      setController(null);
    }
  }

  return (
    <aside
      style={{
        border: '1px solid var(--border)',
        borderRadius: 8,
        background: 'var(--bg-surface)',
        padding: 'var(--s-4)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--s-4)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-2)' }}>
        <h2 style={{ fontSize: 'var(--text-sm)' }}>Review</h2>
        {running && (
          <button onClick={() => controller?.abort()} style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}>
            Cancel
          </button>
        )}
      </div>

      {!running && raw === '' && (
        <button
          onClick={run}
          style={{
            padding: 'var(--s-2) var(--s-3)',
            borderRadius: 4,
            background: 'var(--accent)',
            color: '#fff',
            alignSelf: 'flex-start',
          }}
        >
          Review this résumé
        </button>
      )}

      {degraded && (
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--warn)' }}>
          Served by a backup model — the output may be weaker. Re-run for a better one.
        </p>
      )}

      <div aria-live="polite" aria-busy={running} style={{ whiteSpace: 'pre-wrap' }}>
        {stripFindings(raw)}
      </div>

      <FindingsList findings={findings} />

      {error && (
        <p role="alert" style={{ color: 'var(--danger)', fontSize: 'var(--text-xs)' }}>
          {error}
        </p>
      )}
    </aside>
  );
}
```

- [ ] **Step 3: Wire the page**

Replace `web/app/page.tsx`:

```tsx
'use client';

import { useState } from 'react';
import TextOrFileInput from '@/components/TextOrFileInput';
import AssistantPanel from '@/components/AssistantPanel';

export default function Page() {
  const [resumeText, setResumeText] = useState<string | null>(null);

  if (!resumeText) {
    return (
      <main style={{ maxWidth: 720, margin: '0 auto', padding: 'var(--s-8) var(--s-4)' }}>
        <h1 style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--s-2)' }}>
          Find out what is wrong with your résumé
        </h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--s-6)' }}>
          An honest read, anchored to the parts that need work. Nothing is rewritten and nothing
          is stored.
        </p>
        <TextOrFileInput onConfirm={setResumeText} />
      </main>
    );
  }

  return (
    <main
      style={{
        maxWidth: 1200,
        margin: '0 auto',
        padding: 'var(--s-6) var(--s-4)',
        display: 'grid',
        gap: 'var(--s-6)',
        gridTemplateColumns: 'minmax(0,1fr) 380px',
        alignItems: 'start',
      }}
    >
      <article
        id="resume-plain"
        style={{
          background: 'var(--doc-bg)',
          color: 'var(--doc-text)',
          border: '1px solid var(--doc-border)',
          borderRadius: 8,
          padding: 'var(--s-12)',
          whiteSpace: 'pre-wrap',
          fontFamily: 'var(--serif)',
          lineHeight: 1.6,
        }}
      >
        {resumeText}
      </article>
      <AssistantPanel resumeText={resumeText} />
    </main>
  );
}
```

Note: Phase 1 displays the pasted text as-is rather than parsed JSON. Parsing text into `ResumeJSON` is the first task of Phase 2, which is also what makes `ResumeDocument` and section anchors live. Findings still reference sections by name, so the jump links become functional the moment Phase 2 lands.

- [ ] **Step 4: Add the responsive rule**

Append to `web/app/globals.css`:

```css
@media (max-width:1023px){
  main{grid-template-columns:1fr!important}
}
```

- [ ] **Step 5: Walk the whole flow**

```bash
cd web && npm run dev
```

Paste a weak résumé. Expected: the review streams in, findings render with severity stripes, and Cancel aborts mid-run. Check it at 400px wide — one column, no horizontal scroll.

- [ ] **Step 6: Run the whole test suite**

```bash
cd web && npm test
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add web/components/ web/app/page.tsx web/app/globals.css
git commit -m "feat(web): review flow end to end"
```

---

### Task 10: Ship it

**Files:**
- Create: `web/README.md`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: everything above.
- Produces: a live URL.

- [ ] **Step 1: Ignore local env files**

Append to the repo-root `.gitignore`:

```
web/.env.local
web/.next/
web/node_modules/
```

- [ ] **Step 2: Write `web/README.md`**

```markdown
# Job Search Kit — web

The hosted version. Runs the same capability prompts as the Claude Code plugin,
read from `core/` at the repo root.

## Local development

    cp .env.example .env.local   # fill in your model credentials
    npm install
    npm run dev

## Tests

    npm test

## Deployment

Vercel, root directory `web/`. `core/` must be present in the deployment —
it sits outside `web/`, so the project's root directory setting must be the
repo root with `web` as the app directory, or `core/` must be copied in at
build time.

## Environment

| Variable | Meaning |
|---|---|
| `MODEL_PRIMARY_BASE_URL` | OpenAI-compatible endpoint |
| `MODEL_PRIMARY_KEY` | its key |
| `MODEL_PRIMARY_NAME` | the model id |
| `MODEL_FALLBACK_*` | optional; used only on 429 or 5xx |
```

- [ ] **Step 3: Verify the production build**

```bash
cd web && npm run build && npm start
```

Open http://localhost:3000 and run one review against the production build. This catches the `core/` path resolution problem before Vercel does.

- [ ] **Step 4: Deploy**

Push the branch, import the repo in Vercel, set the root directory so that `core/` resolves (see the README note), and add the environment variables in the Vercel dashboard — never in the repo.

- [ ] **Step 5: Verify the deployment**

Run one review on the live URL. Confirm the response streams rather than arriving all at once, and that a long résumé completes inside 60 seconds.

- [ ] **Step 6: Commit**

```bash
git add web/README.md .gitignore
git commit -m "docs(web): deployment notes and environment reference"
```

---

## What Phase 1 deliberately leaves out

Each is a later phase, and none is blocked by anything built here.

| Deferred | Phase |
|---|---|
| Text → `ResumeJSON` parsing, and `ResumeDocument` going live | 2 |
| Inline field editing, PDF export via print | 2 |
| Capability sheets: improve, tailor, cover letter, cold email | 3 |
| Multi-turn flows: build from scratch, fill in my numbers | 4 |
| Better Auth, Neon, saved résumés, jobs hub, quota | 5 |
| LinkedIn workspace, both modes | 6 |
| Interview prep | later |

**If the evenings run out after Task 9, there is still a real product:** paste a résumé, get an honest review anchored to what is wrong with it. That is worth shipping on its own, and it is why the tasks are ordered this way.
