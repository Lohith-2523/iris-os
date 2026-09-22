export type MarkdownInlineToken = {
  type: 'text' | 'bold' | 'italic' | 'boldItalic' | 'code' | 'strike' | 'link';
  text: string;
  href?: string;
};

export type MarkdownListItem = {
  text: string;
  depth: number;
  ordinal?: number;
  checked?: boolean;
};

export type MarkdownBlock =
  | { type: 'heading'; level: number; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'code'; code: string; language?: string }
  | { type: 'blockquote'; text: string }
  | { type: 'hr' }
  | { type: 'list'; ordered: boolean; items: MarkdownListItem[] }
  | { type: 'table'; headers: string[]; rows: string[][] };

const inlinePattern = /(\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|`([^`]+)`|\*\*\*([^*]+)\*\*\*|___([^_]+)___|\*\*([^*]+)\*\*|__([^_]+)__|~~([^~]+)~~|\*([^*\n]+)\*|_([^_\n]+)_)/g;

export function parseMarkdownInline(value: string): MarkdownInlineToken[] {
  const tokens: MarkdownInlineToken[] = [];
  let cursor = 0;
  for (const match of value.matchAll(inlinePattern)) {
    const index = match.index ?? 0;
    if (index > cursor) tokens.push({ type: 'text', text: value.slice(cursor, index) });
    if (match[2] && match[3]) tokens.push({ type: 'link', text: match[2], href: match[3] });
    else if (match[4]) tokens.push({ type: 'code', text: match[4] });
    else if (match[5] || match[6]) tokens.push({ type: 'boldItalic', text: match[5] || match[6] });
    else if (match[7] || match[8]) tokens.push({ type: 'bold', text: match[7] || match[8] });
    else if (match[9]) tokens.push({ type: 'strike', text: match[9] });
    else if (match[10] || match[11]) tokens.push({ type: 'italic', text: match[10] || match[11] });
    cursor = index + match[0].length;
  }
  if (cursor < value.length) tokens.push({ type: 'text', text: value.slice(cursor) });
  return tokens.length ? tokens : [{ type: 'text', text: value }];
}

function splitTableRow(value: string) {
  const trimmed = value.trim().replace(/^\|/, '').replace(/\|$/, '');
  const cells: string[] = [];
  let cell = '';
  let escaped = false;
  for (const character of trimmed) {
    if (escaped) {
      cell += character;
      escaped = false;
    } else if (character === '\\') {
      escaped = true;
    } else if (character === '|') {
      cells.push(cell.trim());
      cell = '';
    } else {
      cell += character;
    }
  }
  cells.push(cell.trim());
  return cells;
}

function isTableSeparator(value: string) {
  const cells = splitTableRow(value);
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function startsBlock(lines: string[], index: number) {
  const trimmed = lines[index]?.trim() || '';
  return !trimmed
    || /^#{1,6}\s+/.test(trimmed)
    || /^```/.test(trimmed)
    || /^(?:-{3,}|\*{3,}|_{3,})$/.test(trimmed)
    || /^>/.test(trimmed)
    || /^(?:[*+-]|\d+\.)\s+/.test(trimmed)
    || (trimmed.includes('|') && isTableSeparator(lines[index + 1] || ''));
}

export function parseMarkdown(value: string): MarkdownBlock[] {
  const lines = String(value || '').replace(/\r\n?/g, '\n').split('\n');
  const blocks: MarkdownBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();
    if (!trimmed) {
      index += 1;
      continue;
    }

    const fence = trimmed.match(/^```\s*([^\s`]*)/);
    if (fence) {
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].trim().startsWith('```')) {
        code.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) index += 1;
      blocks.push({ type: 'code', code: code.join('\n'), language: fence[1] || undefined });
      continue;
    }

    const heading = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      blocks.push({ type: 'heading', level: heading[1].length, text: heading[2].replace(/\s+#+$/, '') });
      index += 1;
      continue;
    }

    if (/^(?:-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      blocks.push({ type: 'hr' });
      index += 1;
      continue;
    }

    if (trimmed.startsWith('>')) {
      const quoted: string[] = [];
      while (index < lines.length && lines[index].trim().startsWith('>')) {
        quoted.push(lines[index].trim().replace(/^>\s?/, ''));
        index += 1;
      }
      blocks.push({ type: 'blockquote', text: quoted.join(' ') });
      continue;
    }

    const listMatch = line.match(/^(\s*)([*+-]|(\d+)\.)\s+(.*)$/);
    if (listMatch) {
      const ordered = Boolean(listMatch[3]);
      const items: MarkdownListItem[] = [];
      while (index < lines.length) {
        const itemMatch = lines[index].match(/^(\s*)([*+-]|(\d+)\.)\s+(.*)$/);
        if (!itemMatch || Boolean(itemMatch[3]) !== ordered) break;
        const task = itemMatch[4].match(/^\[([ xX])\]\s+(.*)$/);
        items.push({
          text: task ? task[2] : itemMatch[4],
          depth: Math.floor(itemMatch[1].replace(/\t/g, '  ').length / 2),
          ...(ordered ? { ordinal: Number(itemMatch[3]) } : {}),
          ...(task ? { checked: task[1].toLowerCase() === 'x' } : {}),
        });
        index += 1;
      }
      blocks.push({ type: 'list', ordered, items });
      continue;
    }

    if (trimmed.includes('|') && isTableSeparator(lines[index + 1] || '')) {
      const headers = splitTableRow(line);
      index += 2;
      const rows: string[][] = [];
      while (index < lines.length && lines[index].trim() && lines[index].includes('|')) {
        const row = splitTableRow(lines[index]);
        rows.push(headers.map((_, cellIndex) => row[cellIndex] || ''));
        index += 1;
      }
      blocks.push({ type: 'table', headers, rows });
      continue;
    }

    const paragraph = [trimmed];
    index += 1;
    while (index < lines.length && !startsBlock(lines, index)) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    blocks.push({ type: 'paragraph', text: paragraph.join(' ') });
  }

  return blocks;
}

export function markdownToPlainText(value: string) {
  return parseMarkdownInline(String(value || ''))
    .map((token) => token.text)
    .join('')
    .replace(/\\([\\`*_[\]{}()#+.!|>-])/g, '$1')
    .trim();
}
