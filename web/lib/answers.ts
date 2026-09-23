import { sql, type SkillAnswerRow } from './db';
import { isClaimable, type Answer, type Level } from './question-schema';

/** Stable key for a skill, so "Istio " and "istio" are the same answer. */
export function skillKey(skill: string): string {
  return skill.toLowerCase().trim().replace(/\s+/g, ' ');
}

export async function loadAnswers(sid: string): Promise<Answer[]> {
  const rows = (await sql()`
    SELECT skill_key, skill, level, detail FROM skill_answers
    WHERE sid = ${sid} ORDER BY skill`) as unknown as SkillAnswerRow[];
  return rows.map((r) => ({ skill: r.skill, level: r.level as Level, detail: r.detail }));
}

export async function saveAnswer(sid: string, answer: Answer): Promise<void> {
  await sql()`
    INSERT INTO skill_answers (sid, skill_key, skill, level, detail)
    VALUES (${sid}, ${skillKey(answer.skill)}, ${answer.skill}, ${answer.level}, ${answer.detail})
    ON CONFLICT (sid, skill_key)
    DO UPDATE SET level = EXCLUDED.level, detail = EXCLUDED.detail, updated_at = now()`;
}

/**
 * The skills a person confirmed they can defend. These are allowed onto a tailored
 * résumé even though they are absent from the written one — that is the whole point
 * of asking. Anything at "some" or "none" stays off.
 */
export function claimableSkills(answers: Answer[]): string[] {
  return answers.filter((a) => isClaimable(a.level)).map((a) => a.skill);
}

/**
 * What the person typed when answering, as verification source. Without this the
 * audit flags numbers they supplied themselves — answer "ran it across 12
 * services" and the tailored bullet's "12" looks invented.
 */
export function answerDetailText(answers: Answer[]): string {
  return answers.map((a) => `${a.skill} ${a.detail}`).join(' \n ');
}

/**
 * The part of the prompt that tells the model what the person confirmed. Kept
 * explicit about what may and may not be used, because this is the one place the
 * model is allowed to go beyond the written résumé.
 */
export function answersForPrompt(answers: Answer[]): string {
  if (answers.length === 0) return '';

  const claimable = answers.filter((a) => isClaimable(a.level));
  const not = answers.filter((a) => !isClaimable(a.level));

  const lines: string[] = [
    '',
    'THE PERSON ALSO TOLD US THIS DIRECTLY.',
    'Treat it as true and as part of their experience, even though it is not written on the résumé.',
  ];

  if (claimable.length) {
    lines.push('', 'They can defend these — you may put them on the résumé:');
    for (const a of claimable) {
      lines.push(
        `- ${a.skill} (${a.level === 'deep' ? 'a strength' : 'used properly at work'})${
          a.detail ? `: ${a.detail}` : ''
        }`,
      );
    }
  }

  if (not.length) {
    lines.push('', 'They CANNOT defend these. Do not put them on the résumé at all —');
    lines.push('list them in "missing", even if the posting asks for them:');
    for (const a of not) {
      lines.push(`- ${a.skill} (${a.level === 'none' ? 'never used it' : 'tried it only'})`);
    }
  }

  return lines.join('\n');
}
