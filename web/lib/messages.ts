/**
 * The user message each prompt receives. Kept in one place so the routes and the
 * prompt test set (web/evals) send exactly the same text: a test that builds its
 * own copy would silently measure a different message the day a route changes.
 */

const resumeAndJob = (resumeText: string, title: string, description: string) =>
  `MY RESUME:\n${resumeText}\n\nTHE JOB (${title}):\n${description}`;

export function tailorMessage(resumeText: string, title: string, description: string, answersBlock = ''): string {
  return resumeAndJob(resumeText, title, description) + answersBlock;
}

export function letterMessage(resumeText: string, title: string, description: string): string {
  return resumeAndJob(resumeText, title, description);
}

export function reviewMessage(resumeText: string): string {
  return resumeText;
}

/**
 * Today's date is included because the model does not know it: without it, "Jun 2019 –
 * Present" was counted as under seven years in some runs and over in others.
 */
export function matchMessage(resumeText: string, title: string, description: string, today = new Date()): string {
  const month = today.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
  return `TODAY: ${month}\n\n${resumeAndJob(resumeText, title, description)}`;
}
