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
