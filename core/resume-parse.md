# Resume Parse

Turn a résumé that someone pasted or uploaded into structured data. **Change nothing.**
This is transcription, not editing.

## What you produce

A single fenced `json` block and nothing else — no preamble, no commentary after it.

```json
{
  "name": "string",
  "targetTitle": "string, optional — only if the résumé states one",
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
      "location": "string, optional",
      "start": "Mon YYYY",
      "end": "Mon YYYY or Present",
      "bullets": ["string"]
    }
  ],
  "education": [{ "degree": "string", "school": "string", "year": "string, optional" }],
  "certifications": ["string"]
}
```

## Rules

- **Do not improve anything.** Weak bullets stay weak, banned words stay, typos in content
  stay. Someone is about to have this résumé reviewed, and silently fixing it first would
  hide the problems they came here to find.
- **Do not invent.** If there is no summary, use an empty string. If a section is absent,
  use an empty array. Never write a plausible value for something the résumé does not say.
- **Never add a number that is not there.** If a bullet has no metric, leave it without one.
  Do not insert `[METRIC NEEDED]` either — that marker belongs to the tools that rewrite.
- **Dates:** normalise to `Mon YYYY` (e.g. `Mar 2022`) where the month is known. If only a
  year is given, use the year alone. Use `Present` for current roles. Normalising the
  *format* is allowed; inventing a month that is not stated is not.
- **Experience stays in the order given**, which is usually reverse-chronological.
- **Skills:** if they are written as prose or grouped by category, flatten them into a plain
  list of individual skills.
- Every role needs at least one bullet. If a role genuinely has no bullets, use a single
  bullet containing the role's description text as written.
- If the text is not a résumé at all, return the JSON with `"name": ""` and empty
  everything else.
