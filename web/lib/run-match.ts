import { sql, type ResumeRow } from './db';
import { loadPrompt } from './prompts';
import { completeText } from './provider';
import { extractJsonObject } from './extract-json';
import { ResumeSchema } from './resume-schema';
import { MatchOutputSchema, matchSource, verifyEvidence, type StoredMatch } from './match';
import { matchMessage } from './messages';
export { matchMessage };

/**
 * Matches the most recent master résumé against a posting and stores the
 * verified result on the job. Best effort: returns null (and stores nothing) if
 * there is no résumé yet or the model's output cannot be used — the job itself
 * is still usable without a match.
 */
export async function runMatch(sid: string, job: { id: string; company: string; role: string; description: string }): Promise<StoredMatch | null> {
  const masters = (await sql()`
    SELECT content, source_text FROM resumes
    WHERE sid = ${sid} AND parent_id IS NULL
    ORDER BY updated_at DESC LIMIT 1`) as unknown as ResumeRow[];
  const master = masters[0];
  if (!master) return null;

  const parsedResume = ResumeSchema.safeParse(master.content);
  const resume = parsedResume.success ? parsedResume.data : null;
  const resumeText = resume ? JSON.stringify(resume, null, 2) : (master.source_text ?? '');

  try {
    const { text } = await completeText({
      system: loadPrompt('job-match'),
      tier: 'primary', // the fast model over-claims matches (see CLAUDE.md, tailoring)
      messages: [
        { role: 'user', content: matchMessage(resumeText, `${job.company} — ${job.role}`, job.description) },
      ],
    });

    const parsed = MatchOutputSchema.safeParse(extractJsonObject(text));
    if (!parsed.success) {
      console.error('[match] output did not match the schema');
      return null;
    }

    const { requirements, unverified } = verifyEvidence(parsed.data.requirements, matchSource(resume, master.source_text));
    if (unverified > 0) console.warn(`[match] ${unverified} evidence quotes not found in the résumé`);

    const match: StoredMatch = { requirements, unverified, created_at: new Date().toISOString() };
    await sql()`UPDATE jobs SET match = ${JSON.stringify(match)} WHERE id = ${job.id} AND sid = ${sid}`;
    return match;
  } catch (err) {
    console.error('[match] failed', err);
    return null;
  }
}
