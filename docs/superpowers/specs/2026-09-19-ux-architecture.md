# Job Search Kit — UX Architecture

**Date:** 2026-09-19
**Status:** Proposed
**Companion to:** `docs/superpowers/specs/2026-09-19-web-app-design.md` (technical design)

This document decides what the user sees and touches. The technical design decided what
runs. Where the two disagree, section 10 lists the conflicts.

---

## 0. The one-sentence product

**You paste a résumé, it comes back better, you download a PDF.**

Everything else — accounts, the eight capabilities, the chat loop, versioning — is
plumbing that exists to make that sentence true more than once. If a UI decision makes
that sentence harder to reach, it is the wrong decision.

Design consequence: **the résumé is the product, not the conversation.** The user did not
come here to talk to an AI. They came here because they are applying for a job on Thursday.

---

## 1. Screen inventory

Fifteen routes. Some are one component with a flag.

### Public (unauthenticated)

| Route | Purpose | Notes |
|---|---|---|
| `/` | Landing. What it does, one screenshot of real output, sign in. | Not a marketing site. One screen, one CTA. |
| `/privacy` | Required. What's stored, for how long, that content goes to a model provider. | Static markdown. Legally load-bearing (résumés are personal data). |
| `/terms` | Required once there is an account. | Static markdown. |

That is the whole public surface. **No pricing page** (nothing is charged), **no blog**,
**no about**, **no /features**. Add them when there is traffic to convert.

### Authenticated

| Route | Purpose |
|---|---|
| `/app` | **Home.** Your résumés + "what do you want to do" entry points. The only true hub. |
| `/app/resume/[id]` | **The canvas.** Résumé document view — read, edit, run capabilities against it, export. This is where users spend 80% of their time. |
| `/app/resume/[id]/versions` | Version list for one résumé (master vs tailored copies, run history). |
| `/app/resume/new` | Upload/paste an existing résumé, or start `resume-build`. A funnel, not a destination. |
| `/app/jobs` | Saved job descriptions (output of `job-analyzer`: requirements + keywords). |
| `/app/jobs/[id]` | One analyzed JD + the résumés tailored to it. |
| `/app/linkedin` | LinkedIn rewrite workspace. Structurally separate — it produces profile copy, not a résumé document. |
| `/app/letters/[id]` | Cover letter document view. Same shell as the résumé canvas, different schema. |
| `/app/settings` | Account, delete-my-data, usage-against-quota. |
| `/app/run/[id]` | **Full-page run view** — where a generation streams. Often rendered as a panel inside the canvas rather than navigated to, but it needs a URL so a user can reload mid-run and not lose it. |

### Deferred out of v1 — explicitly

- **Dashboard / analytics.** "Applications sent", "keyword match score over time". Zero
  evidence anyone wants it; weeks of work.
- **Side-by-side résumé diff.** Tempting, expensive, and version-list + "restore" covers
  the actual need ("did it make things worse?"). Revisit after users complain.
- **Theme picker** (Classic / Modern / Compact from the CLI kit). Ship **one** theme.
  Three themes means three print stylesheets to test on the print pipeline. Cost:
  users' résumés look alike. That is not a v1 problem — it is a several-hundred-users
  problem.
- **Onboarding tour / empty-state coach marks.** The empty states carry the teaching.
- **Team / sharing / "send to a friend for review".**
- **Job scraping from a URL.** Paste-only. URL scraping fails on LinkedIn and Workday —
  the two places everyone applies — and a broken feature is worse than an absent one.
- **In-app notifications, email digests, password recovery** (Google OAuth only).
- **A real rich-text editor.** See §5.4.

---

## 2. The central interaction question

### The three candidates, honestly

**(a) Chat-first.** One conversational surface. The eight capabilities are opening
prompts. Cheapest possible build — the harness is already a chat loop, so the UI is a
message list, a textarea, and a send button. One screen, done in a weekend.

And it is wrong for this product, for three reasons that compound:

1. **The output is not chat-shaped.** The model emits structured résumé JSON. Rendering
   that as a chat bubble means either dumping JSON at a non-technical user, or rendering a
   document *inside* a message — at which point you have built the canvas anyway, just
   trapped inside a scrolling transcript where it scrolls away.
2. **Chat has no state the user can see.** "Which version is current?" is unanswerable in
   a transcript. Users will scroll up hunting for the good one. This is the single most
   predictable failure mode.
3. **Stressed users read chat as work.** A blinking cursor asks "what do you want?" of
   someone who does not know what they want — they want their résumé to stop being bad.
   Chat-first outsources the hard thinking back to the person least equipped to do it.

