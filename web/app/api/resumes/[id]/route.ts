import { requireSid } from '@/lib/auth';
import { ensureSchema, sql } from '@/lib/db';
import { redirectTo } from '@/lib/redirect';
import { ResumeSchema } from '@/lib/resume-schema';
import { MAX_EDIT_BYTES, clearFlags, parseEdit, readNote } from '@/lib/resume-edit';

export const runtime = 'nodejs';

/**
 * Deletes a tailored copy. Masters cannot be deleted: `parent_id IS NOT NULL`
 * makes a post against a master a no-op rather than trusting the button to
 * only appear on tailored copies. The job stays, so it can be tailored again.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  let sid: string;
  try {
    sid = await requireSid();
  } catch {
    return redirectTo(req, '/login');
  }

  const { id } = await ctx.params;
  await ensureSchema();
  await sql()`DELETE FROM resumes WHERE id = ${id} AND sid = ${sid} AND parent_id IS NOT NULL`;
  return redirectTo(req, '/jobs');
}

/**
 * Saves an edited résumé (master or tailored copy). A fetch from the editor, not a
 * browser form, so it answers in JSON. On a tailored copy, flagged numbers the
 * person has edited are cleared from the audit; a master's original upload text
 * is never touched.
 */
export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  let sid: string;
  try {
    sid = await requireSid();
  } catch {
    return Response.json({ error: 'Sign in again to save.' }, { status: 401 });
  }

  const raw = await req.text();
  if (raw.length > MAX_EDIT_BYTES) {
    return Response.json({ error: 'That résumé is too long to save.' }, { status: 413 });
  }
  let body: { content?: unknown };
  try {
    body = JSON.parse(raw);
  } catch {
    return Response.json({ error: "That change couldn't be saved. Check the field you just edited." }, { status: 400 });
  }
  const edit = parseEdit(body?.content);
  if (!edit.ok) return Response.json({ error: edit.message }, { status: 400 });

  const { id } = await ctx.params;
  await ensureSchema();
  const q = sql();
  const row = ((await q`
    SELECT content, source_text, parent_id FROM resumes WHERE id = ${id} AND sid = ${sid}`) as unknown as {
    content: unknown;
    source_text: string | null;
    parent_id: string | null;
  }[])[0];
  if (!row) return Response.json({ error: 'Résumé not found.' }, { status: 404 });

  let sourceText = row.source_text;
  let flags: string[] = [];
  if (row.parent_id) {
    const { note, audit } = readNote(row.source_text);
    if (audit) {
      const before = ResumeSchema.safeParse(row.content);
      flags = before.success ? clearFlags(before.data, edit.resume, audit.unsupportedNumbers ?? []) : audit.unsupportedNumbers ?? [];
      sourceText = JSON.stringify({ note, audit: { ...audit, unsupportedNumbers: flags } });
    }
  }

  const saved = (await q`
    UPDATE resumes SET content = ${JSON.stringify(edit.resume)}, source_text = ${sourceText}, updated_at = now()
    WHERE id = ${id} AND sid = ${sid}
    RETURNING updated_at`) as unknown as { updated_at: string | Date }[];

  if (!saved[0]) return Response.json({ error: 'Résumé not found.' }, { status: 404 });

  return Response.json({ ok: true, updatedAt: new Date(saved[0].updated_at).toISOString(), unsupportedNumbers: flags });
}
