# Workbench redesign — design

Date: 2026-10-17. Status: approved by the owner in brainstorming (direction, accent, font, sections 1–4).

## Why

The current UI was a working prototype for testing. The owner finds it dated ("early 2000s
vibes") and wants a complete redesign of every page and the app chrome: modern, reliable, not
boring. Three directions were mocked on the résumé and job pages (Workbench, Editorial, Studio
canvas); the owner picked **A · Workbench** — a modern product tool in the manner of Linear or
Vercel — with a **cobalt** accent and **Geist** type.

## Scope

- In: every page under `web/app`, the app chrome (`layout.tsx`, `TopBar.tsx` → sidebar), every
  component in `web/components`, `web/app/globals.css`, and one new page, `/resumes`.
- Out: the résumé document. `web/styles/document.ts` (`DOCUMENT_CSS`), `render-resume.ts` and
  the .docx export are not touched; the exported résumé stays ATS-safe and print-identical. The
  page still shows that document white on the canvas in both modes.
- Out: copy changes beyond what a layout needs, new features, theme toggle.

## What changes from the 2026-09-19 UX spec

The owner approved relaxing these rules from `2026-09-19-ux-architecture.md` §8:

| Rule | Was | Now |
|---|---|---|
| Radii | 4px default, 8px max | 6px small controls, 8px buttons/inputs, 12px cards/panels |
| Shadows | one token, modals only | two neutral tokens, `--shadow-sm` and `--shadow-md` |
| Interface font | Inter | Geist (Source Serif 4 stays for the document) |
| Navigation | top bar | left sidebar (top bar under 1024px) |

Unchanged: spacing 4/8/12/16/24/32/48/64 only; type 12–28px; no gradients (decorative or in
meters — the fit ring is SVG strokes); no emoji; no "AI-powered" copy; no exclamation marks;
no outcome claims; 2px accent focus outline; `prefers-reduced-motion` disables transitions;
colour is never the only signal.

## 1. Tokens (`web/app/globals.css`)

Names stay where they exist so unconverted pages keep working mid-rollout; new names are added.

### Light

```css
--bg-page:#f6f7f9; --bg-surface:#ffffff; --bg-subtle:#eef0f3;
--border:#e6e8ec; --border-strong:#d5d9e0;
--text:#0f1115; --text-muted:#5b616e; --text-faint:#8a8f99;

--accent:#2f5bea; --accent-hover:#2449c8; --accent-subtle:#eef2fe; --accent-text:#1f3fae;

--ok:#12b76a;     --ok-subtle:#e7f8ef;     --ok-text:#067647;
--warn:#f79009;   --warn-subtle:#fef3d6;   --warn-text:#a15c07;
--danger:#f04438; --danger-subtle:#fde8e8; --danger-text:#b42318;

--shadow-sm:0 1px 2px rgba(16,24,40,.05);
--shadow-md:0 1px 2px rgba(16,24,40,.06), 0 8px 24px -6px rgba(16,24,40,.12);
--shadow:var(--shadow-sm);   /* old name, kept for unconverted pages */

--r-sm:6px; --r-md:8px; --r-lg:12px;
--sidebar-w:220px;
```

### Dark (same two-block pattern as today: `prefers-color-scheme` guarded by `:not([data-theme="light"])`, plus `[data-theme="dark"]`)

```css
--bg-page:#0b0c0f; --bg-surface:#14161b; --bg-subtle:#1b1e24;
--border:#242730; --border-strong:#333845;
--text:#e8eaee; --text-muted:#a0a6b2; --text-faint:#6f7582;

--accent:#6f8dff; --accent-hover:#8ea8ff; --accent-subtle:#1a2550; --accent-text:#a9bcff;

--ok:#32d583;     --ok-subtle:#0f2a1d;     --ok-text:#6ce9a6;
--warn:#fdb022;   --warn-subtle:#2e2410;   --warn-text:#fec84b;
--danger:#f97066; --danger-subtle:#33161a; --danger-text:#fda29b;

--shadow-sm:0 1px 2px rgba(0,0,0,.4);
--shadow-md:0 1px 2px rgba(0,0,0,.4), 0 8px 24px -6px rgba(0,0,0,.6);
```

Primary buttons in dark mode use `--accent` with `--bg-page` text (dark on light blue), as in
the approved accent mockup.

The `--doc-*` tokens are unchanged: the document is always light.

### Contrast

Every `*-text` token and `--text-muted` must reach WCAG AA (4.5:1) on `--bg-surface` and on its
own `*-subtle` background, in both modes; the plan includes a test that checks this from the
token values. Status dots (`--ok`, `--warn`, `--danger`) are decoration next to text and need
3:1 only.

### Type

- Geist via `next/font/google` (`Geist`, variable `--font-sans`), replacing Inter in
  `layout.tsx`. Source Serif 4 stays as `--font-serif`. Self-hosted, as now.
- Scale unchanged: `--text-xs` 12 … `--text-2xl` 28. Body UI text 14px, line-height 1.45.
- Headings 600, `letter-spacing:-.02em` at `--text-xl` and up, `-.01em` below.
- Tabular numerals on scores, counts and dates (`.tnum`).

## 2. Layout chrome

### Signed in

```
┌──────────┬───────────────────────────────────────────────┐
│ ■ Name   │ Jobs / Northwind Health        [Letter] [Tailor]│  ← page header
│          ├───────────────────────────────────────────────┤
│ Home     │                                               │
│ Résumés  │   page content                                │
│ Jobs     │                                               │
│          │                                               │
│ LinkedIn │                                               │
│  Soon    │                                               │
│ Cold mail│                                               │
│  Soon    │                                               │
│          │                                               │
│ (PR) Pri▴│                                               │
└──────────┴───────────────────────────────────────────────┘
```

- `components/Sidebar.tsx` replaces `TopBar.tsx` for signed-in people. Fixed, `--sidebar-w`
  wide, `--bg-surface`, right border. Logo mark (a cobalt 18px rounded square) + `SITE_NAME`.
- Items, in order: **Home** `/`, **Résumés** `/resumes`, **Jobs** `/jobs`; a gap; **LinkedIn**
  `/linkedin` and **Cold email** `/email`, muted with a "Soon" tag (they are placeholders).
  Current item: `--accent-subtle` background, `--accent` text, `aria-current="page"`. The
  matching logic stays as today (`/` exact, others by prefix; `/resume/…` also lights Résumés,
  `/letter/…` lights Jobs).
- The account menu moves to the bottom of the sidebar: avatar + name; the same native
  `<details>` menu as today, opening upward, with the same items (Profile, Settings, Help,
  Admin when admin, Sign out) and the same close-on-navigate/outside-click/Escape behaviour.
- Content column: `margin-left:var(--sidebar-w)`; inner max width 1200px, 24px side padding.
- **Page header** (`.page-bar`): one row, breadcrumb or title left, page actions right
  (primary action last, in cobalt). Replaces both `.canvas-head` and the loose crumbs on the
  job page. Sticky at the top of the content column, `--bg-surface`, bottom border.

### Under 1024px

The sidebar becomes a 56px top bar: logo left, a menu button right that opens a sheet with
the same items and account links (a `<details>` panel, so no new JS). Two-column pages stack
to one column, side panels below the document. Page actions wrap onto a second line.

### Signed out

Login, sign-up, reset, agree, privacy, terms, help when signed out: no sidebar. A slim top bar
(logo left; Sign in / Create account right, as today) and a centred column: forms in a 400px
card (`.card` with `--shadow-md`), legal text at 70ch.

### Footer

Kept, restyled: one line of muted links at the bottom of the content column (not under the
sidebar).

### Print

`@media print` hides the sidebar, the mobile bar and the page header as it hides the top bar
today, and removes the content column's left margin. The printed result must be unchanged.

## 3. Components

All styling lives in `globals.css` classes; as each page is converted, its inline `style={{}}`
objects move into named classes. No CSS framework or new dependency.

| Component | Spec |
|---|---|
| `.btn` | 32px tall, `--r-md`, 12px side padding, 500 weight, `--bg-surface`, `--border-strong`, `--shadow-sm`. Hover `--bg-subtle`. |
| `.btn-primary` | `--accent` background and border, white text (dark mode: `--bg-page` text), hover `--accent-hover`. |
| `.btn-danger` | `--danger-text` text, `--border-strong` border; filled `--danger` only inside a confirmation. |
| `.btn-sm` | 28px tall, used in dense rows. |
| `.field` inputs, textarea, select | 36px tall (textarea free), `--r-md`, `--border-strong`, `--bg-surface`. Focus: `--accent` border plus a 3px `--accent-subtle` ring, and the 2px outline for keyboard focus. `select` gets a custom chevron (inline SVG background is allowed: it is an icon, not a gradient). |
| `.card` | `--bg-surface`, 1px `--border`, `--r-lg`, `--shadow-sm`, 16px padding. `.card-head` for a titled card. Replaces `.panel` and `.identity`. |
| `.entry` (home/list tiles) | A `.card` that is a link; hover raises to `--shadow-md` and `--border-strong`; no translate. |
| `.paper` | The frame around the on-screen résumé: `--r-lg`, `--shadow-md`, no border in light mode, `--border` in dark. |
| `.notice` + `.notice-error/-warn/-ok/-info` | `--r-md`, the matching `*-subtle` background, `*-text` text, 12px padding, optional leading 16px icon (inline SVG). Errors keep `role="alert"`. Replaces `.note` with coloured left borders. |
| `.tag` + `.tag-high/-med/-low/-ok/-warn/-danger/-soon` | 99px pill, 12px, 600, `*-subtle` background and `*-text` text. Replaces `.pill`. |
| `.auth-switch` | Kept as a segmented control: `--bg-subtle` track, `--r-md`, current segment `--bg-surface` with `--shadow-sm`. |
| `FitMeter` | Two variants. **Large** (job page): a 120px SVG ring, 10px stroke, track `--border`, value arc in the band colour (`--ok` / `--warn` / `--danger`), the score in the centre at `--text-2xl`, "of 100" under it; below, the band label in `*-text` and "N of M must-haves shown". **Small** (lists): the existing bar, 6px, `--r-sm`. Both keep `role="meter"` and the full text label; colour is never the only signal. |
| Requirement row | `.card`-like row with a 8px status dot, the requirement in 500 weight, then the evidence quote or "Not on your résumé" in muted text, and a status `.tag` for text. |
| Findings list | Rows divided by `--border`, a severity `.tag` then the finding. |
| `[METRIC NEEDED]` and number flags | Drawn by `MarkedText` as today; restyled as `.tag-warn` chips. They are editing chrome and never reach the export. |

Status words stay as today ("Shown", "Partly", "Not shown", "Check yourself"; "Strong fit",
"Partial fit", "Big gaps").

## 4. Pages

| Page | Layout |
|---|---|
| `/` Home | Greeting + "what to do next" cards (the existing `entry` set, restyled), then the three most recent résumés and jobs with "See all" links. |
| `/resumes` **new** | List of masters, then tailored copies grouped under their job, as `.entry` cards. Same `sid` filter and query shape as the home page's "Your documents"; masters have no delete button. |
| `/resume/[id]` | Page header: crumb (Résumés / title) and actions (Fill in N numbers primary, PDF, Word, ATS check, Delete copy for tailored). Body: `.paper` document left, 320px side column right with review findings, AI notice, audit and generic phrases as `.card`s. |
| `/resume/[id]/metrics` | Single 640px column of `.card` questions. |
| `/jobs` | Header with "Add job" primary; list of jobs as rows: company, role, small fit bar, applied tag. |
| `/jobs/[id]` | Header: crumb (Jobs / company) and actions (Cover letter, Tailor résumé primary). Title block (role, company). Two columns: 220px `.card` with the large fit ring and the disclaimer, then the questions call-out (`.notice-info` link) and requirement rows grouped as today. Stale-score notice above the ring. |
| `/jobs/[id]/questions` | Single 640px column of `.card` questions, primary Save at the bottom. |
| `/letter/[id]` | Same split as the résumé page: letter on `.paper`, side cards for facts and gaps. |
| `/review`, `/start`, `/start/build` | Single 720px column; forms in `.card`s; streaming output in a `.card`. |
| `/ats-check` | Upload `.card`, then results as rows with ok/warn/danger tags. |
| `/login`, `/signup`, `/reset`, `/agree` | Signed-out layout, centred 400px card (agree: 560px). |
| `/settings`, `/admin` | Sidebar layout, sections as `.card`s; delete-account in a card with `.btn-danger`. |
| `/privacy`, `/terms`, `/help` | 70ch column of text; sidebar when signed in, signed-out layout otherwise. |
| `/email`, `/linkedin` | `NotBuiltYet` as a centred `.card` with a `.tag-soon`. |

## 5. Rollout order

Each step ships on its own; unconverted pages keep working on the old class names, which are
kept until the last step removes the unused ones.

1. **Foundation:** tokens (light and dark), Geist, the sidebar + mobile bar + signed-out bar,
   page header, footer, print rules, and every component class above. `FitMeter` ring.
2. **Jobs:** `/jobs/[id]`, `/jobs`.
3. **Résumés:** `/resume/[id]`, new `/resumes`.
4. **Home and onboarding:** `/`, `/start`, `/start/build`, `/review`.
5. **Secondary flows:** `/jobs/[id]/questions`, `/resume/[id]/metrics`, `/letter/[id]`, `/ats-check`.
6. **Accounts:** `/login`, `/signup`, `/reset`, `/agree`, `/settings`, `/admin`.
7. **The rest and clean-up:** `/privacy`, `/terms`, `/help`, `/email`, `/linkedin`; delete
   classes and tokens no page uses any more (`.topbar`, `.canvas-head`, `.panel`, `.note`,
   `.pill`, `--shadow`).

## Verification

- Vitest: the token contrast test (§1), which parses `globals.css`; a unit test for the
  `/resumes` grouping (masters first, tailored copies under their job) as a pure function in
  `web/lib`; existing 141 tests stay green. The `/resumes` query's `sid` filter is checked in
  review (tests here do not touch the database).
- `npm run build` green, including with the unreachable `DATABASE_URL` check from CLAUDE.md.
- Each step clicked through on the `web-localtest` server (port 3001) with an `@example.com`
  account, at desktop and 375px, light and dark. Screenshots in the step's PR.
- Print preview of a résumé before and after step 1 and step 3: identical.

## Coordination

- `claude/profile-location-dropdowns` (another session, not pushed) adds `.field select` and
  `LocationFields.tsx`. Step 1's `.field` rules must include `select`; rebase onto `main` after
  it merges.
- Step 1 replaces `TopBar.tsx`; no other branch is known to touch it.
