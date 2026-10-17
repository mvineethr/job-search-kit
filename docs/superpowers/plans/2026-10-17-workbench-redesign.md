# Workbench Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle every page of the web app to the approved Workbench design (cobalt accent, Geist, left sidebar) without touching the exported résumé.

**Architecture:** All styling stays in plain CSS in `web/app/globals.css`: new tokens first, then component classes, then pages converted one group at a time from inline `style={{}}` objects to those classes. Old class names stay working until the last task deletes the ones nothing uses. Two small pure functions (`navCurrent`, `groupResumes`) carry the only new logic and get unit tests; a token test checks colour contrast straight from `globals.css`.

**Tech Stack:** Next.js 16 App Router, React, plain CSS, `next/font/google` (Geist, Source Serif 4), Vitest 5 (jsdom).

**Spec:** `docs/superpowers/specs/2026-10-17-workbench-redesign-design.md`. Read it before starting; this plan does not repeat its tables of page layouts in full.

## Global Constraints

- Do not edit `web/styles/document.ts`, `web/lib/render-resume.ts`, `web/lib/docx.ts`. The exported résumé stays ATS-safe and print-identical.
- Spacing values only from 4/8/12/16/24/32/48/64 (`--s-1`…`--s-16`). Type 12–28px (`--text-xs`…`--text-2xl`).
- Radii: `--r-sm` 6px small controls, `--r-md` 8px buttons/inputs/notices, `--r-lg` 12px cards/panels/paper. Nothing larger except 50% circles and 99px pills.
- Shadows: only `--shadow-sm` and `--shadow-md`, neutral grey. No coloured shadows.
- No gradients anywhere (the fit ring is SVG strokes). No emoji. No "AI-powered" copy. No exclamation marks. No outcome claims.
- Focus: 2px `--accent` outline at 2px offset stays on `:focus-visible`. `prefers-reduced-motion` keeps disabling transitions.
- Colour is never the only signal: every status keeps its text label.
- No new npm dependencies. No CSS framework.
- Every SQL query filters by `sid`. Masters have no delete control.
- Copy stays as it is unless a layout change forces it; status words unchanged ("Shown", "Partly", "Not shown", "Check yourself", "Strong fit", "Partial fit", "Big gaps").
- Many files are CRLF: use exact-match edits, not scripted `\n` replacement.
- Local checks run on the `web-localtest` server (`.claude/launch.json`, port 3001) with `@example.com` accounts. Never real credentials, never the owner's session.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

### Conversion rules (apply in every page task)

| Old | New |
|---|---|
| `<p className="note" style={{ borderLeft: '3px solid var(--danger)', color: 'var(--danger)' }}>` or a `role="alert"` box with `--danger` border | `<p role="alert" className="notice notice-error">` |
| `.note` with `borderLeft … var(--warn)` | `className="notice notice-warn"` |
| `.note` with `borderLeft … var(--ok)` | `className="notice notice-ok"` |
| plain `.note` | `className="notice"` (neutral info) |
| accent call-out link (border `--accent`, background `--accent-subtle`) | `className="notice notice-info notice-link"` |
| `.panel` / `.panel-head` / `.panel-body` | `.card` / `.card-head` / `.card-body` |
| `.pill`, `.pill-master`, `.pill-soon` | `.tag`, `.tag tag-accent`, `.tag tag-soon` |
| `.canvas-head` + `.crumb` + `.rail` | `<PageBar crumbs={…}>actions</PageBar>` |
| `style={{ color: 'var(--danger)' }}` on a button | `className="btn btn-danger"` |
| layout-only inline styles (flex, gap, grid, max-width) | a named class in the page's section of `globals.css`, or a utility from Task 3 (`.stack`, `.row`, `.col-640`, `.col-720`) |

A page is converted when `grep -c "style={{" <file>` returns 0, except dynamic values (a width from a score) which may stay inline.

---

### Task 1: Tokens and contrast test

**Files:**
- Modify: `web/app/globals.css:1-45` (the `:root` block and both dark blocks)
- Create: `web/test/tokens.test.ts`

**Interfaces:**
- Produces: CSS custom properties `--bg-page --bg-surface --bg-subtle --border --border-strong --text --text-muted --text-faint --accent --accent-hover --accent-subtle --accent-text --on-accent --ok --ok-subtle --ok-text --warn --warn-subtle --warn-text --danger --danger-subtle --danger-text --shadow-sm --shadow-md --shadow --r-sm --r-md --r-lg --sidebar-w`, plus the unchanged `--doc-*`, `--sans`, `--serif`, `--text-*`, `--s-*`.

- [ ] **Step 1: Write the failing test** — `web/test/tokens.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const css = readFileSync(fileURLToPath(new URL('../app/globals.css', import.meta.url)), 'utf8');

/** Custom properties declared in the first block that starts with `selector{`. */
function block(selector: string): Record<string, string> {
  const start = css.indexOf(selector + '{');
  if (start < 0) throw new Error(`no block ${selector}`);
  const body = css.slice(start + selector.length + 1, css.indexOf('}', start));
  const out: Record<string, string> = {};
  for (const m of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
}

function luminance(hex: string): number {
  const n = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255);
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const light = block(':root');
const dark = { ...light, ...block(':root[data-theme="dark"]') };

// [foreground, background] pairs that carry text and must reach WCAG AA (4.5:1).
const PAIRS: [string, string][] = [
  ['--text', '--bg-page'],
  ['--text-muted', '--bg-surface'],
  ['--text-muted', '--bg-page'],
  ['--accent', '--bg-surface'],
  ['--on-accent', '--accent'],
  ['--accent-text', '--accent-subtle'],
  ['--ok-text', '--ok-subtle'],
  ['--ok-text', '--bg-surface'],
  ['--warn-text', '--warn-subtle'],
  ['--warn-text', '--bg-surface'],
  ['--danger-text', '--danger-subtle'],
  ['--danger-text', '--bg-surface'],
];

describe.each([
  ['light', light],
  ['dark', dark],
])('%s tokens', (_name, t) => {
  it.each(PAIRS)('%s on %s reaches 4.5:1', (fg, bg) => {
    expect(t[fg], fg).toMatch(/^#[0-9a-f]{6}$/i);
    expect(t[bg], bg).toMatch(/^#[0-9a-f]{6}$/i);
    expect(contrast(t[fg], t[bg])).toBeGreaterThanOrEqual(4.5);
  });
});

it('the prefers-color-scheme dark block matches the data-theme dark block', () => {
  expect(block(':root:not([data-theme="light"])')).toEqual(block(':root[data-theme="dark"]'));
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `cd web && npx vitest run test/tokens.test.ts`
Expected: FAIL — `--accent-text`, `--on-accent`, `--ok-subtle` etc. are undefined.

- [ ] **Step 3: Replace the token blocks** — in `web/app/globals.css`, replace everything from the first line through the closing `}` of `:root[data-theme="dark"]{…}` with:

```css
:root{
  --bg-page:#f6f7f9; --bg-surface:#ffffff; --bg-subtle:#eef0f3;
  --border:#e6e8ec; --border-strong:#d5d9e0;
  --text:#0f1115; --text-muted:#5b616e; --text-faint:#8a8f99;

  --accent:#2f5bea; --accent-hover:#2449c8; --accent-subtle:#eef2fe; --accent-text:#1f3fae; --on-accent:#ffffff;

  --ok:#12b76a; --ok-subtle:#e7f8ef; --ok-text:#067647;
  --warn:#f79009; --warn-subtle:#fef3d6; --warn-text:#a15c07;
  --danger:#f04438; --danger-subtle:#fde8e8; --danger-text:#b42318;

  /* the document is always light — it is going to be printed */
  --doc-bg:#ffffff; --doc-text:#1c1b19; --doc-muted:#6b665e; --doc-border:#e3e0da;

  --shadow-sm:0 1px 2px rgba(16,24,40,.05);
  --shadow-md:0 1px 2px rgba(16,24,40,.06), 0 8px 24px -6px rgba(16,24,40,.12);
  --shadow:var(--shadow-sm); /* old name; removed in the clean-up task */

  --r-sm:6px; --r-md:8px; --r-lg:12px;
  --sidebar-w:220px;

  --sans:var(--font-sans),'Geist',system-ui,-apple-system,'Segoe UI',sans-serif;
  --serif:var(--font-serif),'Source Serif 4',Georgia,'Times New Roman',serif;

  --text-xs:.75rem; --text-sm:.875rem; --text-base:1rem;
  --text-lg:1.125rem; --text-xl:1.375rem; --text-2xl:1.75rem;

  --s-1:4px; --s-2:8px; --s-3:12px; --s-4:16px;
  --s-6:24px; --s-8:32px; --s-12:48px; --s-16:64px;
}

