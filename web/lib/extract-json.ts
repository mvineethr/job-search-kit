/**
 * Pulls the JSON object out of a model reply.
 *
 * Models wrap JSON in a fence, sometimes add prose around it, and occasionally
 * skip the fence entirely. Rather than demand one shape, try each in turn and
 * let the caller's schema decide whether what came back is usable.
 */
export function extractJsonObject(text: string): unknown | null {
  const candidates: string[] = [];

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) candidates.push(fenced[1]);

  // An unfenced object: from the first brace to the last.
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first >= 0 && last > first) candidates.push(text.slice(first, last + 1));

  for (const c of candidates) {
    try {
      const parsed = JSON.parse(c.trim());
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
    } catch {
      // try the next candidate
    }
  }
  return null;
}

/** The prose part, with any fenced block removed. */
export function proseBefore(text: string): string {
  const fence = text.indexOf('```');
  return (fence >= 0 ? text.slice(0, fence) : text).trim();
}
