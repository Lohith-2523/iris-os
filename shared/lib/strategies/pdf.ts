import 'server-only';

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from 'pdf-lib';
import { markdownToPlainText, parseMarkdown, parseMarkdownInline, type MarkdownInlineToken } from '@/lib/markdown';

const WIDTH = 595.28;
const HEIGHT = 841.89;
const MARGIN = 48;
const BLACK = rgb(0.035, 0.039, 0.047);
const SILVER = rgb(0.63, 0.65, 0.69);
const WHITE = rgb(1, 1, 1);
const BODY = rgb(0.18, 0.2, 0.23);
const LINE = rgb(0.84, 0.85, 0.87);

type StrategyPdfInput = {
  title: string;
  type: string;
  goal: string;
  timeline: string;
  content: string;
  organizationName: string;
  createdBy: string;
  createdAt: Date;
};

function safe(value: unknown) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[^\x20-\x7E\n]/g, '')
    .trim();
}

function stripInlineMarkdown(value: string) {
  return safe(markdownToPlainText(value));
}

function wrap(text: string, font: PDFFont, size: number, width: number) {
  const words = stripInlineMarkdown(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= width) current = candidate;
    else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function wrapLiteral(text: string, font: PDFFont, size: number, width: number) {
  const words = safe(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= width) current = candidate;
    else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [''];
}

type PdfFonts = {
  regular: PDFFont;
  bold: PDFFont;
  italic: PDFFont;
  boldItalic: PDFFont;
  mono: PDFFont;
};

type RichRun = { text: string; font: PDFFont; strike?: boolean; link?: boolean };

function fontForToken(token: MarkdownInlineToken, fonts: PdfFonts, defaultFont: PDFFont) {
  if (token.type === 'bold') return fonts.bold;
  if (token.type === 'italic') return fonts.italic;
  if (token.type === 'boldItalic') return fonts.boldItalic;
  if (token.type === 'code') return fonts.mono;
  return defaultFont;
}

function layoutRichText(value: string, fonts: PdfFonts, size: number, maxWidth: number, defaultFont = fonts.regular) {
  const lines: RichRun[][] = [[]];
  let lineWidth = 0;
  for (const token of parseMarkdownInline(value)) {
    const font = fontForToken(token, fonts, defaultFont);
    const chunks = safe(token.text).split(/(\s+)/).filter(Boolean);
    for (const rawChunk of chunks) {
      const chunk = /^\s+$/.test(rawChunk) ? ' ' : rawChunk;
      if (chunk === ' ' && lineWidth === 0) continue;
      const width = font.widthOfTextAtSize(chunk, size);
      if (lineWidth > 0 && lineWidth + width > maxWidth) {
        lines.push([]);
        lineWidth = 0;
        if (chunk === ' ') continue;
      }
      lines[lines.length - 1].push({
        text: chunk,
        font,
        strike: token.type === 'strike',
        link: token.type === 'link',
      });
      lineWidth += width;
    }
  }
  return lines.filter((line) => line.length > 0);
}

export async function generateStrategyPdf(input: StrategyPdfInput) {
  const document = await PDFDocument.create();
  document.setTitle(safe(input.title));
  document.setAuthor('IrisOS');
  document.setSubject(`${safe(input.type)} strategy`);
  document.setCreator('IrisOS Strategy Studio');
  const font = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const italic = await document.embedFont(StandardFonts.HelveticaOblique);
  const boldItalic = await document.embedFont(StandardFonts.HelveticaBoldOblique);
  const mono = await document.embedFont(StandardFonts.Courier);
  const fonts: PdfFonts = { regular: font, bold, italic, boldItalic, mono };
  let page: PDFPage;
  let cursor = 0;
  let pageNumber = 0;

  const addPage = async () => {
    page = document.addPage([WIDTH, HEIGHT]);
    pageNumber += 1;
    page.drawRectangle({ x: 0, y: 0, width: WIDTH, height: HEIGHT, color: WHITE });
    page.drawRectangle({ x: 0, y: HEIGHT - 92, width: WIDTH, height: 92, color: BLACK });
    try {
      const bytes = await readFile(path.join(process.cwd(), 'public', 'iris-logo-black-bg.png'));
      const logo = await document.embedPng(Uint8Array.from(bytes));
      const scaled = logo.scaleToFit(92, 34);
      page.drawImage(logo, { x: MARGIN, y: HEIGHT - 64, width: scaled.width, height: scaled.height });
    } catch {
      page.drawText('IRISOS', { x: MARGIN, y: HEIGHT - 55, size: 15, font: bold, color: WHITE });
    }
    page.drawText('STRATEGY STUDIO', {
      x: WIDTH - MARGIN - 112,
      y: HEIGHT - 48,
      size: 10,
      font: bold,
      color: WHITE,
    });
    page.drawText(`${safe(input.type).replaceAll('_', ' ')} / PAGE ${pageNumber}`, {
      x: WIDTH - MARGIN - 112,
      y: HEIGHT - 64,
      size: 7,
      font,
      color: SILVER,
    });
    cursor = HEIGHT - 122;
  };

  const ensureSpace = async (height: number) => {
    if (cursor - height < 58) await addPage();
  };

  const drawRichText = async (value: string, options?: {
    x?: number;
    width?: number;
    size?: number;
    color?: ReturnType<typeof rgb>;
    font?: PDFFont;
    lineHeight?: number;
    gapAfter?: number;
  }) => {
    const x = options?.x ?? MARGIN;
    const size = options?.size ?? 9;
    const lineHeight = options?.lineHeight ?? size + 3;
    const lines = layoutRichText(value, fonts, size, options?.width ?? WIDTH - MARGIN - x, options?.font);
    await ensureSpace(lines.length * lineHeight + (options?.gapAfter ?? 3));
    lines.forEach((line, lineIndex) => {
      let runX = x;
      line.forEach((run) => {
        const runColor = run.link ? rgb(0.12, 0.34, 0.68) : (options?.color ?? BODY);
        page!.drawText(run.text, { x: runX, y: cursor - lineIndex * lineHeight, size, font: run.font, color: runColor });
        const runWidth = run.font.widthOfTextAtSize(run.text, size);
        if (run.strike) page!.drawLine({ start: { x: runX, y: cursor - lineIndex * lineHeight + size * 0.36 }, end: { x: runX + runWidth, y: cursor - lineIndex * lineHeight + size * 0.36 }, thickness: 0.6, color: runColor });
        if (run.link) page!.drawLine({ start: { x: runX, y: cursor - lineIndex * lineHeight - 1 }, end: { x: runX + runWidth, y: cursor - lineIndex * lineHeight - 1 }, thickness: 0.45, color: runColor });
        runX += runWidth;
      });
    });
    cursor -= lines.length * lineHeight + (options?.gapAfter ?? 3);
  };

  await addPage();
  for (const line of wrap(input.title, bold, 22, WIDTH - MARGIN * 2)) {
    await ensureSpace(29);
    page!.drawText(line, { x: MARGIN, y: cursor, size: 22, font: bold, color: BLACK });
    cursor -= 28;
  }
  cursor -= 8;
  page!.drawText(`${safe(input.organizationName)}  /  ${input.createdAt.toLocaleDateString('en-GB', { dateStyle: 'medium', timeZone: 'UTC' })}`, {
    x: MARGIN,
    y: cursor,
    size: 8,
    font: bold,
    color: SILVER,
  });
  cursor -= 24;
  page!.drawRectangle({ x: MARGIN, y: cursor - 54, width: WIDTH - MARGIN * 2, height: 62, color: rgb(0.95, 0.955, 0.965) });
  page!.drawText('STRATEGY BRIEF', { x: MARGIN + 14, y: cursor - 10, size: 7.5, font: bold, color: SILVER });
  for (const [index, text] of wrap(`Goal: ${input.goal} | Timeline: ${input.timeline}`, font, 9, WIDTH - MARGIN * 2 - 28).slice(0, 3).entries()) {
    page!.drawText(text, { x: MARGIN + 14, y: cursor - 27 - index * 12, size: 9, font, color: BODY });
  }
  cursor -= 82;

  let skippedDuplicateTitle = false;
  for (const block of parseMarkdown(input.content)) {
    if (block.type === 'heading') {
      if (!skippedDuplicateTitle && block.level === 1 && stripInlineMarkdown(block.text).toLowerCase() === stripInlineMarkdown(input.title).toLowerCase()) {
        skippedDuplicateTitle = true;
        continue;
      }
      const size = block.level === 1 ? 16 : block.level === 2 ? 12.5 : 10.5;
      cursor -= block.level === 1 ? 4 : 1;
      await drawRichText(block.text, { size, font: bold, color: BLACK, lineHeight: size + 4, gapAfter: block.level === 1 ? 10 : 7 });
      continue;
    }
    if (block.type === 'paragraph') {
      await drawRichText(block.text, { gapAfter: 6 });
      continue;
    }
    if (block.type === 'hr') {
      await ensureSpace(18);
      page!.drawLine({ start: { x: MARGIN, y: cursor - 4 }, end: { x: WIDTH - MARGIN, y: cursor - 4 }, thickness: 0.6, color: LINE });
      cursor -= 18;
      continue;
    }
    if (block.type === 'blockquote') {
      const quoteLines = layoutRichText(block.text, fonts, 9, WIDTH - MARGIN * 2 - 20);
      await ensureSpace(quoteLines.length * 12 + 16);
      page!.drawRectangle({ x: MARGIN, y: cursor - quoteLines.length * 12 - 5, width: 3, height: quoteLines.length * 12 + 8, color: SILVER });
      await drawRichText(block.text, { x: MARGIN + 14, width: WIDTH - MARGIN * 2 - 20, size: 9, color: SILVER, gapAfter: 9 });
      continue;
    }
    if (block.type === 'code') {
      const codeLines = block.code.split('\n').flatMap((line) => wrapLiteral(line || ' ', mono, 7.6, WIDTH - MARGIN * 2 - 20));
      await ensureSpace(codeLines.length * 10 + 18);
      page!.drawRectangle({ x: MARGIN, y: cursor - codeLines.length * 10 - 8, width: WIDTH - MARGIN * 2, height: codeLines.length * 10 + 14, color: rgb(0.94, 0.945, 0.955), borderColor: LINE, borderWidth: 0.5 });
      codeLines.forEach((line, lineIndex) => page!.drawText(line, { x: MARGIN + 10, y: cursor - 8 - lineIndex * 10, size: 7.6, font: mono, color: BODY }));
      cursor -= codeLines.length * 10 + 18;
      continue;
    }
    if (block.type === 'list') {
      for (const item of block.items) {
        const marker = item.checked !== undefined ? (item.checked ? '[x]' : '[ ]') : block.ordered ? `${item.ordinal || 1}.` : '-';
        const x = MARGIN + 15 + item.depth * 12;
        await ensureSpace(18);
        page!.drawText(marker, { x: MARGIN + item.depth * 12, y: cursor, size: 8, font: bold, color: SILVER });
        await drawRichText(item.text, { x, width: WIDTH - MARGIN - x, size: 9, gapAfter: 3 });
      }
      cursor -= 3;
      continue;
    }
    if (block.type === 'table') {
      const tableWidth = WIDTH - MARGIN * 2;
      const columnWidth = tableWidth / Math.max(block.headers.length, 1);
      const tableRows = [block.headers, ...block.rows];
      for (const [rowIndex, row] of tableRows.entries()) {
        const cellFonts = row.map((cell) => rowIndex === 0 || /^(?:\*\*|__).+(?:\*\*|__)$/.test(cell.trim()) ? bold : font);
        const cellLines = row.map((cell, cellIndex) => wrap(cell, cellFonts[cellIndex], 7, columnWidth - 12));
        const rowHeight = Math.max(24, Math.max(...cellLines.map((lines) => lines.length)) * 9 + 10);
        await ensureSpace(rowHeight + 3);
        page!.drawRectangle({ x: MARGIN, y: cursor - rowHeight + 5, width: tableWidth, height: rowHeight, color: rowIndex === 0 ? BLACK : rowIndex % 2 ? rgb(0.96, 0.965, 0.973) : WHITE, borderColor: LINE, borderWidth: 0.45 });
        cellLines.forEach((lines, cellIndex) => lines.forEach((line, lineIndex) => page!.drawText(line, { x: MARGIN + cellIndex * columnWidth + 6, y: cursor - 8 - lineIndex * 9, size: 7, font: cellFonts[cellIndex], color: rowIndex === 0 ? WHITE : BODY })));
        cursor -= rowHeight;
      }
      cursor -= 8;
    }
  }

  for (const [index, item] of document.getPages().entries()) {
    item.drawLine({ start: { x: MARGIN, y: 42 }, end: { x: WIDTH - MARGIN, y: 42 }, thickness: 0.6, color: rgb(0.84, 0.85, 0.87) });
    item.drawText(`Prepared by ${safe(input.createdBy)} in IrisOS`, { x: MARGIN, y: 27, size: 7, font, color: SILVER });
    const label = `${index + 1} / ${document.getPageCount()}`;
    item.drawText(label, { x: WIDTH - MARGIN - font.widthOfTextAtSize(label, 7), y: 27, size: 7, font, color: SILVER });
  }
  return Buffer.from(await document.save({ useObjectStreams: false }));
}
