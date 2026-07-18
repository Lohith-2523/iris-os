import * as React from 'react';

interface Block {
  type: 'p' | 'h1' | 'h2' | 'h3' | 'code' | 'blockquote' | 'hr' | 'li' | 'table';
  text?: string;
  code?: string;
  language?: string;
  listType?: 'ul' | 'ol';
  indent?: number;
  index?: number;
  headers?: string[];
  rows?: string[][];
}

function renderInline(text: string): React.ReactNode[] {
  if (!text) return [];
  
  // Match inline code: `code`
  // Match bold-italic: ***text***
  // Match bold: **text** or __text__
  // Match italic: *text* or _text_
  const regex = /(`[^`]+`|\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|__[^*]+__|_[^_]+_|\*[^*]+\*)/g;
  const parts = text.split(regex);
  
  return parts.map((part, index) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code 
          key={index} 
          className="px-1.5 py-0.5 bg-zinc-950 text-zinc-300 font-mono text-[10px] border border-zinc-800 rounded mx-0.5 inline-block align-middle"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('***') && part.endsWith('***')) {
      return (
        <strong key={index} className="font-bold italic text-white">
          {part.slice(3, -3)}
        </strong>
      );
    }
    if ((part.startsWith('**') && part.endsWith('**')) || (part.startsWith('__') && part.endsWith('__'))) {
      return (
        <strong key={index} className="font-bold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_'))) {
      return (
        <em key={index} className="italic text-zinc-350">
          {part.slice(1, -1)}
        </em>
      );
    }
    return part;
  });
}

function parseAndPushTable(lines: string[], blocks: Block[]) {
  if (lines.length === 0) return;

  const parseRow = (rowStr: string) => {
    const rawCells = rowStr.split('|');
    return rawCells
      .slice(1, rawCells.length - 1)
      .map(cell => cell.trim());
  };

  const firstRow = parseRow(lines[0]);
  
  let hasSeparator = false;
  if (lines.length > 1) {
    const secondRow = parseRow(lines[1]);
    hasSeparator = secondRow.every(cell => /^:?-+:?$/.test(cell));
  }

  if (hasSeparator) {
    const headers = firstRow;
    const rows = lines.slice(2).map(parseRow);
    blocks.push({ type: 'table', headers, rows });
  } else {
    const headers = firstRow;
    const rows = lines.slice(1).map(parseRow);
    blocks.push({ type: 'table', headers, rows });
  }
}

export function FormattedMarkdown({ text }: { text: string }) {
  if (!text) return null;

  const lines = text.split('\n');
  const blocks: Block[] = [];
  
  let inCodeBlock = false;
  let codeContent: string[] = [];
  let codeLanguage = '';

  let inTable = false;
  let tableLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // 1. Code Block Handling
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        blocks.push({
          type: 'code',
          code: codeContent.join('\n'),
          language: codeLanguage
        });
        codeContent = [];
        codeLanguage = '';
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
        codeLanguage = trimmed.slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeContent.push(line);
      continue;
    }

    // 2. Table Handling
    if (trimmed.startsWith('|')) {
      inTable = true;
      tableLines.push(line);
      continue;
    } else if (inTable) {
      parseAndPushTable(tableLines, blocks);
      tableLines = [];
      inTable = false;
    }

    // 3. Horizontal Rule
    if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
      blocks.push({ type: 'hr' });
      continue;
    }

    // 4. Headers (H1-H6)
    const headerMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (headerMatch) {
      const level = headerMatch[1].length;
      const headerText = headerMatch[2];
      if (level === 1) {
        blocks.push({ type: 'h1', text: headerText });
      } else if (level === 2) {
        blocks.push({ type: 'h2', text: headerText });
      } else {
        blocks.push({ type: 'h3', text: headerText });
      }
      continue;
    }

    // 5. Blockquotes
    if (trimmed.startsWith('>')) {
      blocks.push({ type: 'blockquote', text: trimmed.slice(1).trim() });
      continue;
    }

    // 6. List Items
    const bulletMatch = line.match(/^(\s*)([*+-]|\xb7|•)\s+(.*)$/);
    if (bulletMatch) {
      const indentSpaces = bulletMatch[1].length;
      const content = bulletMatch[3];
      blocks.push({
        type: 'li',
        listType: 'ul',
        text: content,
        indent: Math.floor(indentSpaces / 2)
      });
      continue;
    }

    const numberMatch = line.match(/^(\s*)(\d+)\.\s+(.*)$/);
    if (numberMatch) {
      const indentSpaces = numberMatch[1].length;
      const index = parseInt(numberMatch[2]);
      const content = numberMatch[3];
      blocks.push({
        type: 'li',
        listType: 'ol',
        text: content,
        indent: Math.floor(indentSpaces / 2),
        index
      });
      continue;
    }

    // 7. Empty Lines
    if (!trimmed) {
      continue;
    }

    // 8. Standard Paragraph
    blocks.push({ type: 'p', text: line });
  }

  if (inTable && tableLines.length > 0) {
    parseAndPushTable(tableLines, blocks);
  }

  return (
    <div className="space-y-3.5 font-sans leading-relaxed text-[12px] text-zinc-300">
      {blocks.map((block, idx) => {
        switch (block.type) {
          case 'h1':
            return (
              <h2 key={idx} className="text-base font-bold text-white mt-4 mb-2">
                {renderInline(block.text || '')}
              </h2>
            );
          case 'h2':
            return (
              <h3 key={idx} className="text-sm font-bold text-white mt-3 mb-1.5">
                {renderInline(block.text || '')}
              </h3>
            );
          case 'h3':
            return (
              <h4 key={idx} className="text-xs font-bold text-zinc-200 uppercase tracking-wider mt-2.5 mb-1">
                {renderInline(block.text || '')}
              </h4>
            );
          case 'hr':
            return <hr key={idx} className="border-t border-zinc-850 my-4" />;
          case 'p':
            return (
              <p key={idx} className="text-zinc-300 leading-relaxed">
                {renderInline(block.text || '')}
              </p>
            );
          case 'blockquote':
            return (
              <blockquote key={idx} className="border-l-2 border-zinc-700 pl-3 italic text-zinc-400 bg-zinc-950/20 py-1.5 my-2.5 rounded-r">
                {renderInline(block.text || '')}
              </blockquote>
            );
          case 'code':
            return (
              <pre 
                key={idx} 
                className="p-3.5 bg-zinc-950 border border-zinc-855 text-zinc-350 font-mono text-[10px] rounded-md overflow-x-auto my-3 shadow-inner"
              >
                <code>{block.code}</code>
              </pre>
            );
          case 'li': {
            const indentStyle = { paddingLeft: `${(block.indent || 0) * 1.25 + 0.75}rem` };
            return (
              <div key={idx} className="flex gap-2 py-0.5" style={indentStyle}>
                <span className="text-zinc-500 font-semibold select-none">
                  {block.listType === 'ol' ? `${block.index || 1}.` : '•'}
                </span>
                <span className="flex-1 text-zinc-300">{renderInline(block.text || '')}</span>
              </div>
            );
          }
          case 'table':
            return (
              <div key={idx} className="my-4 overflow-x-auto border border-zinc-850 rounded-md">
                <table className="w-full text-left border-collapse text-[11px] font-sans">
                  <thead>
                    <tr className="bg-zinc-900/60 border-b border-zinc-850 text-white font-semibold">
                      {(block.headers || []).map((h, hIdx) => (
                        <th key={hIdx} className="px-3.5 py-2.5">
                          {renderInline(h)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(block.rows || []).map((row, rIdx) => (
                      <tr 
                        key={rIdx} 
                        className="border-b border-zinc-850/60 last:border-0 hover:bg-zinc-950/30 text-zinc-300 transition-colors"
                      >
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="px-3.5 py-2">
                            {renderInline(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}

export default FormattedMarkdown;
