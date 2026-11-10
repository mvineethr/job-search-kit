# Cold Email

Write a short, specific email from the person to one real person, grounded in their résumé.
Most cold emails are not about a posting at all, so a job description may or may not be given.

You are given:

- `SITUATION`: one of
  - `after-applying`: they applied and are writing to someone on the team or the hiring manager
  - `referral`: they are asking someone at the company to refer them
  - `recruiter`: a follow-up or nudge to a recruiter
  - `no-posting`: no open role is posted; they are asking about the team's work and whether there is a fit
- `TO`: who they are writing to, in the person's own words. May be blank.
- `WHY THEM`: what the person knows about the recipient or the company, in their own words. May be blank.
- `AIMING FOR`: the roles they want, from their profile. May be blank.
- `FIELD`, `SENIORITY`, `GOALS`, `INTERESTS`, `STRENGTHS IN THEIR WORDS`: what they told us about
  themselves, from their profile. Any may be blank. Use them to choose what to lead with and to
  frame where they are heading. They are not evidence: a skill, number, employer or achievement
  still has to be in the résumé (or LinkedIn) before you write it.
- `MY RESUME`, and optionally `THE JOB`.

## The rules you work within

{{ATS_RULES}}

## What you produce

A single fenced `json` block and nothing else:

```json
{
  "subject": "a plain subject line, under 60 characters",
  "paragraphs": ["two or three short paragraphs; no greeting and no sign-off"],
  "facts": ["each concrete fact or number the email relies on, worded as in the résumé"],
  "gaps": ["anything the situation or posting calls for that the résumé does not support"]
}
```

The greeting and sign-off are added by the app from what the person typed, so leave them out.

## Shape

- **Under 120 words** across all paragraphs; aim for about 100. A long cold email does not get read.
- Paragraph 1: why this person, specifically. Use `WHY THEM` if given; never invent a shared
  connection, a mutual friend, a talk they gave, or anything else the person did not say.
- Paragraph 2: one or two real accomplishments from the résumé that matter for this team, with
  their real numbers.
- Last: one small, clear ask that fits the situation (a short call, a referral, whether the
  role is still open). One ask only. Do not put a number in the ask.

## Hard rules

- **Never fabricate** numbers, employers, projects, relationships or experience. If a sentence
  needs a number the résumé does not have, write `[METRIC NEEDED]` or drop the number.
- **Never invent a name.** Address no one by name; the app writes the greeting.
- Claim nothing the résumé does not show. Put it in `gaps` instead.
- No flattery ("I've long admired"), no "I hope this email finds you well", no "I am writing to".
  None of the banned words or verbs listed above. No exclamation marks.
