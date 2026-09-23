import { PDFDocument, StandardFonts, rgb, type PDFImage, type PDFFont, type PDFPage, type RGB } from 'pdf-lib';
import type { AtlasReportDocument, ReportMetric, ReportSection } from './types';
import { markdownToPlainText, parseMarkdown, parseMarkdownInline, type MarkdownInlineToken } from '@/lib/markdown';

const WIDTH = 595.28;
const HEIGHT = 841.89;
const MARGIN = 44;
const WHITE = rgb(1, 1, 1);
const INK = rgb(0.055, 0.063, 0.08);
const MUTED = rgb(0.38, 0.41, 0.47);
const LINE = rgb(0.88, 0.89, 0.91);
const PALE = rgb(0.965, 0.968, 0.974);

type Brand = { name: string; color: string; logoDataUrl?: string | null };

function safe(value: unknown) {
  return markdownToPlainText(String(value ?? '')).normalize('NFKD').replace(/[^ -~]/g, '').trim();
}

function ascii(value: unknown) {
  return String(value ?? '').normalize('NFKD').replace(/[^ -~]/g, '');
}

function color(hex: string): RGB {
  const match = hex.match(/^#([0-9a-f]{6})$/i);
  if (!match) return INK;
  const number = Number.parseInt(match[1], 16);
  return rgb(((number >> 16) & 255) / 255, ((number >> 8) & 255) / 255, (number & 255) / 255);
}

function textOn(hex: string) {
  const match = hex.match(/^#([0-9a-f]{6})$/i);
  if (!match) return WHITE;
  const value = Number.parseInt(match[1], 16);
  const luminance = (0.2126 * ((value >> 16) & 255) + 0.7152 * ((value >> 8) & 255) + 0.0722 * (value & 255)) / 255;
  return luminance > 0.64 ? INK : WHITE;
}

function wrap(value: unknown, font: PDFFont, size: number, maxWidth: number) {
  const words = safe(value).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) current = candidate;
    else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [''];
}

function fit(value: unknown, font: PDFFont, size: number, maxWidth: number) {
  let output = safe(value);
  if (font.widthOfTextAtSize(output, size) <= maxWidth) return output;
  while (output.length > 2 && font.widthOfTextAtSize(`${output}...`, size) > maxWidth) output = output.slice(0, -1);
  return `${output}...`;
}

function fitLiteral(value: unknown, font: PDFFont, size: number, maxWidth: number) {
  let output = ascii(value).trim();
  if (font.widthOfTextAtSize(output, size) <= maxWidth) return output;
  while (output.length > 2 && font.widthOfTextAtSize(`${output}...`, size) > maxWidth) output = output.slice(0, -1);
  return `${output}...`;
}

type ReportFonts = { regular: PDFFont; bold: PDFFont; italic: PDFFont; boldItalic: PDFFont; mono: PDFFont };
type RichRun = { text: string; font: PDFFont; strike?: boolean; link?: boolean };

function reportFontFor(token: MarkdownInlineToken, fonts: ReportFonts, defaultFont: PDFFont) {
  if (token.type === 'bold') return fonts.bold;
  if (token.type === 'italic') return fonts.italic;
  if (token.type === 'boldItalic') return fonts.boldItalic;
  if (token.type === 'code') return fonts.mono;
  return defaultFont;
}

function layoutRich(value: string, fonts: ReportFonts, size: number, maxWidth: number, defaultFont = fonts.regular) {
  const lines: RichRun[][] = [[]];
  let width = 0;
  for (const token of parseMarkdownInline(value)) {
    const font = reportFontFor(token, fonts, defaultFont);
    for (const rawChunk of ascii(token.text).split(/(\s+)/).filter(Boolean)) {
      const chunk = /^\s+$/.test(rawChunk) ? ' ' : rawChunk;
      if (chunk === ' ' && width === 0) continue;
      const chunkWidth = font.widthOfTextAtSize(chunk, size);
      if (width > 0 && width + chunkWidth > maxWidth) {
        lines.push([]);
        width = 0;
        if (chunk === ' ') continue;
      }
      lines[lines.length - 1].push({ text: chunk, font, strike: token.type === 'strike', link: token.type === 'link' });
      width += chunkWidth;
    }
  }
  return lines.filter((line) => line.length);
}

function drawRichLines(page: PDFPage, lines: RichRun[][], options: { x: number; y: number; size: number; lineHeight: number; color: RGB; linkColor: RGB }) {
  lines.forEach((line, lineIndex) => {
    let x = options.x;
    const y = options.y - lineIndex * options.lineHeight;
    line.forEach((run) => {
      const runColor = run.link ? options.linkColor : options.color;
      page.drawText(run.text, { x, y, size: options.size, font: run.font, color: runColor });
      const width = run.font.widthOfTextAtSize(run.text, options.size);
      if (run.strike) page.drawLine({ start: { x, y: y + options.size * 0.36 }, end: { x: x + width, y: y + options.size * 0.36 }, thickness: 0.55, color: runColor });
      if (run.link) page.drawLine({ start: { x, y: y - 1 }, end: { x: x + width, y: y - 1 }, thickness: 0.4, color: runColor });
      x += width;
    });
  });
}

function drawMarkdownNarrative(page: PDFPage, value: string, fonts: ReportFonts, accent: RGB, startY: number, minY: number) {
  let y = startY;
  const rich = (text: string, size: number, defaultFont: PDFFont, x = MARGIN, maxWidth = WIDTH - MARGIN * 2, colorValue = INK) => {
    const lines = layoutRich(text, fonts, size, maxWidth, defaultFont);
    const lineHeight = size + 4;
    const available = Math.max(0, Math.floor((y - minY) / lineHeight));
    const visible = lines.slice(0, available);
    drawRichLines(page, visible, { x, y, size, lineHeight, color: colorValue, linkColor: accent });
    y -= visible.length * lineHeight + 5;
    return visible.length === lines.length;
  };

  for (const block of parseMarkdown(value)) {
    if (y <= minY) break;
    if (block.type === 'heading') {
      if (!rich(block.text, block.level === 1 ? 12 : 10, fonts.bold)) break;
    } else if (block.type === 'paragraph') {
      if (!rich(block.text, 9, fonts.regular)) break;
    } else if (block.type === 'blockquote') {
      page.drawRectangle({ x: MARGIN, y: y - 20, width: 3, height: 24, color: accent });
      if (!rich(block.text, 8.5, fonts.italic, MARGIN + 12, WIDTH - MARGIN * 2 - 12, MUTED)) break;
    } else if (block.type === 'hr') {
      page.drawLine({ start: { x: MARGIN, y }, end: { x: WIDTH - MARGIN, y }, thickness: 0.5, color: LINE });
      y -= 10;
    } else if (block.type === 'list') {
      for (const item of block.items) {
        if (y <= minY) break;
        const marker = item.checked !== undefined ? (item.checked ? '[x]' : '[ ]') : block.ordered ? `${item.ordinal || 1}.` : '-';
        page.drawText(marker, { x: MARGIN + item.depth * 10, y, size: 8, font: fonts.bold, color: accent });
        if (!rich(item.text, 8.5, fonts.regular, MARGIN + 15 + item.depth * 10, WIDTH - MARGIN * 2 - 15 - item.depth * 10)) break;
      }
    } else if (block.type === 'code') {
      const codeLines = block.code.split('\n').slice(0, Math.max(0, Math.floor((y - minY) / 10)));
      const height = codeLines.length * 10 + 10;
      page.drawRectangle({ x: MARGIN, y: y - height + 5, width: WIDTH - MARGIN * 2, height, color: PALE, borderColor: LINE, borderWidth: 0.4 });
      codeLines.forEach((line, index) => page.drawText(fitLiteral(line, fonts.mono, 7, WIDTH - MARGIN * 2 - 12), { x: MARGIN + 6, y: y - 7 - index * 10, size: 7, font: fonts.mono, color: INK }));
      y -= height + 5;
    } else if (block.type === 'table') {
      const columns = Math.max(block.headers.length, 1);
      const tableWidth = WIDTH - MARGIN * 2;
      const columnWidth = tableWidth / columns;
      for (const [rowIndex, row] of [block.headers, ...block.rows].entries()) {
        if (y - 20 < minY) break;
        page.drawRectangle({ x: MARGIN, y: y - 17, width: tableWidth, height: 20, color: rowIndex === 0 ? accent : rowIndex % 2 ? PALE : WHITE, borderColor: LINE, borderWidth: 0.35 });
        row.forEach((cell, columnIndex) => {
          const cellFont = rowIndex === 0 || /^(?:\*\*|__).+(?:\*\*|__)$/.test(cell.trim()) ? fonts.bold : fonts.regular;
          page.drawText(fit(cell, cellFont, 6.5, columnWidth - 10), { x: MARGIN + columnIndex * columnWidth + 5, y: y - 9, size: 6.5, font: cellFont, color: rowIndex === 0 ? WHITE : INK });
        });
        y -= 20;
      }
      y -= 5;
    }
  }
}

async function embedLogo(document: PDFDocument, dataUrl?: string | null): Promise<PDFImage | null> {
  const match = String(dataUrl || '').match(/^data:(image\/(?:png|jpeg));base64,(.+)$/);
  if (!match) return null;
  try {
    const bytes = Uint8Array.from(Buffer.from(match[2], 'base64'));
    return match[1] === 'image/png' ? document.embedPng(bytes) : document.embedJpg(bytes);
  } catch {
    return null;
  }
}

function drawFooter(page: PDFPage, font: PDFFont, pageNumber: number, total: number, brandName: string) {
  page.drawLine({ start: { x: MARGIN, y: 45 }, end: { x: WIDTH - MARGIN, y: 45 }, thickness: 0.6, color: LINE });
  page.drawText(`Confidential - ${safe(brandName)} - Generated by Miles Reports`, { x: MARGIN, y: 28, size: 7.2, font, color: MUTED });
  const label = `${pageNumber} / ${total}`;
  page.drawText(label, { x: WIDTH - MARGIN - font.widthOfTextAtSize(label, 7.2), y: 28, size: 7.2, font, color: MUTED });
}

function drawPageHeader(page: PDFPage, bold: PDFFont, font: PDFFont, brand: Brand, accent: RGB, accentText: RGB, pageTitle: string, pageNumber: number) {
  page.drawRectangle({ x: 0, y: HEIGHT - 58, width: WIDTH, height: 58, color: accent });
  page.drawText(fit(brand.name, bold, 10, 210), { x: MARGIN, y: HEIGHT - 34, size: 10, font: bold, color: accentText });
  const label = safe(pageTitle).toUpperCase();
  page.drawText(fit(label, bold, 8, 260), { x: WIDTH - MARGIN - bold.widthOfTextAtSize(fit(label, bold, 8, 260), 8), y: HEIGHT - 34, size: 8, font: bold, color: accentText });
  page.drawText(`SECTION 0${pageNumber}`, { x: MARGIN, y: HEIGHT - 82, size: 7.5, font: bold, color: MUTED });
}

function drawMetrics(page: PDFPage, metrics: ReportMetric[], font: PDFFont, bold: PDFFont, startY: number, accent: RGB) {
  const items = metrics.slice(0, 5);
  const gap = 8;
  const cardWidth = (WIDTH - MARGIN * 2 - gap * (items.length - 1)) / items.length;
  items.forEach((metric, index) => {
    const x = MARGIN + index * (cardWidth + gap);
    page.drawRectangle({ x, y: startY - 74, width: cardWidth, height: 74, color: PALE, borderColor: LINE, borderWidth: 0.6 });
    page.drawRectangle({ x, y: startY - 4, width: cardWidth, height: 4, color: accent });
    page.drawText(fit(metric.label.toUpperCase(), bold, 6.7, cardWidth - 16), { x: x + 8, y: startY - 22, size: 6.7, font: bold, color: MUTED });
    page.drawText(fit(metric.value, bold, 13, cardWidth - 16), { x: x + 8, y: startY - 43, size: 13, font: bold, color: INK });
    page.drawText(fit(metric.detail || '', font, 6.8, cardWidth - 16), { x: x + 8, y: startY - 61, size: 6.8, font, color: MUTED });
  });
}

function drawTable(page: PDFPage, section: ReportSection, font: PDFFont, bold: PDFFont, accent: RGB, accentText: RGB, top: number) {
  page.drawText(safe(section.title), { x: MARGIN, y: top, size: 17, font: bold, color: INK });
  page.drawText(fit(section.description, font, 8.2, WIDTH - MARGIN * 2), { x: MARGIN, y: top - 18, size: 8.2, font, color: MUTED });
  const tableTop = top - 48;
  const width = WIDTH - MARGIN * 2;
  const columnWidth = width / section.columns.length;
  page.drawRectangle({ x: MARGIN, y: tableTop - 25, width, height: 25, color: accent });
  section.columns.forEach((heading, index) => page.drawText(fit(heading.toUpperCase(), bold, 6.5, columnWidth - 12), { x: MARGIN + index * columnWidth + 6, y: tableTop - 16, size: 6.5, font: bold, color: accentText }));
  const rows = section.rows.slice(0, 22);
  rows.forEach((row, rowIndex) => {
    const y = tableTop - 25 - (rowIndex + 1) * 25;
    page.drawRectangle({ x: MARGIN, y, width, height: 25, color: rowIndex % 2 ? PALE : WHITE, borderColor: LINE, borderWidth: 0.35 });
    section.columns.forEach((_, columnIndex) => {
      page.drawText(fit(row[columnIndex] || '', columnIndex === 0 ? bold : font, 7.1, columnWidth - 12), { x: MARGIN + columnIndex * columnWidth + 6, y: y + 9, size: 7.1, font: columnIndex === 0 ? bold : font, color: columnIndex === 0 ? INK : MUTED });
    });
  });
  if (!rows.length) page.drawText('No records were available for this section.', { x: MARGIN + 8, y: tableTop - 50, size: 8, font, color: MUTED });
}

export async function generateAtlasReportPdf(documentData: AtlasReportDocument, brand: Brand) {
  const document = await PDFDocument.create();
  document.setTitle(documentData.title);
  document.setAuthor(brand.name);
  document.setSubject(`${documentData.kind} report generated by Miles Reports`);
  document.setCreator('IrisOS Miles Reports');
  document.setProducer('IrisOS');
  const font = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const italic = await document.embedFont(StandardFonts.HelveticaOblique);
  const boldItalic = await document.embedFont(StandardFonts.HelveticaBoldOblique);
  const mono = await document.embedFont(StandardFonts.Courier);
  const fonts: ReportFonts = { regular: font, bold, italic, boldItalic, mono };
  const accent = color(brand.color);
  const accentText = textOn(brand.color);
  const logo = await embedLogo(document, brand.logoDataUrl);

  const cover = document.addPage([WIDTH, HEIGHT]);
  cover.drawRectangle({ x: 0, y: 0, width: WIDTH, height: HEIGHT, color: WHITE });
  cover.drawRectangle({ x: 0, y: HEIGHT - 245, width: WIDTH, height: 245, color: accent });
  cover.drawRectangle({ x: MARGIN, y: HEIGHT - 259, width: 92, height: 5, color: accent });
  if (logo) {
    const scaled = logo.scaleToFit(100, 44);
    cover.drawImage(logo, { x: MARGIN, y: HEIGHT - 82, width: scaled.width, height: scaled.height });
  } else {
    cover.drawText(fit(brand.name, bold, 14, 250), { x: MARGIN, y: HEIGHT - 72, size: 14, font: bold, color: accentText });
  }
  cover.drawText('MILES REPORTS', { x: MARGIN, y: HEIGHT - 125, size: 8, font: bold, color: accentText });
  wrap(documentData.title, bold, 28, WIDTH - MARGIN * 2).slice(0, 2).forEach((line, index) => cover.drawText(line, { x: MARGIN, y: HEIGHT - 165 - index * 33, size: 28, font: bold, color: accentText }));
  cover.drawText(`${safe(documentData.periodLabel)}  |  ${new Date(documentData.generatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' })}`, { x: MARGIN, y: HEIGHT - 222, size: 8.5, font, color: accentText });
  drawMetrics(cover, documentData.metrics, font, bold, HEIGHT - 292, accent);
  cover.drawText('MILES EXECUTIVE ANALYSIS', { x: MARGIN, y: 438, size: 8, font: bold, color: MUTED });
  drawMarkdownNarrative(cover, documentData.atlasNarrative, fonts, accent, 414, 224);
  cover.drawText('KEY SIGNALS', { x: MARGIN, y: 195, size: 8, font: bold, color: MUTED });
  documentData.highlights.slice(0, 3).forEach((item, index) => {
    cover.drawRectangle({ x: MARGIN, y: 156 - index * 38, width: 4, height: 24, color: accent });
    cover.drawText(fit(item, font, 8.4, WIDTH - MARGIN * 2 - 20), { x: MARGIN + 13, y: 164 - index * 38, size: 8.4, font, color: INK });
  });
  drawFooter(cover, font, 1, 3, brand.name);

  const detailOne = document.addPage([WIDTH, HEIGHT]);
  detailOne.drawRectangle({ x: 0, y: 0, width: WIDTH, height: HEIGHT, color: WHITE });
  drawPageHeader(detailOne, bold, font, brand, accent, accentText, documentData.sections[0].title, 2);
  drawTable(detailOne, documentData.sections[0], font, bold, accent, accentText, 726);
  drawFooter(detailOne, font, 2, 3, brand.name);

  const detailTwo = document.addPage([WIDTH, HEIGHT]);
  detailTwo.drawRectangle({ x: 0, y: 0, width: WIDTH, height: HEIGHT, color: WHITE });
  drawPageHeader(detailTwo, bold, font, brand, accent, accentText, documentData.sections[1].title, 3);
  drawTable(detailTwo, { ...documentData.sections[1], rows: documentData.sections[1].rows.slice(0, 15) }, font, bold, accent, accentText, 726);
  detailTwo.drawText('MILES RECOMMENDED ACTIONS', { x: MARGIN, y: 248, size: 8, font: bold, color: MUTED });
  documentData.recommendations.slice(0, 3).forEach((item, index) => {
    const y = 218 - index * 42;
    detailTwo.drawRectangle({ x: MARGIN, y: y - 7, width: 22, height: 22, color: accent });
    detailTwo.drawText(String(index + 1), { x: MARGIN + 8, y, size: 8, font: bold, color: accentText });
    wrap(item.replace(/^\d+\.\s*/, ''), font, 8, WIDTH - MARGIN * 2 - 36).slice(0, 2).forEach((line, lineIndex) => detailTwo.drawText(line, { x: MARGIN + 32, y: y + 3 - lineIndex * 11, size: 8, font, color: INK }));
  });
  detailTwo.drawText('METHODOLOGY', { x: MARGIN, y: 83, size: 7, font: bold, color: MUTED });
  detailTwo.drawText(fit(documentData.methodology, font, 6.7, WIDTH - MARGIN * 2), { x: MARGIN, y: 68, size: 6.7, font, color: MUTED });
  drawFooter(detailTwo, font, 3, 3, brand.name);

  return Buffer.from(await document.save({ useObjectStreams: false }));
}
