import * as React from 'react';
import { parseMarkdown, parseMarkdownInline } from '@/lib/markdown';

function renderInline(text: string) {
  return parseMarkdownInline(text).map((token, index) => {
    const key = `${token.type}-${index}`;
    switch (token.type) {
      case 'bold':
        return <strong key={key} className="font-bold text-foreground">{token.text}</strong>;
      case 'italic':
        return <em key={key} className="italic text-foreground/85">{token.text}</em>;
      case 'boldItalic':
        return <strong key={key} className="font-bold italic text-foreground">{token.text}</strong>;
      case 'strike':
        return <del key={key} className="text-muted-foreground decoration-muted-foreground">{token.text}</del>;
      case 'code':
        return <code key={key} className="mx-0.5 inline rounded border border-border bg-muted px-1.5 py-0.5 align-middle font-mono text-[0.88em] text-foreground">{token.text}</code>;
      case 'link':
        return <a key={key} href={token.href} target="_blank" rel="noreferrer noopener" className="font-medium text-sky-500 underline decoration-sky-500/40 underline-offset-2 hover:text-sky-400">{token.text}</a>;
      default:
        return <React.Fragment key={key}>{token.text}</React.Fragment>;
    }
  });
}

export function FormattedMarkdown({ text, className = '' }: { text: string; className?: string }) {
  if (!text) return null;
  const blocks = parseMarkdown(text);

  return (
    <div className={`formatted-markdown min-w-0 break-words space-y-3.5 font-sans text-xs leading-relaxed text-muted-foreground ${className}`}>
      {blocks.map((block, index) => {
        const key = `${block.type}-${index}`;
        if (block.type === 'heading') {
          if (block.level === 1) return <h2 key={key} className="mt-5 text-base font-bold text-foreground first:mt-0">{renderInline(block.text)}</h2>;
          if (block.level === 2) return <h3 key={key} className="mt-4 text-sm font-bold text-foreground first:mt-0">{renderInline(block.text)}</h3>;
          return <h4 key={key} className="mt-3 text-xs font-bold uppercase tracking-wider text-foreground first:mt-0">{renderInline(block.text)}</h4>;
        }
        if (block.type === 'paragraph') return <p key={key} className="leading-6 text-foreground/85">{renderInline(block.text)}</p>;
        if (block.type === 'hr') return <hr key={key} className="my-4 border-border" />;
        if (block.type === 'blockquote') return <blockquote key={key} className="rounded-r-md border-l-2 border-sky-500/70 bg-muted/55 py-2 pl-3 pr-2 italic text-foreground/75">{renderInline(block.text)}</blockquote>;
        if (block.type === 'code') {
          return (
            <div key={key} className="my-3 overflow-hidden rounded-md border border-border bg-zinc-950 shadow-inner">
              {block.language && <div className="border-b border-zinc-800 px-3 py-1.5 font-mono text-[9px] uppercase tracking-wider text-zinc-500">{block.language}</div>}
              <pre className="overflow-x-auto p-3.5 font-mono text-[10px] leading-5 text-zinc-200"><code>{block.code}</code></pre>
            </div>
          );
        }
        if (block.type === 'list') {
          const List = block.ordered ? 'ol' : 'ul';
          return (
            <List key={key} className={`space-y-1.5 text-foreground/85 ${block.ordered ? 'list-decimal' : 'list-disc'} pl-5 marker:font-semibold marker:text-muted-foreground`}>
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex} className="pl-1 leading-5" style={{ marginLeft: `${item.depth * 1.1}rem` }} value={item.ordinal}>
                  {item.checked !== undefined && (
                    <span aria-label={item.checked ? 'Completed' : 'Not completed'} className={`mr-2 inline-flex h-3.5 w-3.5 items-center justify-center rounded-sm border align-[-2px] text-[9px] ${item.checked ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-border bg-muted'}`}>
                      {item.checked ? '✓' : ''}
                    </span>
                  )}
                  {renderInline(item.text)}
                </li>
              ))}
            </List>
          );
        }
        if (block.type === 'table') {
          return (
            <div key={key} className="my-4 overflow-x-auto rounded-md border border-border">
              <table className="w-full min-w-max border-collapse text-left font-sans text-[11px]">
                <thead>
                  <tr className="border-b border-border bg-muted/80 text-foreground">
                    {block.headers.map((header, headerIndex) => <th key={headerIndex} scope="col" className="px-3.5 py-2.5 font-semibold">{renderInline(header)}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row, rowIndex) => (
                    <tr key={rowIndex} className="border-b border-border/70 text-foreground/80 last:border-0 even:bg-muted/30 hover:bg-muted/55">
                      {row.map((cell, cellIndex) => <td key={cellIndex} className="px-3.5 py-2 align-top leading-5">{renderInline(cell)}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}

export default FormattedMarkdown;