@media (prefers-color-scheme:dark){
  :root:not([data-theme="light"]){
    --bg-page:#0b0c0f; --bg-surface:#14161b; --bg-subtle:#1b1e24;
    --border:#242730; --border-strong:#333845;
    --text:#e8eaee; --text-muted:#a0a6b2; --text-faint:#6f7582;
    --accent:#6f8dff; --accent-hover:#8ea8ff; --accent-subtle:#1a2550; --accent-text:#a9bcff; --on-accent:#0b0c0f;
    --ok:#32d583; --ok-subtle:#0f2a1d; --ok-text:#6ce9a6;
    --warn:#fdb022; --warn-subtle:#2e2410; --warn-text:#fec84b;
    --danger:#f97066; --danger-subtle:#33161a; --danger-text:#fda29b;
    --shadow-sm:0 1px 2px rgba(0,0,0,.4);
    --shadow-md:0 1px 2px rgba(0,0,0,.4), 0 8px 24px -6px rgba(0,0,0,.6);
  }
}
:root[data-theme="dark"]{
  --bg-page:#0b0c0f; --bg-surface:#14161b; --bg-subtle:#1b1e24;
  --border:#242730; --border-strong:#333845;
  --text:#e8eaee; --text-muted:#a0a6b2; --text-faint:#6f7582;
  --accent:#6f8dff; --accent-hover:#8ea8ff; --accent-subtle:#1a2550; --accent-text:#a9bcff; --on-accent:#0b0c0f;
  --ok:#32d583; --ok-subtle:#0f2a1d; --ok-text:#6ce9a6;
  --warn:#fdb022; --warn-subtle:#2e2410; --warn-text:#fec84b;
  --danger:#f97066; --danger-subtle:#33161a; --danger-text:#fda29b;
  --shadow-sm:0 1px 2px rgba(0,0,0,.4);
  --shadow-md:0 1px 2px rgba(0,0,0,.4), 0 8px 24px -6px rgba(0,0,0,.6);
}
```

All pairs were checked by hand before writing this plan (lowest: `--warn-text` on `--warn-subtle`, 4.69:1).

- [ ] **Step 4: Fix existing uses of the old semantic colours as text.** The old `--ok/--warn/--danger` were dark enough for text; the new ones are bright. Run `grep -rn "var(--danger)\|var(--warn)\|var(--ok)" app components` and, where the value colours **text** (`color:`), change it to the `*-text` token. Leave borders, dots and bar fills on the bright token. Also in `web/components/FitMeter.tsx` change the number/label colour from `var(--${tone})` to `var(--${tone}-text)` (the bar keeps `var(--${tone})`).

- [ ] **Step 5: Run the tests**

Run: `cd web && npm test`
Expected: all pass, including the new token test.

- [ ] **Step 6: Commit**

```bash
git add web/app/globals.css web/test/tokens.test.ts web/app web/components
git commit -m "feat(web): Workbench tokens with contrast test"
```

---

### Task 2: Geist font

**Files:**
- Modify: `web/app/layout.tsx:3,12`
- Modify: `web/app/globals.css` (the `body` and `h1,h2,h3` rules)

- [ ] **Step 1: Swap the font import** in `web/app/layout.tsx`:

```tsx
import { Geist, Source_Serif_4 } from 'next/font/google';
```
and
```tsx
const sans = Geist({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
```

- [ ] **Step 2: Heading tracking** — in `globals.css` replace the `h1,h2,h3{…}` rule with:

```css
h1,h2,h3{margin:0; line-height:1.25; font-weight:600; letter-spacing:-.01em; text-wrap:balance}
h1{letter-spacing:-.02em}
```

- [ ] **Step 3: Build**

Run: `cd web && npm run build`
Expected: build succeeds (the font downloads at build time).

- [ ] **Step 4: Commit**

```bash
git add web/app/layout.tsx web/app/globals.css
git commit -m "feat(web): Geist for the interface"
```

---

### Task 3: Component classes

**Files:**
- Modify: `web/app/globals.css` (replace the `.btn…` rules; add a new section after the existing `.field` rules)
- Modify: `web/components/ConfirmButton.tsx:21`, `web/components/AiNotice.tsx:4`

**Interfaces:**
- Produces: classes `.btn .btn-primary .btn-danger .btn-sm .card .card-head .card-body .paper .notice .notice-error .notice-warn .notice-ok .notice-info .notice-link .tag .tag-accent .tag-ok .tag-warn .tag-danger .tag-soon .tag-high .tag-med .tag-low .dot .dot-ok .dot-warn .dot-danger .dot-muted .stack .row .col-640 .col-720 .section-title`.

- [ ] **Step 1: Replace the button rules** (`.btn`, `.btn:hover`, `.btn-primary`, `.btn-primary:hover`, `.btn:disabled`) with:

```css
.btn{
  display:inline-flex; align-items:center; gap:var(--s-2); justify-content:center;
  min-height:32px; padding:0 var(--s-3); border-radius:var(--r-md);
  font-size:var(--text-sm); font-weight:500; line-height:1.2; white-space:nowrap;
  border:1px solid var(--border-strong); background:var(--bg-surface); color:var(--text);
  box-shadow:var(--shadow-sm); text-decoration:none;
  transition:background .12s ease, border-color .12s ease;
}
.btn:hover{background:var(--bg-subtle)}
.btn-primary{background:var(--accent); border-color:var(--accent); color:var(--on-accent)}
.btn-primary:hover{background:var(--accent-hover); border-color:var(--accent-hover)}
.btn-danger{color:var(--danger-text)}
.btn-sm{min-height:28px; padding:0 var(--s-2); font-size:var(--text-xs)}
.btn:disabled{opacity:.5; cursor:default}
```

- [ ] **Step 2: Replace the `.field` input rule** (`.field textarea, .field input[type=…]` and any `.field select` rule from the location-dropdowns branch) with:

```css
.field textarea, .field input[type="text"], .field input[type="email"], .field input[type="password"], .field select{
  font:inherit; min-height:36px; padding:var(--s-2) var(--s-3); border-radius:var(--r-md); width:100%;
  border:1px solid var(--border-strong); background:var(--bg-surface); color:var(--text); line-height:1.5;
  transition:border-color .12s ease, box-shadow .12s ease;
}
.field textarea{resize:vertical}
.field select{
  appearance:none; padding-right:var(--s-8);
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' stroke='%238a8f99' stroke-width='1.5'%3E%3Cpath d='M3 4.5l3 3 3-3'/%3E%3C/svg%3E");
  background-repeat:no-repeat; background-position:right var(--s-3) center;
}
.field textarea:focus, .field input:focus, .field select:focus{border-color:var(--accent); box-shadow:0 0 0 3px var(--accent-subtle); outline:none}
.field textarea:focus-visible, .field input:focus-visible, .field select:focus-visible{outline:2px solid var(--accent); outline-offset:2px}
```

- [ ] **Step 3: Append the component section** to `globals.css`, before the `@media print` block:

```css
/* ============ Workbench components ============ */
.card{background:var(--bg-surface); border:1px solid var(--border); border-radius:var(--r-lg); box-shadow:var(--shadow-sm)}
.card-head{padding:var(--s-3) var(--s-4); border-bottom:1px solid var(--border); display:flex; align-items:center; gap:var(--s-2)}
.card-head h2{font-size:var(--text-sm)}
.card-body{padding:var(--s-4); display:flex; flex-direction:column; gap:var(--s-3)}
.card > .card-body:only-child{padding:var(--s-4)}
.paper{border-radius:var(--r-lg); box-shadow:var(--shadow-md); overflow:hidden; background:var(--doc-bg)}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .paper{border:1px solid var(--border)}}
:root[data-theme="dark"] .paper{border:1px solid var(--border)}

.notice{border-radius:var(--r-md); padding:var(--s-3); font-size:var(--text-sm); line-height:1.5; background:var(--bg-subtle); color:var(--text)}
.notice-error{background:var(--danger-subtle); color:var(--danger-text)}
.notice-warn{background:var(--warn-subtle); color:var(--warn-text)}
.notice-ok{background:var(--ok-subtle); color:var(--ok-text)}
.notice-info{background:var(--accent-subtle); color:var(--accent-text)}
.notice-link{display:block; text-decoration:none; border:1px solid transparent; transition:border-color .12s ease}
.notice-link:hover{border-color:var(--accent)}

.tag{display:inline-block; padding:2px var(--s-2); border-radius:99px; white-space:nowrap; font-size:var(--text-xs); font-weight:600; background:var(--bg-subtle); color:var(--text-muted)}
.tag-accent{background:var(--accent-subtle); color:var(--accent-text)}
.tag-ok{background:var(--ok-subtle); color:var(--ok-text)}
.tag-warn, .tag-med, .tag-soon{background:var(--warn-subtle); color:var(--warn-text)}
.tag-danger, .tag-high{background:var(--danger-subtle); color:var(--danger-text)}
.tag-low{background:var(--accent-subtle); color:var(--accent-text)}

.dot{width:8px; height:8px; border-radius:50%; flex:none; display:inline-block}
.dot-ok{background:var(--ok)} .dot-warn{background:var(--warn)} .dot-danger{background:var(--danger)} .dot-muted{background:var(--text-faint)}

.stack{display:flex; flex-direction:column; gap:var(--s-3)}
.row{display:flex; flex-wrap:wrap; gap:var(--s-2); align-items:center}
.col-640{max-width:640px}
.col-720{max-width:720px}
.section-title{font-size:var(--text-sm); font-weight:600; margin-bottom:var(--s-2)}
```

- [ ] **Step 4: Use them in the two tiny shared components.**

`web/components/ConfirmButton.tsx` — replace the button line with:
```tsx
      <button type="submit" className="btn btn-danger">
```

`web/components/AiNotice.tsx` — replace the `<p …>` opening tag with:
```tsx
    <p className="notice notice-warn">
```

- [ ] **Step 5: Build and test**

Run: `cd web && npm test && npm run build`
Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add web/app/globals.css web/components/ConfirmButton.tsx web/components/AiNotice.tsx
git commit -m "feat(web): Workbench buttons, fields, cards, notices, tags"
```

---

### Task 4: Sidebar, mobile bar, signed-out bar, page bar

**Files:**
- Create: `web/lib/nav.ts`, `web/test/nav.test.ts`
- Create: `web/components/Sidebar.tsx`, `web/components/PageBar.tsx`
- Modify: `web/components/TopBar.tsx` (signed-out only)
- Modify: `web/app/layout.tsx`
- Modify: `web/app/globals.css` (replace `.topbar…`, `.nav…`, `.avatar`, `.menu…`, `.signin-link`, `.site-foot…` rules; update `@media print`)

**Interfaces:**
- Produces: `NAV: { href: string; label: string; soon?: boolean }[]` and `navCurrent(pathname: string, href: string): boolean` from `@/lib/nav`; `<Sidebar me={Me} />` where `type Me = { name: string; email: string; admin: boolean }`; `<TopBar />` (no props); `<PageBar crumbs={{ href?: string; label: string }[]}>{actions}</PageBar>`; layout classes `.shell` (signed in) and `.shell-public`.

- [ ] **Step 1: Write the failing test** — `web/test/nav.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { NAV, navCurrent } from '@/lib/nav';

describe('navCurrent', () => {
  it('matches Home only on /', () => {
    expect(navCurrent('/', '/')).toBe(true);
    expect(navCurrent('/jobs', '/')).toBe(false);
  });
  it('matches sections by prefix', () => {
    expect(navCurrent('/jobs', '/jobs')).toBe(true);
    expect(navCurrent('/jobs/abc/questions', '/jobs')).toBe(true);
    expect(navCurrent('/jobsx', '/jobs')).toBe(false);
  });
  it('lights Résumés on a single résumé and its metrics page', () => {
    expect(navCurrent('/resume/abc', '/resumes')).toBe(true);
    expect(navCurrent('/resume/abc/metrics', '/resumes')).toBe(true);
    expect(navCurrent('/resumes', '/resumes')).toBe(true);
  });
  it('lights Jobs on a cover letter', () => {
    expect(navCurrent('/letter/abc', '/jobs')).toBe(true);
  });
  it('lists Home, Résumés, Jobs, then the two placeholders', () => {
    expect(NAV.map((n) => n.href)).toEqual(['/', '/resumes', '/jobs', '/linkedin', '/email']);
    expect(NAV.filter((n) => n.soon).map((n) => n.href)).toEqual(['/linkedin', '/email']);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `cd web && npx vitest run test/nav.test.ts`
Expected: FAIL — cannot resolve `@/lib/nav`.

- [ ] **Step 3: Write `web/lib/nav.ts`**

```ts
export const NAV: { href: string; label: string; soon?: boolean }[] = [
  { href: '/', label: 'Home' },
  { href: '/resumes', label: 'Résumés' },
  { href: '/jobs', label: 'Jobs' },
  { href: '/linkedin', label: 'LinkedIn', soon: true },
  { href: '/email', label: 'Cold email', soon: true },
];

// Pages that live under another section's sidebar item.
const ALSO: Record<string, string[]> = { '/resumes': ['/resume'], '/jobs': ['/letter'] };

const under = (pathname: string, base: string) => pathname === base || pathname.startsWith(base + '/');

export function navCurrent(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return [href, ...(ALSO[href] ?? [])].some((base) => under(pathname, base));
}
```

- [ ] **Step 4: Run the test**

Run: `cd web && npx vitest run test/nav.test.ts`
Expected: PASS.

- [ ] **Step 5: Write `web/components/Sidebar.tsx`** — the account menu logic moves here unchanged from `TopBar.tsx`.

```tsx
'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import SignOutButton from './SignOutButton';
import { SITE_NAME } from '@/lib/site';
import { NAV, navCurrent } from '@/lib/nav';

type Me = { name: string; email: string; admin: boolean };

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

/** Close a native <details> menu on navigation, on a click outside, and on Escape. */
function useDetailsClose(ref: React.RefObject<HTMLDetailsElement | null>, pathname: string) {
  useEffect(() => {
    if (ref.current) ref.current.open = false;
  }, [ref, pathname]);
  useEffect(() => {
    const close = (e: Event) => {
      const el = ref.current;
      if (!el?.open) return;
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !el.contains(e.target as Node)) el.open = false;
    };
    document.addEventListener('click', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('click', close);
      document.removeEventListener('keydown', close);
    };
  }, [ref]);
}

