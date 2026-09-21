import { loadPrompt } from '@/lib/prompts';
import { streamCompletion, type ChatMessage } from '@/lib/provider';
import { encodeEvent } from '@/lib/ndjson';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: Request) {
  let body: { capability?: string; messages?: ChatMessage[] };
  try {
    body = await req.json();
  } catch {
    return new Response('Malformed request body.', { status: 400 });
  }

  const { capability, messages } = body;
  if (!capability || !Array.isArray(messages) || messages.length === 0) {
    return new Response('A capability and at least one message are required.', { status: 400 });
  }

  let system: string;
  try {
    system = loadPrompt(capability);
  } catch {
    return new Response(`Unknown capability: ${capability}`, { status: 404 });
  }

  let result: Awaited<ReturnType<typeof streamCompletion>>;
  try {
    result = await streamCompletion({ system, messages });
  } catch (err) {
    console.error('[chat] provider failed', err);
    return new Response(
      'That did not go through. Your résumé is unchanged — try again in a moment.',
      { status: 502 },
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of result.stream) {
          controller.enqueue(encoder.encode(encodeEvent(event)));
        }
      } catch (err) {
        console.error('[chat] stream broke', err);
        controller.enqueue(
          encoder.encode(
            encodeEvent({
              type: 'content',
              text: '\n\n[The connection dropped before this finished.]',
            }),
          ),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'content-type': 'application/x-ndjson; charset=utf-8',
      'cache-control': 'no-store',
      // Proxies that buffer would defeat streaming entirely.
      'x-accel-buffering': 'no',
      'x-degraded': String(result.degraded),
    },
  });
}
