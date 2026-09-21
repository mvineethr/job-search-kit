import OpenAI from 'openai';

export type Tier = 'primary' | 'fallback';

export type ProviderConfig = {
  baseURL: string;
  apiKey: string;
  model: string;
  /**
   * Reasoning models default to maximum deliberation. Measured on a résumé review:
   * kimi-k3 at the default 'max' took 107s and produced 11 findings; at 'low' it
   * took 33s and produced 12. Maximum effort bought nothing but latency, so this
   * is set explicitly rather than left to the provider's default.
   */
  effort?: string;
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
  const effort = process.env[`${prefix}_EFFORT`] ?? '';

  if (!baseURL || !apiKey || !model) {
    if (tier === 'primary') {
      throw new Error(
        'Primary model is not configured. Set MODEL_PRIMARY_BASE_URL, MODEL_PRIMARY_KEY and MODEL_PRIMARY_NAME.',
      );
    }
    return null; // a fallback is optional
  }
  return { baseURL, apiKey, model, effort: effort || undefined };
}

type DeltaChunk = {
  choices: Array<{ delta?: { content?: string | null; reasoning_content?: string | null } }>;
};

/**
 * Reasoning models emit their thinking on `reasoning_content` for a long time
 * before the first `content` token — measured at 28s on a one-sentence question
 * and 84s on a résumé review. Dropping it means the user watches a blank panel
 * while hundreds of chunks arrive, so it is surfaced as progress instead.
 */
export type StreamEvent = { type: 'reasoning' | 'content'; text: string };

async function* toEventStream(stream: AsyncIterable<DeltaChunk>): AsyncIterable<StreamEvent> {
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta;
    if (!delta) continue;
    if (delta.reasoning_content) yield { type: 'reasoning', text: delta.reasoning_content };
    if (delta.content) yield { type: 'content', text: delta.content };
  }
}

async function open(config: ProviderConfig, system: string, messages: ChatMessage[]) {
  const client = new OpenAI({ apiKey: config.apiKey, baseURL: config.baseURL });
  return client.chat.completions.create({
    model: config.model,
    stream: true,
    ...(config.effort ? { reasoning_effort: config.effort } : {}),
    messages: [{ role: 'system', content: system }, ...messages],
  } as Parameters<typeof client.chat.completions.create>[0]);
}

/**
 * For flows whose output is a document rather than a conversation. Nothing can be
 * shown until the JSON is complete and valid, so there is no reason to stream it.
 */
export async function completeText(opts: {
  system: string;
  messages: ChatMessage[];
}): Promise<{ text: string; degraded: boolean }> {
  const collect = async (stream: AsyncIterable<StreamEvent>) => {
    let out = '';
    for await (const ev of stream) if (ev.type === 'content') out += ev.text;
    return out;
  };

  const { stream, degraded } = await streamCompletion(opts);
  return { text: await collect(stream), degraded };
}

export async function streamCompletion(opts: {
  system: string;
  messages: ChatMessage[];
}): Promise<{ stream: AsyncIterable<StreamEvent>; degraded: boolean }> {
  const primary = pickConfig('primary')!;

  try {
    const s = await open(primary, opts.system, opts.messages);
    return { stream: toEventStream(s as AsyncIterable<DeltaChunk>), degraded: false };
  } catch (err) {
    if (!shouldFallback(err as { status?: number })) throw err;

    const fallback = pickConfig('fallback');
    if (!fallback) throw err;

    const s = await open(fallback, opts.system, opts.messages);
    return { stream: toEventStream(s as AsyncIterable<DeltaChunk>), degraded: true };
  }
}
