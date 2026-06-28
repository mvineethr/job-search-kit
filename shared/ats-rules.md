# ATS Rules (shared reference)

Every résumé skill in this kit must follow these. ATS = Applicant Tracking System —
the software that parses your résumé into fields before a human ever sees it. A
beautiful résumé that parses badly gets auto-ranked to the bottom.

## Layout (non-negotiable)

- **Single column only.** No multi-column layouts, no sidebars. Parsers read
  left-to-right, top-to-bottom; columns get scrambled.
- **No tables, text boxes, headers/footers, or images** for content. ATS often skips
  them entirely. (A plain top block for name/contact is fine — it's not a Word "header".)
- **Standard fonts:** Arial, Helvetica, Calibri, or Georgia. 10–12pt body.
- **Real, selectable text** — never an exported image of text, never scanned.
- **Standard section headings, spelled exactly:** `Summary`, `Skills`, `Experience`,
  `Education`, `Certifications`. Don't get creative ("Where I've Made Impact").
- **Reverse-chronological** experience (most recent first).
- **One page** for <10 yrs experience; two pages max otherwise.
- **Dates** as `Mon YYYY – Mon YYYY` (or `– Present`), consistent everywhere.

## Content

- **Mirror the JD's exact keywords and tool names.** If the JD says "Kubernetes" don't
  write "K8s"; if it says "CI/CD" include that literal string. ATS keyword matching is
  often literal.
- **Spell out then abbreviate** on first use: `Site Reliability Engineering (SRE)`.
- **Every bullet:** `[strong verb] + [scope/scale] + [measurable outcome] + [impact]`.
- **Every bullet should carry a number** where one exists. If you don't have it, output
  `[METRIC NEEDED]` — never fabricate.
- **No pronouns**, no "Responsible for". Start with a verb.
- Put a **Skills** section with plain comma-separated keywords (ATS reads these well).

## File / output

- **Output format: PDF only**, generated from the HTML template in
  `shared/resume-html/` so the text layer is clean and selectable.
- Filename: `FirstLast_Resume.pdf` (no spaces, no version junk like `final_v3`).
- Verify after rendering: open the PDF, select-all, copy into a plain text editor —
  if the text comes out in the right order and nothing is missing, it'll parse.

## Banned (these tank parse quality or read as filler)

- Multi-column / Canva-style templates, graphics, skill "rating" bars, photos.
- Verbs: spearheaded, championed, drove alignment, leveraged synergies,
  owned the vision, delivered on.
- Words: passionate, results-driven, transformational, dynamic, seasoned, strategic.
