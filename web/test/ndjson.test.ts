import { describe, it, expect } from 'vitest';
import { parseEventLines, encodeEvent } from '@/lib/ndjson';

describe('parseEventLines', () => {
  it('parses complete lines', () => {
    const buf =
      encodeEvent({ type: 'reasoning', text: 'thinking' }) +
      encodeEvent({ type: 'content', text: 'Hello' });
    const { events, rest } = parseEventLines(buf);
    expect(events).toHaveLength(2);
    expect(events[0].type).toBe('reasoning');
    expect(events[1].text).toBe('Hello');
    expect(rest).toBe('');
  });

  it('holds back a line split across chunks and completes it on the next', () => {
    const whole = encodeEvent({ type: 'content', text: 'Your résumé is thin' });
    const cut = Math.floor(whole.length / 2);

    const first = parseEventLines(whole.slice(0, cut));
    expect(first.events).toHaveLength(0);
    expect(first.rest).not.toBe('');

    const second = parseEventLines(first.rest + whole.slice(cut));
    expect(second.events).toHaveLength(1);
    expect(second.events[0].text).toBe('Your résumé is thin');
  });

  it('survives text containing newlines, because they are escaped in JSON', () => {
    const buf = encodeEvent({ type: 'content', text: 'line one\nline two' });
    const { events } = parseEventLines(buf);
    expect(events).toHaveLength(1);
    expect(events[0].text).toBe('line one\nline two');
  });

  it('drops a malformed line rather than killing the run', () => {
    const buf = 'not json\n' + encodeEvent({ type: 'content', text: 'ok' });
    const { events } = parseEventLines(buf);
    expect(events).toHaveLength(1);
    expect(events[0].text).toBe('ok');
  });

  it('ignores an event with an unknown type', () => {
    const buf = JSON.stringify({ type: 'mystery', text: 'x' }) + '\n';
    expect(parseEventLines(buf).events).toEqual([]);
  });
});