**(b) Form-first.** Structured inputs per capability; chat only for `resume-build` and
`resume-interview`. Honest about what each capability needs, legible, and very mobile-
friendly (a form is a stack of fields). Trustworthy — forms feel like software, chat feels
like a slot machine.

Its failure: **eight forms is eight screens to design, build and maintain**, and the
chat loop has to exist anyway for two of them. You pay for two interaction paradigms and
the seams between them show. Worse, a form implies the capability is a one-shot
transaction — but `resume-improve` genuinely benefits from "actually, make bullet 3 about
the migration instead". A form has nowhere to put that.

**(c) Hybrid — document canvas primary, assistant panel beside it.** The résumé is the
screen. The capabilities act *on* it. The assistant is a panel that streams output and
takes follow-ups.

### Recommendation: (c) hybrid, with a specific shape

Build **one canvas route** (`/app/resume/[id]`) with:

- **the document** — always visible, always the current state, always exportable;
- **an action rail** — the capabilities that apply to this document, as buttons;
- **an assistant panel** — opens when an action runs, streams, and stays open for
  follow-up turns. Collapses to nothing when idle.

Why this and not (b), given (b) is more honest per-capability: the canvas gives you the
one thing neither alternative does — **a stable answer to "where is my résumé right
now"**. Every capability becomes "a thing that happened to my document", with a version
behind it. The user's mental model is a file they own, which is the model they already
have from Word. Chat's mental model is a conversation they must curate, which is new
work.

Why this and not (a), given (a) is cheaper: (a) is only cheaper until step 3 of the
technical sequencing (the render path). The moment there is résumé JSON, something has to
display it. Canvas-first means that thing is the app. Chat-first means it is a widget
inside a bubble and then a second thing on an export screen.

**What (c) costs.** The canvas is real work — roughly the whole UI budget. A
render-JSON-to-readable-document component, an editing affordance, a version concept, a
panel that streams. Call it two to three weeks of evenings versus a weekend for chat-first.
**That is the right trade**, because it is spent on the one screen that decides whether
the product feels like a tool or a toy.

**What to cut to afford it.** Build the canvas *read-only with field editing* first
(§5.4). Skip rich text entirely. Skip diff. Skip themes. One good screen beats five
mediocre ones.

**The inputs problem (b) solves that (c) must still solve.** `resume-tailor` needs a JD.
`cover-letter` needs a JD and a company. Do **not** ask for these in chat prose —
"paste the job description" in a textarea inside a transcript is a terrible input. Instead:
each capability button opens a **small structured sheet** (one to three fields, a Run
button) before the assistant panel takes over. This is form-first for *inputs* and
chat for *iteration* — the best half of each. Cost: one small `<Sheet>` component and
eight tiny field configs. Cheap.

The two multi-turn flows (`resume-build`, `resume-interview`) skip the sheet and go
straight into the panel — that is their whole nature. See §3.3 for how to make that not
feel like chat.

---

## 3. Primary user journeys

### 3.1 First-time user, has a résumé, wants it reviewed

The critical path. If this is not good, nothing else matters.

1. **`/`** — headline states the promise, one real output screenshot, "Continue with
   Google". No feature grid.
2. **Google OAuth** — one tap. Return to `/app/resume/new`, not `/app`. A new user with
   no résumés on a hub screen sees an empty room.
3. **`/app/resume/new`** — one box that accepts **paste or file drop**, same box. Copy:
   "Paste your résumé, or drop the file." A "Skip — I don't have one yet" link underneath
   routes to `resume-build`.
   - File is parsed to text client-side-ish then discarded (per the technical design).
     **Show the extracted text and let them fix it** — PDF extraction mangles things, and a
     silently mangled résumé produces a confidently wrong review. This is a 20-line
     textarea, not a feature.
4. **Parse → canvas.** A first model call converts the pasted text to résumé JSON. This is
   itself a 10–60s generation (§4). Show it landing section by section — see §4.3.
   **Do not make this a separate "parsing" screen.** The user lands on the canvas and
   watches their résumé appear in it.
5. **Canvas, populated.** The document reads correctly. The action rail is visible.
   Primary action highlighted: **Review this résumé**.
6. **Review runs.** Assistant panel opens, streams the diagnostic. Findings render as a
   list of **issues anchored to sections** — each finding gets a "Jump to" that scrolls the
   canvas. This is the moment the product justifies itself: criticism the user can act on,
   pointing at their actual document.
