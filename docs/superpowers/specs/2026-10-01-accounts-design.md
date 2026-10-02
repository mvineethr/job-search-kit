# Accounts — design and plan

Date: 2026-10-01. Approved in conversation. Builds on the profile-onboarding branch.

## Goal

Replace the shared test password with real accounts, so people keep their work across
browsers and devices and Vineeth can see who is using the app.

## Decisions

| Question | Decision |
|---|---|
| Sign-in methods | Google, LinkedIn (OpenID Connect), email + password |
| Library | Better Auth 1.7 (one dependency instead of two hand-written OAuth flows plus password hashing) |
| Email | Resend via `fetch`, only when both `RESEND_API_KEY` and `EMAIL_FROM` are set. No domain yet, so off for now |
| Password reset without email | Admin page button makes a one-time reset link (Better Auth token, 1 hour); Vineeth sends it himself |
| Existing test-session data | Start fresh. Old rows stay in the database, unreachable. Nothing is deleted |
| Who can sign up | Anyone, no limits |
| What we learn | Optional career basics and "how did you find us" on `/start`; `/admin` with usage per user |

## Design

**Identity.** `requireSid()` / `currentSid()` return the Better Auth user id. Every table
already filters by `sid`, so no route or query changes. `session.ts`, `cookie.ts`,
`/api/login` and `APP_PASSWORD` are removed.

**Schema.** Better Auth's tables (`user`, `session`, `account`, `verification`) are created
by `getMigrations(authOptions).runMigrations()` inside `ensureSchema()`, keeping the
on-demand pattern; there is no CLI step. `profiles` gains `target_role`, `years_experience`,
`location`, `search_status`, `heard_from`.

**Providers.** Google and LinkedIn are registered only when their client id and secret are
set, so local dev works with email alone. Callback URLs: `<BETTER_AUTH_URL>/api/auth/callback/google`
and `/linkedin`. LinkedIn sign-in gives name, email and photo only, never work history.

**Middleware.** It checks that a Better Auth session cookie is present (`getSessionCookie`,
edge-safe). Public paths: `/login`, `/signup`, `/reset`, `/api/auth/*`. The real check is
still `requireSid()` in every data route.

**Pages.**
- `/login`: Google, LinkedIn, email + password. The AI-use note is shown above the buttons.
- `/signup`: the same buttons plus name, email and password (min 8 characters). The AI
  checkbox must be ticked before any button works.
- `/reset?token=`: choose a new password, then go to `/login`.
- `/start`: a new "About you" form at the top (all optional) posting to `/api/profile/about`.
- Home: the identity card shows the account name and has a "Sign out" button.
  "Switch session" is removed.
- `/admin`: `notFound()` unless the email is in `ADMIN_EMAILS`. One row per user: name,
  email, sign-in methods, signed up, last active, numbers of résumés, jobs and letters,
  career basics, heard from, and a "Reset link" button.

**Reset link.** `sendResetPassword` sends with Resend when email is configured. Otherwise it
holds the URL in memory for the request that asked; `POST /api/admin/reset-link` (admin only)
calls `auth.api.requestPasswordReset` and returns `{ url }` to the admin page, which shows
it once with a copy button. Links never go in query strings or logs.

**Env.** `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID/SECRET`,
`LINKEDIN_CLIENT_ID/SECRET`, `ADMIN_EMAILS`, `RESEND_API_KEY`, `EMAIL_FROM`.

## Tasks

1. `lib/auth-server.ts` (Better Auth config), `/api/auth/[...all]`, migrations in
   `ensureSchema`, `auth.ts` on sessions, middleware, removal of the shared password.
   Test: `isAdmin`, `emailConfigured`.
2. `/login`, `/signup`, `/reset` pages + `lib/auth-client.ts`; sign-out on home.
3. Career basics: profile columns, `/api/profile/about`, form on `/start`.
4. `/admin` and the reset-link endpoint.
5. Browser check on the local test server: sign up with email, onboarding, about-you,
   admin page, reset link, sign out and in again.
