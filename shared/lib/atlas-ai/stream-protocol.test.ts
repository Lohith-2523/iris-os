import { describe, expect, it } from 'vitest';
import {
  consumeAtlasStream,
  encodeAtlasStreamEvent,
  responseTextChunks,
  type AtlasStreamEvent,
} from './stream-protocol';
import { consumeServerSentEvents } from './provider-stream';

function chunkedResponse(chunks: string[]) {
  const encoder = new TextEncoder();
  return new Response(new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  }));
}

describe('Miles streaming protocol', () => {
  it('parses NDJSON events split across network chunks', async () => {
    const source = [
      encodeAtlasStreamEvent({ type: 'delta', delta: 'Hello ' }),
      encodeAtlasStreamEvent({ type: 'delta', delta: 'world' }),
      encodeAtlasStreamEvent({ type: 'done', data: { sessionId: 'session-1' } }),
    ].join('');
    const events: AtlasStreamEvent[] = [];
    await consumeAtlasStream(chunkedResponse([source.slice(0, 9), source.slice(9, 31), source.slice(31)]), (event) => events.push(event));
    expect(events).toEqual([
      { type: 'delta', delta: 'Hello ' },
      { type: 'delta', delta: 'world' },
      { type: 'done', data: { sessionId: 'session-1' } },
    ]);
  });

  it('chunks completed fallback text without losing whitespace', () => {
    const text = 'Miles can stream this completed fallback response.';
    expect(responseTextChunks(text, 2).join('')).toBe(text);
  });

  it('parses provider SSE frames split across chunks', async () => {
    const values: string[] = [];
    const source = 'event: message\ndata: {"delta":"One"}\n\ndata: {"delta":" Two"}\n\ndata: [DONE]\n\n';
    await consumeServerSentEvents(chunkedResponse([source.slice(0, 17), source.slice(17, 44), source.slice(44)]), (data) => values.push(data));
    expect(values).toEqual(['{"delta":"One"}', '{"delta":" Two"}']);
  });
});