7. **Next step offered, not assumed.** At the end of the review: two buttons — *Fix these
   for me* (`resume-improve`) and *Fill in my missing numbers* (`resume-interview`). One
   click continues; the canvas is already loaded.

Time to value: under two minutes of user effort, most of it waiting.

### 3.2 Returning user, tailoring to a specific job

1. **`/app`** — their résumés, master pinned first. Click master.
2. **Canvas.** Action rail → **Tailor to a job**.
3. **Sheet opens:** "Paste the job description" (textarea, required), "Company"
   (text, optional — prefilled if the JD names it after analysis), and a "Use a saved job"
   picker if they have any. Run.
4. **Behind one click, two things happen** — the JD is analyzed (keywords, requirements)
   *and* the résumé is tailored. Do not make `job-analyzer` a separate user-facing step
   here. The kit's CLI workflow runs them in sequence; the web app should collapse them.
   The analysis result is saved to `/app/jobs` as a by-product, and surfaced in the panel
   as **"Matched keywords: 14 of 19"** with the misses listed — that list is the most
   useful artifact the analyzer produces.
5. **A new résumé version is created — a copy, not an edit.** Never mutate the master
   during tailoring. The canvas switches to the copy, with a persistent breadcrumb:
   `Master résumé › Tailored for Acme — Staff Engineer`. This mirrors the kit's
   two-tier model (§README "Strategy") and is the single most important structural idea
   to get right, because getting it wrong destroys the master résumé.
6. **Export PDF.** Filename auto-set `Acme_StaffEngineer_Resume.pdf`.
7. **Offered next:** *Write a cover letter for this job* — the JD is already in hand, so
   this is a one-click follow-on with zero extra input. Highest-value adjacency in the
   product.

### 3.3 Building from scratch (multi-turn)

The hardest UX in the app, and the one most likely to be abandoned halfway.

1. **`/app/resume/new` → "I don't have one yet"**, or `/app` → **Build from scratch**.
2. **Canvas opens empty** — a skeleton résumé with section headings (Summary, Skills,
   Experience, Education) greyed out. **This is the key move: the user sees the destination
   before the journey.** The assistant panel is open beside it and asks the first question.
3. **One question at a time**, each rendered as a **question card, not a chat bubble**:
   a heading, a short why-this-matters line, an input sized to the answer (short text,
   long text, date range, a repeater for jobs), and a **Skip** button. Skipping is
   non-negotiable — a stressed user who cannot skip a question they don't have an answer
   to, leaves.
4. **The canvas fills in as answers land.** Answer the job title → it appears in
   Experience. This converts a long interrogation into visible progress and is the
   difference between this flow working and not working. It is also cheap: you are already
   rendering résumé JSON, and each turn returns more of it.
5. **Progress is explicit** — "Experience, 2 of 4 roles" — not a spinner. Users need to
   know how much is left.
6. **Resumable.** Intake state persists per turn. Closing the tab and coming back later
   must work; this is a 20-minute flow and people get interrupted. Save conversation state
   server-side on every turn (the `runs` table already exists).
7. **Bail-out at any point:** "Finish with what I have" produces a real, exportable,
   incomplete résumé with `[METRIC NEEDED]` markers intact. A partial résumé is worth
   something; an abandoned flow is worth nothing.

`resume-interview` is the same machinery pointed at an existing document: it walks the
`[METRIC NEEDED]` markers, one card per gap, canvas updating as each is filled. Build the
question-card component once, use it for both. That is the whole reason these two flows
are cheaper than they look.

---

## 4. The waiting problem

10–60 seconds is long enough that "loading" reads as "broken". Three rules.

### 4.1 Never show an indeterminate spinner for a model run

A spinner means "unknown duration, possibly forever". Everything below exists to replace it.

### 4.2 Stream text where the output is text

`resume-review`, `job-analyzer`, `linkedin-rewrite` and follow-up turns produce prose.
Stream it token by token into the panel. Streaming prose is self-evidently alive; nothing
further is required.

### 4.3 For document generation, stream *into the document*, not into a transcript

For `resume-improve` / `tailor` / `build`, the model emits JSON. Two options:

- **Naive:** buffer until valid JSON, then swap the canvas. 45 seconds of nothing, then a
  flash. Feels broken, and the flash makes it feel like the old résumé was thrown away.
- **Recommended:** parse the stream incrementally and render sections as they complete.
  The user watches Summary land, then Skills, then each role. **Section-level granularity
  is enough — do not attempt token-level document morphing.**

