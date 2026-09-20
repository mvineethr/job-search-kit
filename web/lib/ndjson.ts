import type { StreamEvent } from './provider';

/**
 * Events go over the wire as newline-delimited JSON. A network chunk can split a
 * line anywhere, so the caller keeps the trailing partial line and feeds it back
 * in with the next chunk.
 */
export function parseEventLines(buffer: string): { events: StreamEvent[]; rest: string } {
  const lines = buffer.split('\n');
  const rest = lines.pop() ?? ''; // last element is either '' or a partial line
  const events: StreamEvent[] = [];

  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    try {
      const parsed = JSON.parse(t);
      if (
        (parsed?.type === 'reasoning' || parsed?.type === 'content') &&
        typeof parsed.text === 'string'
      ) {
        events.push(parsed as StreamEvent);
      }
    } catch {
      // A malformed line is dropped rather than killing a run in progress.
    }
  }

  return { events, rest };
}

export function encodeEvent(event: StreamEvent): string {
  return JSON.stringify(event) + '\n';
}
