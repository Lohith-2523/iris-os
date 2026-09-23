export type AtlasStreamEvent =
  | { type: 'delta'; delta: string }
  | { type: 'done'; data: Record<string, unknown> }
  | { type: 'error'; error: string; status?: number };

export function encodeAtlasStreamEvent(event: AtlasStreamEvent) {
  return `${JSON.stringify(event)}\n`;
}

export function responseTextChunks(value: string, wordsPerChunk = 3) {
  const words = value.match(/\S+\s*/g) || [];
  const chunks: string[] = [];
  for (let index = 0; index < words.length; index += wordsPerChunk) {
    chunks.push(words.slice(index, index + wordsPerChunk).join(''));
  }
  return chunks;
}

export async function consumeAtlasStream(
  response: Response,
  onEvent: (event: AtlasStreamEvent) => void,
) {
  if (!response.body) throw new Error('Miles returned an empty response stream.');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const consumeLine = (line: string) => {
    if (!line.trim()) return;
    const event = JSON.parse(line) as AtlasStreamEvent;
    onEvent(event);
  };

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) consumeLine(line);
    if (done) break;
  }
  consumeLine(buffer);
}

