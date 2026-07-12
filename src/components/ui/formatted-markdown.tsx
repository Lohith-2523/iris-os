import * as React from 'react';

function renderInline(text: string) {
  // 1. Split by inline code: `code`
  const codeParts = text.split(/(`[^`]+`)/g);
  
  return codeParts.flatMap((part, index) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code 
          key={`code-${index}`} 
          className="px-1.5 py-0.5 bg-zinc-800 text-zinc-200 font-mono text-[10px] border border-zinc-700/60 rounded-md inline-block align-middle"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    
    // 2. Split by bold: **bold**
    const boldParts = part.split(/(\*\*[^*]+\*\*)/g);
    return boldParts.map((subPart, subIndex) => {
      if (subPart.startsWith('**') && subPart.endsWith('**')) {
        return (
          <strong key={`bold-${index}-${subIndex}`} className="font-bold text-white">
            {subPart.slice(2, -2)}
          </strong>
        );
      }
      
      // 3. Split by italics: *italic* or _italic_
      const italicParts = subPart.split(/(\*[^*]+\*)/g);
      return italicParts.map((italPart, italIndex) => {
        if (italPart.startsWith('*') && italPart.endsWith('*')) {
          return (
            <em key={`italic-${index}-${subIndex}-${italIndex}`} className="italic text-zinc-250">
              {italPart.slice(1, -1)}
            </em>
          );
        }
        return italPart;
      });
    });
  });
}

export function FormattedMarkdown({ text }: { text: string }) {
  if (!text) return null;

  // Split by code blocks first
  const blocks = text.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-1.5 font-sans leading-relaxed">
      {blocks.map((block, blockIdx) => {
        if (block.startsWith('```') && block.endsWith('```')) {
          // It is a code block
          const lines = block.split('\n');
          const codeLines = lines.slice(1, -1).join('\n');
          return (
            <pre 
              key={`block-${blockIdx}`} 
              className="p-3 bg-zinc-950 border border-zinc-850 text-zinc-300 font-mono text-[10px] rounded-md overflow-x-auto my-2"
            >
              <code>{codeLines}</code>
            </pre>
          );
        }

        // It is standard text blocks. Split by newlines.
        const lines = block.split('\n');
        return lines.map((line, lineIdx) => {
          const trimmed = line.trim();

          // Headers
          if (trimmed.startsWith('### ')) {
            return (
              <h4 key={`h3-${blockIdx}-${lineIdx}`} className="text-xs font-bold text-white mt-3 mb-1 uppercase tracking-wider">
                {renderInline(trimmed.slice(4))}
              </h4>
            );
          }
          if (trimmed.startsWith('## ')) {
            return (
              <h3 key={`h2-${blockIdx}-${lineIdx}`} className="text-sm font-bold text-white mt-4 mb-2">
                {renderInline(trimmed.slice(3))}
              </h3>
            );
          }
          if (trimmed.startsWith('# ')) {
            return (
              <h2 key={`h1-${blockIdx}-${lineIdx}`} className="text-base font-bold text-white mt-5 mb-2">
                {renderInline(trimmed.slice(2))}
              </h2>
            );
          }

          // Bullet point lists
          if (trimmed.startsWith('* ') || trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
            return (
              <div key={`bullet-${blockIdx}-${lineIdx}`} className="flex gap-2 pl-3 py-0.5">
                <span className="text-zinc-500">•</span>
                <span className="flex-1 text-zinc-300">{renderInline(trimmed.slice(2))}</span>
              </div>
            );
          }

          // Numbered lists
          const matchNumbered = trimmed.match(/^(\d+)\.\s+(.*)$/);
          if (matchNumbered) {
            const num = matchNumbered[1];
            const content = matchNumbered[2];
            return (
              <div key={`number-${blockIdx}-${lineIdx}`} className="flex gap-2 pl-3 py-0.5">
                <span className="text-zinc-500 font-mono">{num}.</span>
                <span className="flex-1 text-zinc-300">{renderInline(content)}</span>
              </div>
            );
          }

          // Render empty lines as micro-separators
          if (!trimmed) {
            return <div key={`empty-${blockIdx}-${lineIdx}`} className="h-1" />;
          }

          // Paragraph
          return (
            <p key={`p-${blockIdx}-${lineIdx}`} className="text-zinc-300">
              {renderInline(line)}
            </p>
          );
        });
      })}
    </div>
  );
}

export default FormattedMarkdown;
