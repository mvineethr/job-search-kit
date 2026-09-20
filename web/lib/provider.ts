import OpenAI from 'openai';

export type Tier = 'primary' | 'fallback';

export type ProviderConfig = {
  baseURL: string;
  apiKey: string;
  model: string;
};

export type ChatMessage = { role: 'user' | 'assistant'; content: string };

/**
 * Fall back only when the primary is unavailable — rate limited, down, or unreachable.
 * A 4xx that is not 429 means we sent something wrong; retrying elsewhere would hide
 * our own bug behind a second provider's response.
 */
export function shouldFallback(err: { status?: number }): boolean {
  const status = err?.status;
  if (status === undefined) return true; // network-level failure
  if (status === 429) return true;
  return status >= 500;
}

export function pickConfig(tier: Tier): ProviderConfig | null {
  const prefix = tier === 'primary' ? 'MODEL_PRIMARY' : 'MODEL_FALLBACK';
  const baseURL = process.env[`${prefix}_BASE_URL`] ?? '';
  const apiKey = process.env[`${prefix}_KEY`] ?? '';
  const model = process.env[`${prefix}_NAME`] ?? '';

  if (!baseURL || !apiKey || !model) {
    if (tier === 'primary') {
      throw new Error(
        'Primary model is not configured. Set MODEL_PRIMARY_BASE_URL, MODEL_PRIMARY_KEY and MODEL_PRIMARY_NAME.',
      );
    }
    return null; // a fallback is optional
  }
  return { baseURL, apiKey, model };
}

type DeltaChunk = { choices: Array<{ delta?: { content?: string | null } }> };

async function* toTextStream(stream: AsyncIterable<DeltaChunk>): AsyncIterable<string> {
  for await (const chunk of stream) {
    const piece = chunk.choices[0]?.delta?.content;
    if (piece) yield piece;
  }
}

async function open(config: ProviderConfig, system: string, messages: ChatMessage[]) {
  const client = new OpenAI({ apiKey: config.apiKey, baseURL: config.baseURL });
  return client.chat.completions.create({
    model: config.model,
    stream: true,
    messages: [{ role: 'system', content: system }, ...messages],
  });
}

export async function streamCompletion(opts: {
  system: string;
  messages: ChatMessage[];
}): Promise<{ stream: AsyncIterable<string>; degraded: boolean }> {
  const primary = pickConfig('primary')!;

  try {
    const s = await open(primary, opts.system, opts.messages);
    return { stream: toTextStream(s as AsyncIterable<DeltaChunk>), degraded: false };
  } catch (err) {
    if (!shouldFallback(err as { status?: number })) throw err;

    const fallback = pickConfig('fallback');
    if (!fallback) throw err;

    const s = await open(fallback, opts.system, opts.messages);
    return { stream: toTextStream(s as AsyncIterable<DeltaChunk>), degraded: true };
  }
}
