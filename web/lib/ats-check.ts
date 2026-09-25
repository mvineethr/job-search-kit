import { SECTION_HEADINGS } from './resume-schema';

export type AtsCheck = { label: string; ok: boolean; detail: string };

/**
 * Plain checks on the text a PDF extractor pulled out of a résumé — the first
 * thing an ATS does with an upload. Each is something a parser visibly gets
 * wrong, not a score: an ATS has no "pass mark" for us to promise.
 */
export function checkExtractedText(text: string): AtsCheck[] {
  const letters = (text.match(/\p{L}/gu) ?? []).length;
  // Case-insensitive: our own export styles headings in capitals, and parsers match either.
  const missingHeadings = SECTION_HEADINGS.filter((h) => h !== 'Certifications' && !new RegExp(`\\b${h}\\b`, 'i').test(text));
  const dates = text.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.? \d{4}\b/g) ?? [];
  const garbled = /�|\(cid:\d+\)/.test(text);

  return [
    {
      label: 'Text can be read',
      ok: letters >= 300,
      detail:
        letters >= 300
          ? `${letters.toLocaleString('en-US')} letters came out.`
          : 'Almost no text came out. The PDF is probably an image or a scan, which most ATSs cannot read at all.',
    },
    {
      label: 'No garbled characters',
      ok: !garbled,
      detail: garbled
        ? 'Some characters came out as placeholders. This usually means an unusual font — use Arial, Calibri or Georgia.'
        : 'Every character came through.',
    },
    {
      label: 'Email address found',
      ok: /[\w.+-]+@[\w-]+\.[\w.]+/.test(text),
      detail: 'Recruiters reach you through the contact details the parser finds.',
    },
    {
      label: 'Phone number found',
      ok: /(\+?\d[\d\s().-]{8,}\d)/.test(text),
      detail: 'Optional in some countries, expected in most.',
    },
    {
      label: 'Standard section headings',
      ok: missingHeadings.length === 0,
      detail:
        missingHeadings.length === 0
          ? 'Summary, Skills, Experience and Education are all there, spelled the way parsers look for them.'
          : `Not found: ${missingHeadings.join(', ')}. Parsers look for these exact words to split your résumé into fields.`,
    },
    {
      label: 'Dates a parser can read',
      ok: dates.length > 0,
      detail:
        dates.length > 0
          ? `${dates.length} dates in "Mon YYYY" form.`
          : 'No dates like "Mar 2022" came out, so the ATS cannot work out how long you held each role.',
    },
  ];
}
