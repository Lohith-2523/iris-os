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

const WIDTH = 595.28;
const HEIGHT = 841.89;
const MARGIN = 48;
const BLACK = rgb(0.035, 0.039, 0.047);
const SILVER = rgb(0.63, 0.65, 0.69);
const WHITE = rgb(1, 1, 1);
const BODY = rgb(0.18, 0.2, 0.23);

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
  return safe(value)
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1');
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

export async function generateStrategyPdf(input: StrategyPdfInput) {
  const document = await PDFDocument.create();
  document.setTitle(safe(input.title));
  document.setAuthor('Iris OS');
  document.setSubject(`${safe(input.type)} strategy`);
  document.setCreator('Iris OS Strategy Studio');
  const font = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  let page: PDFPage;
  let cursor = 0;
  let pageNumber = 0;

  const addPage = async () => {
    page = document.addPage([WIDTH, HEIGHT]);
    pageNumber += 1;
    page.drawRectangle({ x: 0, y: 0, width: WIDTH, height: HEIGHT, color: WHITE });
    page.drawRectangle({ x: 0, y: HEIGHT - 92, width: WIDTH, height: 92, color: BLACK });
    try {
      const bytes = await readFile(path.join(process.cwd(), 'public', 'iris-logo-white-transparent.png'));
      const logo = await document.embedPng(Uint8Array.from(bytes));
      const scaled = logo.scaleToFit(92, 34);
      page.drawImage(logo, { x: MARGIN, y: HEIGHT - 64, width: scaled.width, height: scaled.height });
    } catch {
      page.drawText('IRIS OS', { x: MARGIN, y: HEIGHT - 55, size: 15, font: bold, color: WHITE });
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
  for (const rawLine of input.content.split('\n')) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed === '---') {
      cursor -= 7;
      continue;
    }
    const heading = trimmed.match(/^(#{1,3})\s+(.*)$/);
    if (
      !skippedDuplicateTitle
      && heading?.[1] === '#'
      && stripInlineMarkdown(heading[2]).toLowerCase() === stripInlineMarkdown(input.title).toLowerCase()
    ) {
      skippedDuplicateTitle = true;
      continue;
    }
    const bullet = trimmed.match(/^[-*+]\s+(.*)$/);
    const numbered = trimmed.match(/^(\d+)\.\s+(.*)$/);
    const text = heading?.[2] || bullet?.[1] || numbered?.[2] || trimmed;
    const size = heading ? (heading[1].length === 1 ? 16 : heading[1].length === 2 ? 12.5 : 10.5) : 9;
    const lineFont = heading ? bold : font;
    const x = MARGIN + (bullet || numbered ? 12 : 0);
    const maxWidth = WIDTH - MARGIN - x;
    const lines = wrap(text, lineFont, size, maxWidth);
    const blockHeight = Math.max(size + 8, lines.length * (size + 3) + (heading ? 8 : 3));
    await ensureSpace(blockHeight);
    if (bullet) page!.drawText('-', { x: MARGIN, y: cursor, size: 9, font: bold, color: SILVER });
    if (numbered) page!.drawText(`${numbered[1]}.`, { x: MARGIN, y: cursor, size: 9, font: bold, color: SILVER });
    lines.forEach((wrappedLine, index) => page!.drawText(wrappedLine, {
      x,
      y: cursor - index * (size + 3),
      size,
      font: lineFont,
      color: heading ? BLACK : BODY,
    }));
    cursor -= blockHeight;
  }

  for (const [index, item] of document.getPages().entries()) {
    item.drawLine({ start: { x: MARGIN, y: 42 }, end: { x: WIDTH - MARGIN, y: 42 }, thickness: 0.6, color: rgb(0.84, 0.85, 0.87) });
    item.drawText(`Prepared by ${safe(input.createdBy)} in Iris OS`, { x: MARGIN, y: 27, size: 7, font, color: SILVER });
    const label = `${index + 1} / ${document.getPageCount()}`;
    item.drawText(label, { x: WIDTH - MARGIN - font.widthOfTextAtSize(label, 7), y: 27, size: 7, font, color: SILVER });
  }
  return Buffer.from(await document.save({ useObjectStreams: false }));
}
