import { describe, it, expect } from 'vitest';
import { loadFixtures } from '@/evals/fixtures';
import { contentWords, resumeWords, hasTerm, DATE_WORDS } from '@/evals/score';

const SLUGS = ['changer-military', 'changer-teacher', 'gap-year', 'junior', 'keyword-stuffed-jd', 'no-metrics', 'no-summary', 'non-english', 'non-tech', 'senior', 'strong-fit', 'weak-fit'];
const fixtures = loadFixtures();

describe('prompt test set fixtures', () => {
  it('has exactly the twelve planned pairs', () => {
    expect(fixtures.map((f) => f.slug)).toEqual(SLUGS);
  });

  for (const fx of fixtures) {
    describe(fx.slug, () => {
      it('resume.json is a transcription of resume.txt (no word it lacks)', () => {
        const src = contentWords(fx.resumeText);
        expect([...resumeWords(fx.resume)].filter((w) => !src.has(w) && !DATE_WORDS.has(w))).toEqual([]);
      });
      it('every trap is absent from the résumé and present in the posting', () => {
        for (const t of fx.truth.traps) {
          expect(hasTerm(fx.resumeText, t), `trap "${t}" is in resume.txt`).toBe(false);
          expect(hasTerm(fx.description, t), `trap "${t}" is not in job.md`).toBe(true);
        }
      });
      it('every supported term is in both the résumé and the posting', () => {
        for (const t of fx.truth.supported) {
          expect(hasTerm(fx.resumeText, t), `"${t}" not in resume.txt`).toBe(true);
          expect(hasTerm(fx.description, t), `"${t}" not in job.md`).toBe(true);
        }
      });
      it('is fictional', () => {
        for (const m of fx.resumeText.match(/[\w.+-]+@[\w-]+\.\w+/g) ?? []) expect(m.endsWith('@example.com')).toBe(true);
        for (const m of fx.resumeText.match(/\(?\d{3}\)?[\s.-]?\d{3}[\s.-]\d{4}/g) ?? []) expect(m).toMatch(/555/);
      });
    });
  }
});