function Links({ pathname }: { pathname: string }) {
  return (
    <>
      {NAV.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={item.soon ? 'side-link side-soon' : 'side-link'}
          aria-current={navCurrent(pathname, item.href) ? 'page' : undefined}
        >
          {item.label}
          {item.soon && <span className="tag tag-soon">Soon</span>}
        </Link>
      ))}
    </>
  );
}

function AccountLinks({ me }: { me: Me }) {
  return (
    <>
      <div className="who">
        <strong>{me.name}</strong>
        <span>{me.email}</span>
      </div>
      <Link href="/start">Profile</Link>
      <Link href="/settings">Settings</Link>
      <Link href="/help">Help</Link>
      {me.admin && <Link href="/admin">Admin</Link>}
      <SignOutButton className="" />
    </>
  );
}

export default function Sidebar({ me }: { me: Me }) {
  const pathname = usePathname();
  const account = useRef<HTMLDetailsElement>(null);
  const mobile = useRef<HTMLDetailsElement>(null);
  useDetailsClose(account, pathname);
  useDetailsClose(mobile, pathname);

  const brand = (
    <Link href="/" className="brand">
      <span className="brand-mark" aria-hidden="true" />
      {SITE_NAME}
    </Link>
  );

  return (
    <>
      <aside className="sidebar" aria-label="Main">
        {brand}
        <nav className="side-nav">
          <Links pathname={pathname} />
        </nav>
        <details className="menu side-account" ref={account}>
          <summary aria-label={`Account menu for ${me.name}`}>
            <span className="avatar" aria-hidden="true">{initials(me.name) || '?'}</span>
            <span className="side-name">{me.name}</span>
          </summary>
          <div className="menu-pop menu-up">
            <AccountLinks me={me} />
          </div>
        </details>
      </aside>

      <header className="mobile-bar">
        {brand}
        <details className="menu" ref={mobile}>
          <summary className="btn btn-sm" aria-label="Menu">Menu</summary>
          <div className="menu-pop">
            <nav className="side-nav">
              <Links pathname={pathname} />
            </nav>
            <AccountLinks me={me} />
          </div>
        </details>
      </header>
    </>
  );
}
```

- [ ] **Step 6: Cut `web/components/TopBar.tsx` down to the signed-out bar**

```tsx
import Link from 'next/link';
import { SITE_NAME } from '@/lib/site';

