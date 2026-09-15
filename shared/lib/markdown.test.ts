import { describe, expect, it } from 'vitest';
import { markdownToPlainText, parseMarkdown, parseMarkdownInline } from './markdown';

describe('Markdown formatting', () => {
  it('parses rich inline formatting without leaving control symbols', () => {
    const tokens = parseMarkdownInline('Use **bold**, *italic*, ~~old~~, `code`, and [docs](https://example.com).');
    expect(tokens.map((token) => token.type)).toEqual([
      'text', 'bold', 'text', 'italic', 'text', 'strike', 'text', 'code', 'text', 'link', 'text',
    ]);
    expect(markdownToPlainText('**Revenue** is *healthy*.')).toBe('Revenue is healthy.');
  });

  it('parses headings, task lists, and GFM tables', () => {
    const blocks = parseMarkdown([
      '## Performance',
      '',
      '- [x] Verified revenue',
      '- [ ] Review risk',
      '',
      '| Metric | Value |',
      '| --- | ---: |',
      '| Revenue | **$25,000** |',
    ].join('\n'));
    expect(blocks[0]).toMatchObject({ type: 'heading', level: 2 });
    expect(blocks[1]).toMatchObject({ type: 'list', items: [{ checked: true }, { checked: false }] });
    expect(blocks[2]).toMatchObject({ type: 'table', headers: ['Metric', 'Value'], rows: [['Revenue', '**$25,000**']] });
  });
});