Implementation, cheaply: have the core prompts emit sections in a fixed order, and
split the stream on a section boundary the model reliably produces (a top-level key in
order). Render each completed section; show the next section's heading with a subtle
placeholder. If incremental parsing fails, fall back to §4.4 — do not let this block the
launch. **`ponytail:` naive brace-depth section splitting; swap for a streaming JSON
parser if the model's formatting drifts.**

### 4.4 Fallback progress: named stages, not percentages

Where incremental rendering is not available, show a **stage list** that advances:

```
✓  Read your résumé
✓  Matched against the job description
→  Rewriting your experience section
   Checking ATS formatting
```

Stages are derived from real progress where possible and time-estimated where not. A
time-estimated stage list is a benign lie; a percentage bar is a specific lie the user
will catch. Never let the last stage complete before the content arrives.

### 4.5 The rest of the waiting rules

- **Optimistic entry.** The canvas and version breadcrumb appear the instant the run
  starts. The destination exists before the content does.
- **The document never disappears.** During a rewrite, the old résumé stays on screen,
  dimmed, with sections replaced in place. Blanking a user's résumé while an AI thinks
  about it is a small act of terror.
- **Cancel is always available** and actually aborts the request. Non-negotiable — it is
  the difference between waiting and being trapped.
- **Reload-safe.** `/app/run/[id]` means a refresh mid-generation rejoins or shows the
  completed result. Mobile browsers background tabs and kill connections; assume the
  connection dies.
- **Degraded-model disclosure** (technical design requires it): a quiet inline line at
  the top of the result — *"Served by a backup model — output may be weaker. Re-run?"*
  Not a modal, not a toast. Plain, and with the remedy attached.
- **Errors say what to do.** "That took too long. Your résumé is unchanged — try again?"
  Never a stack trace, never "something went wrong".

---

## 5. Component inventory

Roughly 20 components. The first six are the app; the rest are furniture.

### 5.1 `ResumeDocument` — the core

Renders résumé JSON as a readable document. **Shares the ATS HTML template's structure and
type scale** so what the user sees is what prints. Not a preview of a PDF — the same thing.

- Props: `resume: ResumeJSON`, `mode: 'read' | 'edit'`, `pendingSections?: string[]`.
- Sections in fixed ATS order: Summary, Skills, Experience, Education, Certifications
  (`shared/ats-rules.md` mandates these headings spelled exactly — **the UI must not let
  a user rename a section**).
- Every section carries a stable anchor id so findings can link to it.
- Renders `[METRIC NEEDED]` as a **visually distinct inline chip**, not raw bracket text.
  It is an action ("tell me this number"), not a formatting error. Clicking one opens the
  inline editor for that bullet; a count of them appears in the canvas header with a
  "Fill these in" button routing to `resume-interview`.
- Page-break awareness: a subtle one-page marker, since one page is an ATS rule for <10
  years' experience. A line, not a paginated page metaphor.

### 5.2 `ResumeEditor` — inline field editing

**Not a rich text editor.** Click a bullet, it becomes a `<textarea>` sized to content;
blur or ⌘/Ctrl+Enter saves. Click a job title, it becomes an `<input>`. Plus a
delete-bullet control and an add-bullet button per role.

This is the whole editing story for v1 and it is deliberate. The data is structured;
structured data wants field editing. A rich text editor would let users produce content
the JSON schema cannot represent, which breaks the render path. **Skipped: drag-to-reorder
roles and bullets** — add it when someone asks twice. (Reordering roles is forbidden
anyway: ATS rules require reverse-chronological.)

### 5.3 `AssistantPanel`

Right-side panel on desktop (~400px, collapsible), bottom sheet on mobile. Holds: the
streaming output, the turn history for the current run, a follow-up input, a Cancel
control, and the stage list. Has an idle state that is *closed*, not empty — an empty chat
box sitting beside a document is an unanswered question the user cannot answer.

### 5.4 `QuestionCard`

One structured question inside the panel: heading, why-this-matters line, a typed input
(short text / long text / date range / repeater), Skip, Next. Powers `resume-build` and
`resume-interview` entirely. Build this well and the two expensive flows become cheap.

### 5.5 `CapabilityRail` + `CapabilitySheet`

The rail: contextual actions for the current document (§6). The sheet: a modal with one to
three fields and a Run button, driven by a per-capability config object
(`{ id, label, fields[], multiTurn: boolean }`). Eight configs, one component. **This is
where the "eight capabilities" live in code — as data, mirroring the technical design's
"the difference between capabilities is markdown, not branching".**

### 5.6 `RunStatus`

The stage list + streaming indicator + cancel + degraded-model notice. Used inside the
panel and standalone at `/app/run/[id]`.