/** The bar for people who are not signed in. Signed-in pages use the sidebar. */
export default function TopBar() {
  return (
    <header className="topbar">
      <div className="topbar-in">
        <Link href="/" className="brand">
          <span className="brand-mark" aria-hidden="true" />
          {SITE_NAME}
        </Link>
        <div className="signin-link">
          <Link href="/login" className="btn">Sign in</Link>
          <Link href="/signup" className="btn btn-primary">Create account</Link>
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 7: Write `web/components/PageBar.tsx`**

```tsx
import Link from 'next/link';

/** The row at the top of a signed-in page: where you are on the left, what you can do on the right. */
export default function PageBar({
  crumbs,
  children,
}: {
  crumbs: { href?: string; label: string }[];
  children?: React.ReactNode;
}) {
  return (
    <div className="page-bar">
      <nav className="crumb" aria-label="Breadcrumb">
        {crumbs.map((c, i) => (
          <span key={i} className="crumb-item">
            {i > 0 && <span className="sep" aria-hidden="true">/</span>}
            {c.href ? <Link href={c.href}>{c.label}</Link> : <strong aria-current="page">{c.label}</strong>}
          </span>
        ))}
      </nav>
      {children && <div className="rail">{children}</div>}
    </div>
  );
}
```

- [ ] **Step 8: Wire the layout** — in `web/app/layout.tsx` import `Sidebar`, and replace the body contents:

```tsx
      <body>
        {me ? <Sidebar me={me} /> : <TopBar />}
        <div className={me ? 'shell' : 'shell-public'}>
          {children}
          <footer className="site-foot">
            <div className="site-foot-in">
              <span>{SITE_NAME} · free and open source</span>
              <Link href="/privacy">Privacy</Link>
              <Link href="/terms">Terms</Link>
              <Link href="/help">Help</Link>
              <a href={REPO_URL} target="_blank" rel="noreferrer">
                Source code
              </a>
              <span>Not affiliated with LinkedIn, Google or any employer.</span>
            </div>
          </footer>
        </div>
      </body>
```

- [ ] **Step 9: Chrome CSS** — in `globals.css` delete the old `.topbar`, `.topbar-in`, `.brand`, `.nav`, `.nav a…`, `.avatar`, `.menu…`, `.menu-pop…`, `.signin-link`, `.site-foot…`, `.crumb…`, `.rail` rules and add:

```css
/* ============ chrome ============ */
.brand{display:flex; align-items:center; gap:var(--s-2); font-weight:600; font-size:var(--text-base); letter-spacing:-.02em; color:var(--text); text-decoration:none; white-space:nowrap}
.brand-mark{width:18px; height:18px; border-radius:var(--r-sm); background:var(--accent); flex:none}

.sidebar{
  position:fixed; inset:0 auto 0 0; width:var(--sidebar-w); z-index:30;
  background:var(--bg-surface); border-right:1px solid var(--border);
  display:flex; flex-direction:column; gap:var(--s-4); padding:var(--s-4) var(--s-3);
}
.sidebar > .brand{padding:0 var(--s-2) var(--s-2)}
.side-nav{display:flex; flex-direction:column; gap:2px}
.side-link{
  display:flex; align-items:center; justify-content:space-between; gap:var(--s-2);
  padding:6px var(--s-2); border-radius:var(--r-md); color:var(--text-muted); text-decoration:none; font-weight:500;
  transition:background .12s ease, color .12s ease;
}
.side-link:hover{background:var(--bg-subtle); color:var(--text)}
.side-link[aria-current="page"]{background:var(--accent-subtle); color:var(--accent-text); font-weight:600}
.side-link:not(.side-soon) + .side-soon{margin-top:var(--s-4)}
.side-account{margin-top:auto}
.side-account > summary{display:flex; align-items:center; gap:var(--s-2); padding:var(--s-2); border-radius:var(--r-md)}
.side-account > summary:hover{background:var(--bg-subtle)}
.side-name{overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-weight:500}
.avatar{
  width:28px; height:28px; border-radius:50%; flex:none;
  background:var(--accent-subtle); color:var(--accent-text);
  display:grid; place-items:center; font-size:var(--text-xs); font-weight:600;
}

.menu{position:relative}
.menu > summary{list-style:none; cursor:pointer}
.menu > summary::-webkit-details-marker{display:none}
.menu > summary:focus-visible{outline:2px solid var(--accent); outline-offset:2px}
.menu-pop{
  position:absolute; right:0; top:calc(100% + var(--s-2)); min-width:220px; z-index:40;
  background:var(--bg-surface); border:1px solid var(--border); border-radius:var(--r-lg); box-shadow:var(--shadow-md);
  padding:var(--s-2); display:flex; flex-direction:column;
}
.menu-up{top:auto; bottom:calc(100% + var(--s-2)); left:0; right:auto}
.menu-pop .who{padding:var(--s-2) var(--s-3); border-bottom:1px solid var(--border); margin-bottom:var(--s-1)}
.menu-pop .who strong{display:block; font-size:var(--text-sm)}
.menu-pop .who span{font-size:var(--text-xs); color:var(--text-muted); word-break:break-all}
.menu-pop > a, .menu-pop > button{
  text-align:left; padding:var(--s-2) var(--s-3); border-radius:var(--r-sm); font-size:var(--text-sm);
  color:var(--text); text-decoration:none; background:none; border:0; cursor:pointer;
}
.menu-pop > a:hover, .menu-pop > button:hover{background:var(--bg-subtle)}

.shell{margin-left:var(--sidebar-w); min-height:100vh; display:flex; flex-direction:column}
.shell > .site-foot{margin-top:auto}
.mobile-bar{display:none}

.topbar{background:var(--bg-surface); border-bottom:1px solid var(--border); position:sticky; top:0; z-index:30}
.topbar-in{max-width:1200px; margin:0 auto; padding:0 var(--s-6); height:56px; display:flex; align-items:center; gap:var(--s-4)}
.signin-link{margin-left:auto; display:flex; gap:var(--s-2)}

.page-bar{
  position:sticky; top:0; z-index:20; background:var(--bg-surface); border-bottom:1px solid var(--border);
  display:flex; flex-wrap:wrap; align-items:center; gap:var(--s-3); padding:var(--s-3) var(--s-6); min-height:56px;
}
.crumb{display:flex; align-items:center; gap:var(--s-2); flex-wrap:wrap; font-size:var(--text-sm)}
.crumb-item{display:inline-flex; align-items:center; gap:var(--s-2)}
.crumb a{color:var(--text-muted); text-decoration:none}
.crumb a:hover{color:var(--text); text-decoration:underline}
.crumb .sep{color:var(--text-faint)}
.crumb strong{font-weight:600}
.rail{display:flex; flex-wrap:wrap; gap:var(--s-2); margin-left:auto}

.site-foot{border-top:1px solid var(--border); margin-top:var(--s-16)}
.site-foot-in{max-width:1200px; margin:0 auto; padding:var(--s-6); display:flex; gap:var(--s-4); flex-wrap:wrap; font-size:var(--text-xs); color:var(--text-muted)}
.site-foot a{color:var(--text-muted)}

@media (max-width:1023px){
  .sidebar{display:none}
  .shell{margin-left:0}
  .mobile-bar{
    display:flex; align-items:center; justify-content:space-between; gap:var(--s-3);
    position:sticky; top:0; z-index:30; height:56px; padding:0 var(--s-4);
    background:var(--bg-surface); border-bottom:1px solid var(--border);
  }
  .mobile-bar .menu-pop{min-width:260px}
  .page-bar{position:static; padding:var(--s-3) var(--s-4)}
  .rail{margin-left:0; width:100%}
}
```

- [ ] **Step 10: Print rules** — replace the first line inside the existing `@media print{…}` block with:

```css
  .topbar, .sidebar, .mobile-bar, .page-bar, .site-foot, .canvas-head, .panel, .card, .note, .notice, .btn{display:none!important}
  .shell{margin-left:0!important}
```

Also in the same block add `.paper{box-shadow:none!important; border:0!important; border-radius:0!important}`.

- [ ] **Step 11: Test and build**

Run: `cd web && npm test && npm run build && DATABASE_URL=postgresql://x:x@127.0.0.1:1/x npm run build`
Expected: all green (the second build proves no static page touches the database).

- [ ] **Step 12: Click through** on `web-localtest` (preview_start `web-localtest`): signed out → slim bar on `/login`; sign up a throwaway `@example.com` account → sidebar with Home, Résumés, Jobs, gap, LinkedIn Soon, Cold email Soon; the account menu opens upward and closes on Escape; at 375px the mobile bar shows and Menu opens the sheet; dark mode via `resize_window colorScheme: dark`. `/resumes` will 404 until Task 7; that is expected. Screenshot desktop and 375px.

- [ ] **Step 13: Commit**

```bash
git add web/lib/nav.ts web/test/nav.test.ts web/components/Sidebar.tsx web/components/PageBar.tsx web/components/TopBar.tsx web/app/layout.tsx web/app/globals.css
git commit -m "feat(web): sidebar, mobile bar and page bar"
```

---

### Task 5: Fit ring

**Files:**
- Modify: `web/components/FitMeter.tsx`
- Modify: `web/app/globals.css` (append `.fit…` rules)

**Interfaces:**
- Consumes: `band(score)` and `MatchView` from `@/lib/match` (unchanged).
- Produces: `<FitMeter view={MatchView} large?: boolean />` — same props as today; `large` now renders the ring.

- [ ] **Step 1: Rewrite `web/components/FitMeter.tsx`**

```tsx
import { band, type MatchView } from '@/lib/match';

const R = 52; // ring radius inside a 120px box with a 10px stroke
const C = 2 * Math.PI * R;

/** The score with its number, label and counts always in text, never colour alone. */
export default function FitMeter({ view, large = false }: { view: MatchView; large?: boolean }) {
  if (view.score === null) return null;
  const { label, tone } = band(view.score);
  const meter = {
    role: 'meter',
    'aria-valuemin': 0,
    'aria-valuemax': 100,
    'aria-valuenow': view.score,
    'aria-label': `Fit ${view.score} out of 100, ${label}`,
  } as const;
  const counts = (
    <span className="fit-counts tnum">
      {view.mustMet} of {view.mustTotal} must-haves shown
    </span>
  );
  const warnings = view.hardWarnings.length > 0 && (
    <p className="fit-hard">Hard requirement not shown: {view.hardWarnings.map((r) => r.text).join('; ')}</p>
  );

  if (!large) {
    return (
      <div className="fit">
        <div className="row">
          <strong className={`fit-num tnum fit-${tone}`}>{view.score}</strong>
          <span className={`fit-label fit-${tone}`}>{label}</span>
          {counts}
        </div>
        <div className="fit-bar" {...meter}>
          <div className={`fit-bar-fill fill-${tone}`} style={{ width: `${view.score}%` }} />
        </div>
        {warnings}
      </div>
    );
  }

  return (
    <div className="fit fit-large">
      <svg className="fit-ring" viewBox="0 0 120 120" width="120" height="120" {...meter}>
        <circle cx="60" cy="60" r={R} className="fit-track" />
        <circle
          cx="60" cy="60" r={R}
          className={`fit-arc stroke-${tone}`}
          strokeDasharray={`${(view.score / 100) * C} ${C}`}
          transform="rotate(-90 60 60)"
        />
        <text x="60" y="60" className="fit-ring-num" textAnchor="middle" dominantBaseline="central">
          {view.score}
        </text>
        <text x="60" y="84" className="fit-ring-of" textAnchor="middle">of 100</text>
      </svg>
      <span className={`fit-label fit-${tone}`}>{label}</span>
      {counts}
      {warnings}
    </div>
  );
}
```

- [ ] **Step 2: Append the CSS**

```css
/* ============ fit score ============ */
.fit{display:flex; flex-direction:column; gap:6px}
.fit-large{align-items:center; text-align:center}
.fit-num{font-size:var(--text-base)}
.fit-label{font-weight:600}
.fit-ok{color:var(--ok-text)} .fit-warn{color:var(--warn-text)} .fit-danger{color:var(--danger-text)}
.fit-counts{font-size:var(--text-xs); color:var(--text-muted)}
.fit-hard{font-size:var(--text-xs); color:var(--danger-text)}
.fit-bar{height:6px; border-radius:var(--r-sm); background:var(--border); max-width:240px}
.fit-bar-fill{height:100%; border-radius:var(--r-sm)}
.fill-ok{background:var(--ok)} .fill-warn{background:var(--warn)} .fill-danger{background:var(--danger)}
.fit-track{fill:none; stroke:var(--border); stroke-width:10}
.fit-arc{fill:none; stroke-width:10; stroke-linecap:round}
.stroke-ok{stroke:var(--ok)} .stroke-warn{stroke:var(--warn)} .stroke-danger{stroke:var(--danger)}
.fit-ring-num{font-size:var(--text-2xl); font-weight:700; letter-spacing:-.03em; fill:var(--text); font-variant-numeric:tabular-nums}
.fit-ring-of{font-size:var(--text-xs); fill:var(--text-muted)}
```

- [ ] **Step 3: Test and build**

Run: `cd web && npm test && npm run build`
Expected: green.

- [ ] **Step 4: Commit**

```bash
git add web/components/FitMeter.tsx web/app/globals.css
git commit -m "feat(web): fit score ring"
```

---

### Task 6: Jobs pages

**Files:**
- Modify: `web/app/jobs/[id]/page.tsx`
- Modify: `web/app/jobs/page.tsx`
- Modify: `web/components/AddJobForm.tsx`
- Modify: `web/app/globals.css` (append a `/* jobs */` section)

**Interfaces:**
- Consumes: `PageBar`, `FitMeter`, classes from Tasks 3–5.

- [ ] **Step 1: Job page header and layout.** In `web/app/jobs/[id]/page.tsx`, replace the outer `<div className="wrap" style={{ maxWidth: 820 }}>`, its crumb and `page-head` with a `PageBar` plus a two-column body. The action buttons currently at the bottom (`tailored`/`GenerateButton` tailor, letter, applied form, re-check, delete) move into the `PageBar` children in this order: Mark as applied, Re-check fit, Delete job, Cover letter, Tailor (primary last). Structure:

```tsx
  return (
    <>
      <PageBar crumbs={[{ href: '/jobs', label: 'Jobs' }, { label: job.company }]}>
        {/* applied form, re-check GenerateButton, ConfirmButton delete, letter link/GenerateButton, tailored link/GenerateButton — same JSX as today, moved */}
      </PageBar>

      <div className="wrap job">
        <div className="page-head">
          <h1>{job.role}</h1>
          <p className="sub">{job.company}</p>
        </div>

        {error && <p role="alert" className="notice notice-error">{error}</p>}
        {answered && (/* same text as today */ <p className="notice notice-ok tnum">…</p>)}

        {!view ? (
          <div className="card col-640"><div className="card-body">{/* the not-checked-yet block, unchanged JSX, .note → .notice */}</div></div>
        ) : (
          <div className="job-grid">
            <aside className="job-score card">
              <div className="card-body">
                {stale && (/* stale notice, now className="notice notice-warn" */)}
                <FitMeter view={view} large />
                <p className="fit-counts">
                  This measures how much of what the posting asks for your résumé shows. It is not a
                  prediction of whether you will get an interview.
                </p>
              </div>
            </aside>
            <div className="stack">
              {view.openQuestions.length > 0 && (
                <Link href={`/jobs/${job.id}/questions`} className="notice notice-info notice-link">
                  <strong>Answer {Math.min(view.openQuestions.length, 8)} questions about your experience</strong>
                  <span className="notice-sub">
                    Your résumé may leave out things you have done. Answers you can back up raise the
                    score and let the tailored version use them.
                  </span>
                </Link>
              )}
              {view.checkYourself.length > 0 && (/* .notice with the same text */)}
              <RequirementList title="Must-haves" items={scored.filter((r) => r.kind === 'must')} />
              <RequirementList title="Nice to have" items={scored.filter((r) => r.kind === 'nice')} />
            </div>
          </div>
        )}
      </div>
    </>
  );
```

Replace the "✓ Tailored résumé" / "✓ Cover letter" link labels with "Tailored résumé" / "Cover letter" (the ✓ is a symbol standing in for state; the label already says it exists).

- [ ] **Step 2: Requirement rows.** Replace `STATUS` and `RequirementList` with:

```tsx
const STATUS: Record<MatchedRequirement['status'], { label: string; tone: 'ok' | 'warn' | 'danger' | 'muted' }> = {
  met: { label: 'Shown', tone: 'ok' },
  partial: { label: 'Partly', tone: 'warn' },
  missing: { label: 'Not shown', tone: 'danger' },
  unknown: { label: 'Check yourself', tone: 'muted' },
};

function RequirementList({ title, items }: { title: string; items: MatchedRequirement[] }) {
  if (items.length === 0) return null;
  return (
    <section>
      <h2 className="section-title">
        {title} <span className="count tnum">{items.length}</span>
      </h2>
      <ul className="req-list">
        {items.map((r) => {
          const s = STATUS[r.status];
          return (
            <li key={r.id} className="req">
              <span className={`dot dot-${s.tone}`} aria-hidden="true" />
              <div className="req-main">
                <span className="req-text">{r.text}</span>
                {r.evidence ? (
                  <span className="req-evidence">{r.answered ? r.evidence : <>From your résumé: “{r.evidence}”</>}</span>
                ) : (
                  r.status === 'missing' && <span className="req-evidence">Not on your résumé</span>
                )}
              </div>
              <span className={`tag ${s.tone === 'muted' ? '' : `tag-${s.tone}`}`}>{s.label}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
```

- [ ] **Step 3: Jobs CSS** — append:

```css
/* ============ jobs ============ */
.job .page-head{padding-block:var(--s-6) var(--s-4)}
.job > .notice{margin-bottom:var(--s-4)}
.job-grid{display:grid; grid-template-columns:240px minmax(0,1fr); gap:var(--s-4); align-items:start; padding-bottom:var(--s-12)}
.job-score{position:sticky; top:72px}
.notice-sub{display:block; font-size:var(--text-xs); margin-top:2px; opacity:.9}
.count{color:var(--text-faint); font-weight:400; font-size:var(--text-xs)}
.req-list{list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:var(--s-2)}
.req{display:flex; gap:var(--s-3); align-items:flex-start; padding:var(--s-3); background:var(--bg-surface); border:1px solid var(--border); border-radius:var(--r-lg)}
.req .dot{margin-top:6px}
.req-main{flex:1; min-width:0; display:flex; flex-direction:column; gap:2px}
.req-text{font-weight:500}
.req-evidence{font-size:var(--text-xs); color:var(--text-muted)}
@media (max-width:1023px){.job-grid{grid-template-columns:1fr} .job-score{position:static}}
```

- [ ] **Step 4: Jobs list.** In `web/app/jobs/page.tsx` put a `PageBar crumbs={[{ label: 'Jobs' }]}` at the top (no actions; the add form stays on the page), keep the `page-head`, convert the error box and notices with the conversion rules, render each job as a `.card` row: company and role on the left (role 600), the small `FitMeter` (no `large`), then tags (`tag tag-ok` "Applied", `tag tag-accent` "N questions"), then the row's existing buttons. Put `AddJobForm` in a `.card` with `card-head` "Add a job". Move every remaining layout style into a `/* jobs */` class (`.job-row`, `.job-row-main`, `.job-row-actions`). Convert `AddJobForm.tsx` the same way (its inputs already use `.field`).

- [ ] **Step 5: Verify**

Run: `cd web && grep -c "style={{" "app/jobs/[id]/page.tsx" app/jobs/page.tsx components/AddJobForm.tsx`
Expected: 0 for each, except the `FitMeter` bar width, which lives in `FitMeter.tsx`.

Run: `cd web && npm test && npm run build`
Expected: green.

Click through on `web-localtest` with the throwaway account: add a job, run Check my fit, look at the ring and rows in light, dark and 375px. Screenshot the job page.

- [ ] **Step 6: Commit**

```bash
git add web/app/jobs web/components/AddJobForm.tsx web/app/globals.css
git commit -m "feat(web): Workbench job pages"
```

---

### Task 7: Résumé page and the new Résumés list

**Files:**
- Create: `web/lib/resume-groups.ts`, `web/test/resume-groups.test.ts`, `web/app/resumes/page.tsx`
- Modify: `web/app/resume/[id]/page.tsx`
- Modify: `web/components/AssistantPanel.tsx`, `web/components/TailoringAudit.tsx`, `web/components/GenericPhrases.tsx`, `web/components/FindingsList.tsx`
- Modify: `web/app/globals.css` (append `/* résumés */`)

**Interfaces:**
- Produces: `groupResumes(resumes: Pick<ResumeRow,'id'|'title'|'parent_id'|'job_id'|'updated_at'>[], jobs: Pick<JobRow,'id'|'company'|'role'>[]): { masters: R[]; byJob: { job: J | null; copies: R[] }[] }`.

- [ ] **Step 1: Write the failing test** — `web/test/resume-groups.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { groupResumes } from '@/lib/resume-groups';

const r = (id: string, parent_id: string | null, job_id: string | null) => ({
  id, title: id, parent_id, job_id, updated_at: new Date('2026-10-01'),
});

describe('groupResumes', () => {
  it('puts masters first and tailored copies under their job, in job order', () => {
    const out = groupResumes(
      [r('t2', 'm1', 'j2'), r('m1', null, null), r('t1', 'm1', 'j1'), r('t1b', 'm1', 'j1')],
      [{ id: 'j1', company: 'Acme', role: 'Analyst' }, { id: 'j2', company: 'Initech', role: 'Engineer' }],
    );
    expect(out.masters.map((x) => x.id)).toEqual(['m1']);
    expect(out.byJob.map((g) => g.job?.id)).toEqual(['j1', 'j2']);
    expect(out.byJob[0].copies.map((x) => x.id)).toEqual(['t1', 't1b']);
  });

  it('keeps a tailored copy whose job is gone under a null job', () => {
    const out = groupResumes([r('t9', 'm1', 'gone')], []);
    expect(out.byJob).toEqual([{ job: null, copies: [expect.objectContaining({ id: 't9' })] }]);
  });

  it('returns empty groups for no résumés', () => {
    expect(groupResumes([], [])).toEqual({ masters: [], byJob: [] });
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `cd web && npx vitest run test/resume-groups.test.ts`
Expected: FAIL — cannot resolve `@/lib/resume-groups`.

- [ ] **Step 3: Write `web/lib/resume-groups.ts`**

```ts
import type { JobRow, ResumeRow } from './db';

type R = Pick<ResumeRow, 'id' | 'title' | 'parent_id' | 'job_id' | 'updated_at'>;
type J = Pick<JobRow, 'id' | 'company' | 'role'>;

/** Masters, then tailored copies grouped under their job in the order jobs are given. */
export function groupResumes<TR extends R, TJ extends J>(resumes: TR[], jobs: TJ[]) {
  const masters = resumes.filter((x) => !x.parent_id);
  const copies = resumes.filter((x) => x.parent_id);
  const byJob: { job: TJ | null; copies: TR[] }[] = [];
  for (const job of jobs) {
    const mine = copies.filter((c) => c.job_id === job.id);
    if (mine.length) byJob.push({ job, copies: mine });
  }
  const known = new Set(jobs.map((j) => j.id));
  const orphans = copies.filter((c) => !c.job_id || !known.has(c.job_id));
  if (orphans.length) byJob.push({ job: null, copies: orphans });
  return { masters, byJob };
}
```

If `ResumeRow`/`JobRow` field types differ (e.g. `parent_id: string | null`), the test's literal objects must still satisfy them; adjust the test's `r()` helper types, not the function.

- [ ] **Step 4: Run the test**

Run: `cd web && npx vitest run test/resume-groups.test.ts`
Expected: PASS.

- [ ] **Step 5: Write `web/app/resumes/page.tsx`**

```tsx
import Link from 'next/link';
import { currentSid } from '@/lib/auth';
import { ensureSchema, sql, type JobRow, type ResumeRow } from '@/lib/db';
import { groupResumes } from '@/lib/resume-groups';
import PageBar from '@/components/PageBar';

export const dynamic = 'force-dynamic';

export default async function ResumesPage() {
  const sid = await currentSid();
  if (!sid) return null;

  await ensureSchema();
  const q = sql();
  const resumes = (await q`
    SELECT id, title, content, parent_id, job_id, created_at, updated_at
    FROM resumes WHERE sid = ${sid} ORDER BY updated_at DESC`) as unknown as ResumeRow[];
  const jobs = (await q`
    SELECT id, company, role FROM jobs WHERE sid = ${sid} ORDER BY created_at DESC`) as unknown as JobRow[];
  const { masters, byJob } = groupResumes(resumes, jobs);

  return (
    <>
      <PageBar crumbs={[{ label: 'Résumés' }]}>
        <Link href="/review" className="btn btn-primary">Add a résumé</Link>
      </PageBar>
      <div className="wrap resumes">
        <div className="page-head">
          <h1>Résumés</h1>
          <p className="sub">Your master is the one you edit. Tailored copies are made from it for one job each and never change it.</p>
        </div>

        <section className="stack">
          <h2 className="section-title">Master <span className="count tnum">{masters.length}</span></h2>
          {masters.length === 0 ? (
            <p className="notice">No master yet. <Link href="/review">Add your résumé</Link> to start.</p>
          ) : (
            masters.map((m) => (
              <Link key={m.id} href={`/resume/${m.id}`} className="card entry-row">
                <span className="tag tag-accent">Master</span>
                <strong>{m.title}</strong>
                <span className="entry-meta">{m.content ? 'Read into sections' : 'Plain text only'}</span>
              </Link>
            ))
          )}
        </section>

        {byJob.length > 0 && (
          <section className="stack">
            <h2 className="section-title">Tailored copies</h2>
            {byJob.map((g) => (
              <div key={g.job?.id ?? 'none'} className="stack resumes-group">
                <p className="entry-meta">
                  {g.job ? <Link href={`/jobs/${g.job.id}`}>{g.job.role} · {g.job.company}</Link> : 'Job deleted'}
                </p>
                {g.copies.map((c) => (
                  <Link key={c.id} href={`/resume/${c.id}`} className="card entry-row">
                    <span className="tag">Tailored</span>
                    <strong>{c.title}</strong>
                  </Link>
                ))}
              </div>
            ))}
          </section>
        )}
      </div>
    </>
  );
}
```

Every query above filters by `sid`. There is no delete control here; tailored copies are deleted from their own page as today.

- [ ] **Step 6: Résumé page.** In `web/app/resume/[id]/page.tsx`:
  - Replace the `canvas-head` block with `<PageBar crumbs={…}>` where crumbs are `[{ href: '/resumes', label: 'Résumés' }, { label: row.title }]` for a master and `[{ href: '/resumes', label: 'Résumés' }, { href: \`/resume/${row.parent_id}\`, label: 'Master' }, { label: row.title }]` for a tailored copy. Actions, in order: All jobs (tailored only), Check what an ATS sees, Download Word, `PrintButton`, Delete this copy (tailored only, `ConfirmButton`), Fill in N numbers (`btn btn-primary`, last).
  - Replace the `<main className="canvas-split" style={{…}}>` with `<main className="canvas-split resume-split">`, and the document wrapper `<div style={{ border…, borderRadius: 8, boxShadow…, overflow:'hidden' }}>` with `<div className="paper">`. The plain-text `<article style={{…}}>` becomes `<article className="paper resume-plain">`.
  - Side column: `<div className="stack">`. Notices per the conversion rules; `.panel` → `.card` per the rules; the inline paragraph styles become `.card-body p` defaults (add `.card-body p{line-height:1.55}` and `.muted{color:var(--text-muted)}`), and the `alignSelf` link becomes `className="btn btn-primary self-start"`.

  Append:

```css
/* ============ résumés ============ */
.resume-split{max-width:1200px; margin:0 auto; padding:var(--s-6) var(--s-6) var(--s-16); display:grid; gap:var(--s-6); grid-template-columns:minmax(0,1fr) 320px; align-items:start}
.resume-plain{color:var(--doc-text); padding:var(--s-12); white-space:pre-wrap; font-family:var(--serif); line-height:1.6}
.card-body p{line-height:1.55}
.muted{color:var(--text-muted)}
.self-start{align-self:flex-start}
.entry-row{display:flex; align-items:center; gap:var(--s-3); padding:var(--s-3) var(--s-4); color:inherit; text-decoration:none; transition:box-shadow .12s ease, border-color .12s ease}
.entry-row:hover{box-shadow:var(--shadow-md); border-color:var(--border-strong)}
.entry-meta{font-size:var(--text-xs); color:var(--text-muted)}
.resumes .stack + .stack{margin-top:var(--s-8)}
@media (max-width:1023px){.resume-split{grid-template-columns:1fr; padding-inline:var(--s-4)}}
```

  The existing `@media (max-width:1023px){.canvas-split{…}}` rule stays until Task 11.

- [ ] **Step 7: Side-panel components.** Convert `AssistantPanel.tsx`, `TailoringAudit.tsx`, `GenericPhrases.tsx`, `FindingsList.tsx` with the conversion rules: outer box → `.card` with `.card-head`/`.card-body`; severity labels → `tag tag-high|tag-med|tag-low` keeping the same words; streaming output keeps its `aria-live`; finding rows divided by `border-top:1px solid var(--border)` via a `.find-row` class (`display:flex; gap:var(--s-2); padding:var(--s-2) 0; border-top:1px solid var(--border); font-size:var(--text-sm)`). Do not change props or behaviour.

- [ ] **Step 8: Verify**

Run: `cd web && grep -c "style={{" "app/resume/[id]/page.tsx" app/resumes/page.tsx components/AssistantPanel.tsx components/TailoringAudit.tsx components/GenericPhrases.tsx components/FindingsList.tsx`
Expected: 0 each.

Run: `cd web && npm test && npm run build`
Expected: green.

Click through on `web-localtest`: `/resumes` lists the master and a tailored copy under its job; the résumé page shows the paper and side cards; inline editing still works (click a bullet, edit, it saves); **print preview** of the résumé matches a print preview taken on `main` before this branch (only the document, same page breaks). Screenshot light, dark, 375px.

- [ ] **Step 9: Commit**

```bash
git add web/lib/resume-groups.ts web/test/resume-groups.test.ts web/app/resumes web/app/resume web/components/AssistantPanel.tsx web/components/TailoringAudit.tsx web/components/GenericPhrases.tsx web/components/FindingsList.tsx web/app/globals.css
git commit -m "feat(web): Workbench résumé page and Résumés list"
```

---

### Task 8: Home and onboarding

**Files:**
- Modify: `web/app/page.tsx`, `web/app/start/page.tsx`, `web/app/start/build/page.tsx`, `web/app/review/page.tsx`
- Modify: `web/components/StartForm.tsx`, `web/components/BuildForm.tsx`, `web/components/AboutForm.tsx`, `web/components/TextOrFileInput.tsx`, `web/components/LocationFields.tsx` (if merged by then)
- Modify: `web/app/globals.css` (append `/* home */`)

- [ ] **Step 1: Home.** In `web/app/page.tsx`:
  - Add `<PageBar crumbs={[{ label: 'Home' }]} />` at the top.
  - Remove the `.identity` block (name, counts, Profile and Settings buttons): the sidebar's account menu now holds those links. Keep the counts as the page sub-line: `{resumes.length} résumés · {jobs.length} jobs`.
  - Keep the `page-head` headline and sub text as they are.
  - "Start something": keep the `.entries` grid and the five `.entry` links with their copy; the lead entry keeps `entry-lead`; the two placeholders get `<span className="tag tag-soon">Soon</span>` after the title.
  - "Your documents" becomes "Recent résumés": the first 3 of `resumes` as `.card entry-row` links (`tag tag-accent` Master / `tag` Tailored), followed by `<Link href="/resumes">See all résumés</Link>`. Add a "Recent jobs" block the same way with the first 3 of `jobs` (add `ORDER BY created_at DESC` to the jobs query) linking to `/jobs/{id}`, followed by `<Link href="/jobs">See all jobs</Link>`.
  - Replace the old `.entry` rules in `globals.css` with:

```css
.entries{display:grid; gap:var(--s-3); grid-template-columns:repeat(auto-fit,minmax(230px,1fr))}
.entry{
  padding:var(--s-4); border-radius:var(--r-lg); border:1px solid var(--border); background:var(--bg-surface); box-shadow:var(--shadow-sm);
  display:flex; flex-direction:column; gap:var(--s-1); text-decoration:none; color:inherit;
  transition:border-color .12s ease, box-shadow .12s ease;
}
.entry:hover{border-color:var(--border-strong); box-shadow:var(--shadow-md)}
.entry strong{font-size:var(--text-base); font-weight:600; display:flex; align-items:center; gap:var(--s-2)}
.entry span{color:var(--text-muted); font-size:var(--text-sm); line-height:1.5}
.entry-lead{border-color:var(--accent); background:var(--accent-subtle)}
.entry-lead strong, .entry-lead span{color:var(--accent-text)}
.entry-soon{opacity:.7}
.home-recent{display:grid; gap:var(--s-6); grid-template-columns:repeat(auto-fit,minmax(320px,1fr))}
```

- [ ] **Step 2: Onboarding and review.** `/start`, `/start/build`, `/review`: `PageBar` with the page name (`Profile`, `Build a résumé`, `Add a résumé`), body in `<div className="wrap col-720">`, each form section in a `.card` with `.card-body`, notices per the conversion rules, streaming output in a `.card`. Convert `StartForm`, `BuildForm`, `AboutForm`, `TextOrFileInput`, `LocationFields` inline layout styles to classes (`.stack`, `.row`, or a `/* forms */` class such as `.form-actions{display:flex; gap:var(--s-2); justify-content:flex-end}`). Behaviour, field names and copy stay the same.

- [ ] **Step 3: Verify**

Run: `cd web && grep -c "style={{" app/page.tsx app/start/page.tsx app/start/build/page.tsx app/review/page.tsx components/StartForm.tsx components/BuildForm.tsx components/AboutForm.tsx components/TextOrFileInput.tsx`
Expected: 0 each (a dynamic value such as a progress width may stay).

Run: `cd web && npm test && npm run build`
Expected: green.

Click through with a **new** throwaway account: sign-up → `/agree` → `/start` onboarding → guided builder → home. Light, dark, 375px. Screenshot home.

- [ ] **Step 4: Commit**

```bash
git add web/app/page.tsx web/app/start web/app/review web/components web/app/globals.css
git commit -m "feat(web): Workbench home and onboarding"
```

---

### Task 9: Secondary flows

**Files:**
- Modify: `web/app/jobs/[id]/questions/page.tsx`, `web/app/resume/[id]/metrics/page.tsx`, `web/app/letter/[id]/page.tsx`, `web/app/ats-check/page.tsx`
- Modify: `web/components/AtsUpload.tsx`, `web/components/CopyButton.tsx`, `web/components/PrintButton.tsx` (only if they carry inline styles)
- Modify: `web/app/globals.css`

- [ ] **Step 1: Questions and metrics pages.** `PageBar` crumbs: `Jobs / {company} / Questions` and `Résumés / {title} / Numbers`. Body `<div className="wrap col-640 stack">`; each question in a `.card` with `.card-body`; the submit row is `.form-actions` with the primary button last. Notices per the conversion rules.

- [ ] **Step 2: Cover letter page.** Same split as the résumé page: `PageBar` crumbs `Jobs / {company} / Cover letter`, actions Copy, Print, Delete (as today, primary none). Body `<main className="canvas-split resume-split">`, the letter inside `<div className="paper">`, facts and gaps as `.card`s in the side column, `AiNotice` first.

- [ ] **Step 3: ATS check.** `PageBar crumbs={[{ label: 'ATS check' }]}`; upload in a `.card`; each result row `.find-row` with a `tag tag-ok|tag-warn|tag-danger` carrying the existing words.

- [ ] **Step 4: Verify**

Run: `cd web && grep -c "style={{" "app/jobs/[id]/questions/page.tsx" "app/resume/[id]/metrics/page.tsx" "app/letter/[id]/page.tsx" app/ats-check/page.tsx components/AtsUpload.tsx`
Expected: 0 each.

Run: `cd web && npm test && npm run build`
Expected: green.

Click through: answer a question (score changes, `notice-ok` shows), fill a number, open a letter and print-preview it (only the letter prints), upload a PDF to the ATS check. Light, dark, 375px.

- [ ] **Step 5: Commit**

```bash
git add web/app/jobs web/app/resume web/app/letter web/app/ats-check web/components web/app/globals.css
git commit -m "feat(web): Workbench questions, numbers, letter and ATS check"
```

---

### Task 10: Accounts

**Files:**
- Modify: `web/app/login/page.tsx`, `web/app/signup/page.tsx`, `web/app/reset/page.tsx`, `web/app/agree/page.tsx`, `web/app/settings/page.tsx`, `web/app/admin/page.tsx`
- Modify: `web/components/AuthForm.tsx`, `web/components/ResetForm.tsx`, `web/components/DeleteAccountForm.tsx`, `web/components/ResetLinkButton.tsx`
- Modify: `web/app/globals.css` (append `/* auth */`)

- [ ] **Step 1: Signed-out pages.** Login, sign-up and reset render inside `.shell-public`. Wrap each page's content in:

```tsx
<div className="auth">
  <div className="card auth-card">
    <div className="card-body">
      {/* page-head, notices, form — existing JSX */}
    </div>
  </div>
</div>
```

`/agree` uses the same with `auth-card auth-card-wide`. Append:

```css
/* ============ auth ============ */
.auth{display:grid; place-items:start center; padding:var(--s-12) var(--s-4)}
.auth-card{width:100%; max-width:400px; box-shadow:var(--shadow-md)}
.auth-card-wide{max-width:560px}
.auth .page-head{padding:0 0 var(--s-4)}
.auth-switch{display:grid; grid-template-columns:1fr 1fr; gap:var(--s-1); padding:var(--s-1); background:var(--bg-subtle); border-radius:var(--r-md)}
.auth-switch a{padding:6px var(--s-3); border-radius:var(--r-sm); text-align:center; font-weight:500; color:var(--text-muted); text-decoration:none}
.auth-switch a:hover{color:var(--text)}
.auth-switch a[aria-current="page"]{background:var(--bg-surface); color:var(--text); box-shadow:var(--shadow-sm)}
```

and delete the four old `.auth-switch` rules. Social buttons in `AuthForm` become full-width `.btn` (add `.btn-block{width:100%}`).

- [ ] **Step 2: Settings and admin.** `PageBar` (`Settings`, `Admin`), body `wrap col-720 stack`, each section a `.card` with `.card-head` (its existing heading) and `.card-body`. The delete-account section's submit is `btn btn-danger`; the in-confirmation button may be filled: `.btn-danger-fill{background:var(--danger); border-color:var(--danger); color:#fff}`. Admin tables keep their markup; add `.table{width:100%; border-collapse:collapse; font-size:var(--text-sm)} .table th,.table td{padding:var(--s-2) var(--s-3); border-bottom:1px solid var(--border); text-align:left}`.

- [ ] **Step 3: Verify**

Run: `cd web && grep -c "style={{" app/login/page.tsx app/signup/page.tsx app/reset/page.tsx app/agree/page.tsx app/settings/page.tsx app/admin/page.tsx components/AuthForm.tsx components/ResetForm.tsx components/DeleteAccountForm.tsx`
Expected: 0 each.

Run: `cd web && npm test && npm run build`
Expected: green.

Click through **with throwaway accounts only**: sign up, agree, sign out, sign in, request a reset link from `/admin` (test admin from `web-localtest`'s `ADMIN_EMAILS`), use it, export data, delete the throwaway account. Never accept terms or delete on the owner's session. Light, dark, 375px.

- [ ] **Step 4: Commit**

```bash
git add web/app/login web/app/signup web/app/reset web/app/agree web/app/settings web/app/admin web/components web/app/globals.css
git commit -m "feat(web): Workbench sign-in, terms, settings and admin"
```

---

### Task 11: Legal, help, placeholders, clean-up

**Files:**
- Modify: `web/app/privacy/page.tsx`, `web/app/terms/page.tsx`, `web/app/help/page.tsx`, `web/app/email/page.tsx`, `web/app/linkedin/page.tsx`
- Modify: `web/components/NotBuiltYet.tsx`, `web/components/LegalContact.tsx`
- Modify: `web/app/globals.css`

- [ ] **Step 1: Legal and help.** Each page gets `<PageBar crumbs={[{ label: 'Privacy' }]} />` (or Terms / Help) only when rendered for a signed-in person — call `currentUser()` as the page already may, and render the bar when it returns a user. Body stays `.legal` (70ch). No copy changes.

- [ ] **Step 2: Placeholders.** `NotBuiltYet`: `PageBar` with the title, then `<div className="wrap col-640"><div className="card"><div className="card-body">` with `<span className="tag tag-soon">Not built yet</span>`, the blurb and the planned list. No inline styles.

- [ ] **Step 3: Clean-up.** Run `grep -rn "className=\"[^\"]*\b\(panel\|panel-head\|panel-body\|note\|pill\|pill-master\|pill-soon\|identity\|canvas-head\|canvas-head-in\)\b" web/app web/components`. Expected: no matches; fix any that remain using the conversion rules. Then delete from `globals.css`: `.panel*`, `.note`, `.pill*`, `.identity*`, `.canvas-head*`, the `--shadow` token line, and from `@media print` the `.canvas-head, .panel, .note` selectors. Run `grep -rn "var(--shadow)" web` — expected no matches.

Run: `cd web && grep -rc "style={{" app components | grep -v ":0"`
Expected: only `FitMeter.tsx` (score width) and any file with a documented dynamic value; list them in the PR.

- [ ] **Step 4: Final verification**

Run: `cd web && npm test && npm run build && DATABASE_URL=postgresql://x:x@127.0.0.1:1/x npm run build`
Expected: all green.

Click through every page in the spec's §4 table on `web-localtest`, signed out and signed in, light and dark, desktop and 375px. Print-preview a résumé and a letter and compare with `main`. Screenshots in the PR.

- [ ] **Step 5: Docs** — in `CLAUDE.md` update the design-tokens hard rule to: "Design tokens in `web/app/globals.css` follow the Workbench spec (`docs/superpowers/specs/2026-10-17-workbench-redesign-design.md`): spacing 4/8/12/16/24/32/48/64, type 12–28px, radii 6/8/12, two neutral shadows, no gradients/emoji/'AI-powered' copy, no exclamation marks." Add `nav.ts`, `resume-groups.ts`, `Sidebar`, `PageBar` to the module map.

- [ ] **Step 6: Commit**

```bash
git add web docs CLAUDE.md
git commit -m "feat(web): Workbench legal, help and placeholders; remove old chrome styles"
```

---

## Before pushing (any task)

- Scan the diff for key-shaped strings and `postgresql://user:pass@` (CLAUDE.md hard rule).
- If `claude/profile-location-dropdowns` merged into `main` since the branch started, rebase onto `main` and re-run Task 3's field check (`.field select` must use the shared rule).
