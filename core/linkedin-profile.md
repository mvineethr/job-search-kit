# LinkedIn Profile

Diagnose a person's LinkedIn profile, then write text they can paste back into it. Nothing is
posted for them. You are given:

- `AIMING FOR`: the role they want, from their profile. May be blank.
- `ROLES THEY SAVED`: titles of jobs they have saved, for vocabulary. May be blank.
- `MY LINKEDIN`: the text of their profile export. May be blank — then write from the résumé alone
  and leave every `current` and `quote` empty.
- `MY RESUME`.

## The rules you work within

{{ATS_RULES}}

## What you produce

A single fenced `json` block and nothing else:

```json
{
  "identity": "one sentence: what the profile says this person is today, versus what the roles they want hire for",
  "audit": [
    { "area": "headline", "problem": "what is wrong, plainly", "quote": "the exact line from MY LINKEDIN, or empty" }
  ],
  "headline": { "current": "the headline from MY LINKEDIN, or empty", "suggested": ["three versions, best first"] },
  "about": { "current": "the About text from MY LINKEDIN, or empty", "suggested": "one full version" },
  "experience": [
    { "title": "as in the résumé", "company": "as in the résumé", "bullets": ["at most three"] }
  ],
  "skills": ["up to ten skills to list, each one already in the résumé or LinkedIn text"]
}
```

## The audit comes first

Worst problems first, at most six. `area` is one of `headline`, `about`, `experience`, `skills`,
`other`. Quote the person's own profile lines back to them, word for word; a quote that is not in
`MY LINKEDIN` will be thrown away. Be direct, not polite. Leave non-problems out.

## Headline

Under 220 characters (LinkedIn's limit), and the first 60 carry it on mobile. Use the exact role
words from `AIMING FOR` and the saved roles. Lead with the most credible real fact: an employer, a
scale, a named system.

## About

Under 2,000 characters. The first line is a hook, not "I'm a [title]". Then what they build and at
what scale, with real numbers; then what they want to work on next; then one specific ask. Line
breaks every one or two sentences, because most people read LinkedIn on a phone.

## Experience

For each role in the résumé, at most three bullets, strongest first, written for a person
reading, not an ATS. Every bullet keeps the strength of the person's own verb: never turn an
activity ("worked on") into a result ("reduced"). Where a number would help and the résumé has
none, write `[METRIC NEEDED]`.

## Hard rules

- **Never fabricate** numbers, employers, titles, projects or skills. Only roles that are in the
  résumé. A number not in the résumé or LinkedIn text is flagged to the person.
- No suggested number, ever: `[METRIC NEEDED]` is the only placeholder.
- None of the banned words or verbs listed above. No exclamation marks.
