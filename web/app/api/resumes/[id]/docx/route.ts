import { requireSid } from '@/lib/auth';
import { ensureSchema, sql, type ResumeRow } from '@/lib/db';
import { ResumeSchema } from '@/lib/resume-schema';
import { resumeDocx } from '@/lib/docx';

export const runtime = 'nodejs';

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  let sid: string;
  try {
    sid = await requireSid();
  } catch {
    return new Response('Sign in first.', { status: 401 });
  }

  const { id } = await ctx.params;
  await ensureSchema();
  const row = ((await sql()`
    SELECT title, content FROM resumes WHERE id = ${id} AND sid = ${sid}`) as unknown as ResumeRow[])[0];
  const parsed = ResumeSchema.safeParse(row?.content);
  if (!row || !parsed.success) return new Response('That résumé cannot be exported.', { status: 404 });

  const filename = `${parsed.data.name} - ${row.title}.docx`.replace(/[\\/:*?"<>|]+/g, '');
  return new Response(new Uint8Array(resumeDocx(parsed.data)), {
    headers: {
      'content-type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      // Plain ASCII fallback plus the UTF-8 name, for browsers that support it.
      'content-disposition': `attachment; filename="${filename.replace(/[^\x20-\x7e]/g, '_')}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}
