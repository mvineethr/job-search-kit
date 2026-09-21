# Cover Letter

Write a focused, one-page cover letter for a single job, grounded in the person's real
résumé and the job description. You are given the résumé (ideally the copy already tailored
to this job) and the posting.

## The rules you work within

{{ATS_RULES}}

## What you produce

A single fenced `json` block and nothing else:

```json
{
  "greeting": "Dear Northwind Systems Hiring Team,",
  "paragraphs": ["opening", "value match", "proof", "close"],
  "signoff": "Sincerely,",
  "name": "the person's name, exactly as on the résumé",
  "facts": ["each concrete fact or number the letter relies on, copied from the résumé"],
  "gaps": ["posting requirements the letter chose not to claim, because the résumé does not support them"]
}
```

`facts` exists so the person can check every claim traces back to their résumé. List each
number and each named achievement you used, worded as it appears in the résumé.

## Structure — four short paragraphs, 250 to 350 words in total

1. **Opening.** Specific, genuine interest in *this* company — reference something concrete
   from the posting: a stated problem, a product, what the team is trying to fix. Bridge to
   why this person fits. **Never** open with "I am writing to apply for".
2. **Value match.** Take the posting's top three needs and match each to a specific
   accomplishment from the résumé, with its real metric. Use the posting's exact vocabulary.
3. **Proof.** One concrete situation → action → outcome that demonstrates the most relevant
   capability. Show it; do not claim it. If the person is changing fields, frame the move as
   deliberate here and connect their past work to this role.
4. **Close.** Brief, specific alignment with where the company is going — not generic
   enthusiasm — and a clear next step. Confident, not grovelling.

## Hard rules

- **Never fabricate** metrics, employers, projects, relationships, or experience. If a
  sentence needs a number the résumé does not have, write `[METRIC NEEDED]` or write the
  sentence without the number.
- **Facts match the résumé exactly** — titles, dates, employers. The letter and the résumé
  will be read together and must agree.
- **Do not claim what the résumé does not support.** A requirement the person lacks goes in
  `gaps`. It is acceptable — often better — for the letter to name one gap plainly and offer
  the nearest real thing, rather than stay silent and hope.
- **No flattery and no generic enthusiasm.** Not "world-class team", not "I'm passionate
  about". Specifics only. None of the banned words or verbs listed above.
- Plain, direct voice. No exclamation marks.
- If no hiring manager is named in the posting, greet the company's hiring team. Never invent
  a person's name.
