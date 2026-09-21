import { extractText, getDocumentProxy } from 'unpdf';

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

  if (file.type !== 'application/pdf') {
    return Response.json(
      { error: 'Upload a PDF or a text file, or paste the text instead.' },
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