### 5.7 Supporting cast

| Component | Notes |
|---|---|
| `DocumentCard` | Résumé/letter in a list: title, target job, updated-at, version count. |
| `VersionList` | Versions of one document with restore. Restore creates a new version; nothing is ever destroyed. |
| `TextOrFileInput` | The paste-or-drop box, plus the confirm-extracted-text step (§3.1.3). |
| `FindingsList` | Review output: severity, finding, jump-to-section link. |
| `KeywordMatch` | Matched / missing JD keywords as plain chips. **No score, no percentage** — a fake precision number invites optimizing for it. Say "14 of 19 matched" and list the 5. |
| `ExportButton` | Triggers print-to-PDF; contains the honest mobile caveat (§7). |
| `QuotaMeter` | Runs used this month. Visible in settings only until near the limit, then in the header. |
| `EmptyState` | Does the onboarding work. Every empty screen states what goes here and has one button. |
| `ConfirmDialog` | Delete account, delete résumé. Both destructive and both rare. |
| `ThemeToggle` | Light / Dark / System. Three buttons, persisted. |

---

## 6. Information architecture

### The eight are not peers

They fall into three roles, and the UI must show that:

**Entry points — "I want to start something"** (on `/app`, as large cards):
- **Improve my résumé** (upload → review/improve)
- **Build a résumé from scratch** (`resume-build`)
- **Tailor to a job** (`resume-tailor`; requires a résumé — if none exists, routes to
  upload first)
- **Fix my LinkedIn** (`linkedin-rewrite`)

Four entry points. Not eight. A stressed person can choose between four things.

**Document actions — "do something to this"** (on the canvas rail, contextual to the
document):
- Review · Improve · Tailor to a job · Fill in my numbers · Write a cover letter ·
  Export PDF

**Invisible / by-product:**
- **`job-analyzer` is not an entry point.** It runs inside tailoring and cover-letter
  generation. Its output is saved to `/app/jobs` and browsable, but nobody arrives here
  wanting to "analyze a job description" — they want a tailored résumé. Exposing the
  analyzer as a top-level capability is exposing an implementation step as a feature.
- **`cover-letter` is a follow-on**, offered after tailoring when the JD is already
  loaded. It appears as an entry point only from `/app/jobs/[id]`.

That's the grouping: **4 entry points, 6 contextual actions, 1 hidden step, 1 follow-on.**
Eight capabilities, none of them lost, none of them shouting.

### Navigation — revised after the mockup

A single top bar: **Home · Jobs · Cold email · LinkedIn**, then the avatar menu.

Two changes from the original proposal, both from walking the mockup:

- **Home replaces "Résumés"** and carries three things at once: who you are (name, email,
  runs used against quota), the four starting actions, and your documents. A separate hub
  and résumé list was one screen too many.
- **Cold email is top-level**, not a follow-on hanging off a job. It frequently has no job
  description at all — a referral ask, a recruiter nudge, a company with nothing posted.
  Burying it under a job would have hidden its most common uses.

**Jobs is the hub the product turns on.** A job card owns its artifacts, shown as a row where
`✓` opens what exists and a dashed `+` generates what doesn't, working from the posting already
stored. Paste once, produce many. This is the structure that keeps someone applying to thirty
jobs from losing track of what they sent where — and it is the single best reason this is an
app rather than a chat.

Each card also carries a match meter ("14 of 19 requirements matched"). When a posting scores
badly the card says so plainly, because telling someone a job is aimed a level above them
saves them an hour they would rather spend elsewhere.

