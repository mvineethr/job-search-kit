import { tailorMessage, letterMessage, reviewMessage, matchMessage } from '../lib/messages';
import type { Fixture } from './fixtures';
import { scoreParse, scoreTailor, scoreLetter, scoreMatch, scoreReview, type Score } from './score';

export type PromptName = 'parse' | 'tailor' | 'letter' | 'match' | 'review';
export type PromptCase = {
  core: string;
  tier: 'primary' | 'fast';
  message: (fx: Fixture) => string;
  score: (text: string, fx: Fixture) => Score;
};

// Tailor, letter and match get the hand-checked JSON, as a stored master would be,
// so their scores do not depend on how well parse did. No skill answers: those are
// per person and the fixtures have none.
const json = (fx: Fixture) => JSON.stringify(fx.resume, null, 2);
const title = (fx: Fixture) => `${fx.company} — ${fx.role}`;

export const PROMPTS: Record<PromptName, PromptCase> = {
  parse: { core: 'resume-parse', tier: 'fast', message: (fx) => fx.resumeText, score: scoreParse },
  tailor: { core: 'resume-tailor', tier: 'primary', message: (fx) => tailorMessage(json(fx), title(fx), fx.description), score: scoreTailor },
  letter: { core: 'cover-letter', tier: 'primary', message: (fx) => letterMessage(json(fx), title(fx), fx.description), score: scoreLetter },
  match: { core: 'job-match', tier: 'primary', message: (fx) => matchMessage(json(fx), title(fx), fx.description), score: scoreMatch },
  review: { core: 'resume-review', tier: 'primary', message: (fx) => reviewMessage(fx.resumeText), score: scoreReview },
};
