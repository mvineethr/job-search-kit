import { extractText, getDocumentProxy } from 'unpdf';
import { linkedinZipToText, NOT_LINKEDIN } from '@/lib/linkedin-zip';

export const runtime = 'nodejs';
export const maxDuration = 30;

const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: 'That upload could not be read.' }, { status: 400 });
  }

  const file = form.get('file');

  if (!(file instanceof File)) {
    return Response.json({ error: 'No file was attached.' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: 'That file is larger than 5MB.' }, { status: 413 });
  }

  const buffer = new Uint8Array(await file.arrayBuffer());

  // Plain text needs no extraction.
  if (file.type.startsWith('text/') || file.name.endsWith('.md') || file.name.endsWith('.txt')) {
    return Response.json({ text: new TextDecoder().decode(buffer), pages: 1 });
  }

  const isZip =
    file.type === 'application/zip' ||
    file.type === 'application/x-zip-compressed' ||
    file.name.toLowerCase().endsWith('.zip');
  if (isZip) {
    try {
      return Response.json({ text: linkedinZipToText(Buffer.from(buffer)), pages: 1 });
    } catch (err) {
      const known = err instanceof Error && (err.message === NOT_LINKEDIN || err.message.startsWith('That '));
      if (!known) console.error('[extract] zip failed', err);
      return Response.json(
        { error: known ? (err as Error).message : 'That zip could not be read. Try the profile PDF instead.' },
        { status: 422 },
      );
    }
  }

  if (file.type !== 'application/pdf') {
    return Response.json(
      { error: 'Upload a PDF, a text file or a LinkedIn zip, or paste the text instead.' },
      { status: 415 },
    );
  }

  try {
    const pdf = await getDocumentProxy(buffer);
    const { text, totalPages } = await extractText(pdf, { mergePages: true });
    return Response.json({ text: String(text), pages: totalPages });
  } catch (err) {
    console.error('[extract] pdf failed', err);
    return Response.json(
      { error: 'That PDF could not be read. Paste the text instead — it works just as well.' },
      { status: 422 },
    );
  }
  // The buffer goes out of scope here. Nothing is written to disk or to storage.
}