**Interview prep** is designed and mocked up (questions sourced from the gaps, from the user's
own résumé claims, and from the posting's language) but sits outside v1. Its chip appears on
job cards as a dashed `+`.

### LinkedIn has two modes, not one

The route opens by asking what to work from, because the workflow genuinely differs:

- **Audit and rewrite** — the user uploads their LinkedIn export (Profile → Resources → Save
  to PDF). The audit quotes their real headline and About text back at them, and every rewrite
  step shows Currently / Suggested. This is the strong version: criticism of a real artifact.
- **Generate only** — no profile supplied, so the copy is written from the master résumé.
  **Step 1 does not exist in this mode.** You cannot audit a profile you have not seen, and
  pretending otherwise would produce invented criticism — the exact failure the kit's
  no-fabrication rule exists to prevent.

A source strip above the steps names what was read (filename, page count, when) with controls
to replace it or switch modes. The uploaded file is parsed to text and discarded like any other
upload, and the UI says so — a page asking for someone's whole professional profile should
state what happens to it.

**LinkedIn sits outside the résumé hierarchy on purpose.** It produces profile copy to
paste into LinkedIn, not a document to export. Forcing it into the résumé canvas would
mean building a second document type for a different shape of output. Give it its own
route with a sequenced five-step layout (the kit's five prompts, run in order, each
output copyable) and keep the canvas pure.

### Breadcrumbs carry the two-tier model

`Résumés › Master › Tailored for Acme — Staff Engineer`. Users must never wonder which
copy they are editing. This is the highest-stakes clarity problem in the app.

---

## 7. Mobile

Assume half the traffic is mobile and a meaningful share of sessions are someone on a
phone who just saw a job posting.

### Works well on mobile — must be first-class

- Sign in, browse résumés, read a résumé, read a review.
- **Paste a JD and tailor.** This is *the* mobile use case: see a posting on a phone, copy
  the description, tailor, done. Optimize hard for it.
- `resume-interview` — answering short questions on a phone is pleasant, one card per
  screen. This may end up the best mobile experience in the app.
- Inline field editing of a bullet or two.

### Degrades — acceptable

- **The canvas and panel cannot coexist.** Mobile uses a two-tab switcher
  (`Résumé` / `Assistant`) with the panel as a bottom sheet. During a document-generating
  run, **auto-switch to the Résumé tab** so they watch sections land, with a badge on
  Assistant. Wrong default is showing them a transcript.
- **Heavy editing.** Possible, not pleasant. Fine — nobody restructures a résumé on a
  phone by choice.
- **`resume-build`** works but is long. Resumability (§3.3.6) matters most here; expect
  start-on-phone, finish-on-laptop.

### Desktop-only — and honest about it

- **PDF export.** v1 uses the browser print pipeline, which is inconsistent-to-broken on
  mobile Safari and Chrome. Do not ship a button that produces a bad PDF.
  - On mobile, the export control says: **"PDF export needs a computer — open this
    résumé on a desktop to download."** With **"Email me a link"** as the escape hatch.
    That link is a one-line email with a URL — an hour of work, and it rescues the entire
    mobile funnel from ending in a dead end.
  - This is the technical design's known ceiling (serverless Chromium is the upgrade).
    **Flagged in §10** — it is the most user-visible consequence of a backend choice.

### Implementation

Mobile-first CSS, one breakpoint at 768px, a second at 1024px for the side-by-side canvas.
Two breakpoints. Not five.

---

## 8. Design direction

This is a product about someone's career at a moment when they feel replaceable. It should
feel like a well-made instrument. The reference points are a legal document, a good
newspaper, a bank statement that respects you — **not** a SaaS landing page.

### Prohibited, concretely

No gradient backgrounds. No gradient text. No purple-to-blue anything. No glassmorphism or
`backdrop-filter` blur panels. No floating 3D mockups. No emoji in the UI (emoji in
*content* is fine). No confetti, no celebratory animation. No colored drop shadows. No
"✨ AI-powered" framing anywhere — the word AI should appear roughly once, in the privacy
policy, where it is load-bearing. No illustration of an abstract person at a laptop.
No rounded corners above 8px. No large radii on primary buttons.

### Typography

Type carries the entire design. Everything else is restraint.

- **UI + document body:** one serif for the document, one sans for the interface.
  - Document: **Source Serif 4** (variable, Google Fonts). Serif signals "this is a
    document", which is exactly right, and it distinguishes the artifact from the chrome
    around it.
  - Interface: **Inter**, `font-feature-settings: 'cv05' 1, 'ss01' 1` (straighter l, more
    conventional letterforms — less "startup"). System stack fallback.
  - Two families. Two weights each (400/600). Self-host or preload; no more than four font
    files total.
- **Scale** — a 1.2 ratio, not the default 1.25, because this is an information-dense app
  where large headings waste space:

  ```
  --text-xs:   0.75rem   /* 12px — metadata, timestamps */
  --text-sm:   0.875rem  /* 14px — UI default, labels, buttons */
  --text-base: 1rem      /* 16px — document body, inputs */
  --text-lg:   1.125rem  /* 18px — section headings in document */
  --text-xl:   1.375rem  /* 22px — page titles */
  --text-2xl:  1.75rem   /* 28px — landing headline only */
  ```
  There is no 48px type in this product. The landing headline is 28px and that is enough.
- **Line height:** 1.6 for document body, 1.45 for UI, 1.25 for headings.
- **Measure:** document body capped at `68ch`. Résumé bullets are long; unlimited line
  length is unreadable.
- **Numerals:** `font-variant-numeric: tabular-nums` on all dates, counts and quotas.

### Spacing

4px base, restricted set: `4, 8, 12, 16, 24, 32, 48, 64`. **No values outside this list.**
Generous vertical rhythm inside the document (24px between sections, 12px between bullets),
tight in the chrome (8–12px). The document should feel airy, the app around it compact.

### Color

Near-monochrome plus exactly one accent. The document is black on white because it is
going to be printed black on white.

```css
:root {
  /* Surfaces — warm-neutral greys, never pure #fff or #000 */
  --bg-page:      #faf9f7;  /* app background, slightly warm off-white */
  --bg-surface:   #ffffff;  /* the document, cards */
  --bg-subtle:    #f2f0ed;  /* panel background, hover states */
  --border:       #e3e0da;
  --border-strong:#c9c4bb;

  /* Text */
  --text:         #1c1b19;  /* not #000 — softer, reads as print */
  --text-muted:   #6b665e;
  --text-faint:   #8f8a81;

  /* One accent: a deep ink blue. Authority, not excitement. */
  --accent:       #1f4d7a;
  --accent-hover: #17395a;
  --accent-subtle:#e8eef4;

  /* Semantic — desaturated. This app delivers criticism; it must not shout. */
  --warn:         #8a6410;  /* [METRIC NEEDED] chips, review findings */
  --warn-subtle:  #fdf4e0;
  --danger:       #9b3030;  /* destructive only — delete, quota exceeded */
  --ok:           #3d6b45;  /* used sparingly; no green checkmark celebrations */
}

:root[data-theme="dark"] {
  --bg-page:      #16161a;
  --bg-surface:   #1e1e23;
  --bg-subtle:    #26262c;
  --border:       #33333a;
  --border-strong:#4a4a53;
  --text:         #e8e6e1;
  --text-muted:   #a09b93;
  --text-faint:   #77726b;
  --accent:       #7aa8d4;   /* lightened for contrast on dark */
  --accent-hover: #9cc0e3;
  --accent-subtle:#1c2c3c;
  --warn:         #d9a84a;
  --warn-subtle:  #2e2717;
  --danger:       #d97a7a;
  --ok:           #7fae88;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) { /* repeat the dark block */ }
}
```

**The document itself stays light in dark mode**, on a dark app background — the same way
a PDF reader shows a white page. It is what will be printed; showing it inverted is a lie
about the output. Offer a per-document "dark preview" toggle only if someone asks.

### Surfaces, borders, motion

- **1px borders, not shadows.** One shadow token exists (`0 1px 3px rgba(28,27,25,.08)`)
  for modals and the mobile bottom sheet. Nothing else casts a shadow.
- **Radii:** `4px` default, `8px` for cards and modals. Buttons are 4px.
- **Motion:** 120ms for state changes, 200ms for panels sliding. Ease-out only. Nothing
  bounces, nothing springs. Streaming text does not animate in — it simply appears, because
  that is what typing looks like.
- **`prefers-reduced-motion: reduce` disables all transitions** (§9).
- **Focus:** a 2px `--accent` outline at 2px offset. Visible, unapologetic, never removed.

### Tone of voice

- Plain, direct, second person. "Your summary is generic." Not "We noticed your summary
  could be optimized!"
- **No exclamation marks anywhere.**
- Criticism is specific and attached to a fix. The kit's promise is brutal honesty; the UI
  must deliver it without cruelty — say what is wrong and what to do, then stop.
- Never congratulate the user for using the product. No "Great job!" after an export.
- Buttons are verbs describing the outcome: "Tailor to this job", not "Submit" or "Generate".
- Never fabricate confidence. If the model produced `[METRIC NEEDED]`, the UI says
  "we need a real number from you" — never hides it, never guesses.

---

## 9. Accessibility baseline

Non-negotiable. These are the ones that get skipped and the ones that matter.

1. **Contrast.** All text ≥ 4.5:1 against its background; UI borders and icons ≥ 3:1.
   Verified in both themes. `--text-faint` on `--bg-subtle` is the risky pair — check it.
2. **Keyboard complete.** Every action reachable by keyboard, in a sensible order. The
   canvas → rail → panel order must be the visual order. Inline editors open on Enter,
   save on ⌘/Ctrl+Enter, cancel on Escape.
3. **Focus visible, always.** Never `outline: none` without a replacement of equal
   visibility.
4. **Streaming announced correctly.** The output region is `aria-live="polite"`
   `aria-busy="true"` while streaming, `false` when done. **Do not** make it `assertive`
   and do not announce every token — that makes a screen reader unusable. Announce at
   stage boundaries: "Rewriting experience section", then the finished text.
5. **The document is semantic HTML.** `<h2>` for section headings, `<ul>`/`<li>` for
   bullets, `<time>` for dates. Not a grid of divs. This is free — the ATS template already
   requires the structure, and it is the same reason ATS parsers can read it. **ATS safety
   and screen-reader accessibility are the same problem.**
6. **Labels on every input.** Visible labels, not placeholders-as-labels. Placeholder text
   vanishes and is low-contrast by definition.
7. **Errors are associated.** `aria-describedby` from field to error text; error text is
   text, not color alone.
8. **Modals and sheets trap focus**, restore focus on close, close on Escape.
9. **`prefers-reduced-motion`** disables transitions and any auto-scroll of streaming
   output.
10. **Touch targets ≥ 44px** on mobile, including the `[METRIC NEEDED]` chips.
11. **Page titles are distinct** per route, and announce on client-side navigation.
12. **Zoom to 200% without horizontal scroll** at every breakpoint.

Skipped deliberately: a full WCAG AA audit, automated a11y CI, screen-reader test matrix
across three readers. Add when there are users. The twelve above are the ones that decide
whether the app is usable at all.

---

## 10. Where the technical design creates UX problems

Five, ranked by how much they hurt.

### 10.1 Browser-print PDF kills mobile export — the big one

The design accepts browser print as the v1 render path. That is defensible cost-wise and
**it breaks the most important mobile journey** (see a job on your phone → tailor →
send). A mobile user hits a wall at the final step.

**Mitigations, cheapest first:** (a) an "email me a link" button on mobile — an hour of
work, keeps the funnel alive; (b) accept it for v1 and measure how many mobile sessions
reach export and stop; (c) if it is more than a trickle, serverless Chromium moves up the
roadmap. Do not discover this after launch — instrument the mobile export click from day
one.

### 10.2 The 60s Vercel function limit vs. `resume-build`

Streaming keeps a *turn* inside 60s. A ten-turn intake is ten separate function calls,
which is fine — **provided intake state is persisted server-side per turn.** If it lives
in client memory, a mobile browser backgrounding the tab destroys twenty minutes of a
stressed person's work. This is the single worst possible failure in the product. It is not
explicit in the technical design; make it explicit. (`runs` already exists; add the turn
state to it or alongside it.)

### 10.3 "No tool calling, model emits final JSON" complicates the review flow

`resume-review` is a diagnostic — prose, not JSON. Fine. But the review's findings are far
more useful **anchored to sections** (§5.1, §3.1.6), which needs the model to emit
`{section, severity, finding}` rather than a wall of markdown. That is a `core/` prompt
requirement the technical design does not mention: **document-producing flows are not the
only ones with structured output.** Cheap to add now, annoying to retrofit.

### 10.4 Versioning is named but not shaped

`resumes` is "versioned; master vs tailored copies". The UX depends on this heavily
(§3.2.5, breadcrumbs, restore). It needs to be an explicit parent/child relationship —
a tailored copy points at its master and at the job it was tailored to — not just a
version integer. Otherwise `/app` shows a flat list of twelve near-identical résumés and
the user cannot tell which is the master. **This is the structural decision most likely to
be under-specified and most expensive to fix later.**

### 10.5 Uploads "parsed to text on arrival and discarded" needs a UI step

Silent extraction means a mangled PDF produces a confidently wrong review, and the user has
no idea why. The confirm-extracted-text step (§3.1.3) is a textarea and it prevents the most
common bad first impression. Small, but it sits on the critical path of every new user.

---

## 11. Build order

Aligned to the technical design's sequencing, UI-first-things-first:

1. **Design tokens + `ResumeDocument`.** The document renders from JSON before anything
   generates JSON. Feed it a fixture. One evening, and it de-risks everything.
2. **Canvas shell + `AssistantPanel` + streaming** with `resume-review` only. This is the
   technical design's step 2 and it is a shippable product on its own.
3. **`ResumeEditor` inline fields + export.** Now the user owns their document.
4. **`CapabilitySheet` + configs** → improve, tailor, cover letter arrive nearly for free.
5. **`QuestionCard`** → build and interview. The expensive ones, deliberately last.
6. **Auth, `/app` hub, versions, quota.**
7. **LinkedIn workspace.** Genuinely separate; do it when the résumé side is solid.

If evenings run out after step 3, there is still a real product: upload a résumé, get an
honest review, fix it, download a PDF. Ship that.

---

**Author:** ArchitectUX
**Next:** implementation. Nothing here needs another design round — it needs step 1.
