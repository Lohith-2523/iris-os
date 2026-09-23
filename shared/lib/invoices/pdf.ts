import 'server-only';

import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from 'pdf-lib';
import type { InvoicePartySnapshot, InvoicePdfInput } from './types';

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 48;
const BLACK = rgb(0.035, 0.039, 0.047);
const SILVER = rgb(0.68, 0.7, 0.73);
const LIGHT = rgb(0.94, 0.945, 0.95);
const WHITE = rgb(1, 1, 1);

function colorFromHex(value: string | undefined) {
  const match = String(value || '').match(/^#([0-9A-Fa-f]{6})$/);
  if (!match) return BLACK;
  const number = Number.parseInt(match[1], 16);
  return rgb(
    ((number >> 16) & 255) / 255,
    ((number >> 8) & 255) / 255,
    (number & 255) / 255,
  );
}

function contrastingText(value: string | undefined) {
  const match = String(value || '').match(/^#([0-9A-Fa-f]{6})$/);
  if (!match) return WHITE;
  const number = Number.parseInt(match[1], 16);
  const red = (number >> 16) & 255;
  const green = (number >> 8) & 255;
  const blue = number & 255;
  const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
  return luminance > 0.62 ? BLACK : WHITE;
}

function logoBytes(dataUrl: string | undefined) {
  const match = String(dataUrl || '').match(/^data:(image\/(?:png|jpeg));base64,(.+)$/);
  if (!match) return null;
  return { mimeType: match[1], bytes: Uint8Array.from(Buffer.from(match[2], 'base64')) };
}

function safeText(value: unknown) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[^\x20-\x7E]/g, '')
    .trim();
}

function formatMoney(value: number, currency: string) {
  return `${safeText(currency)} ${value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value?: Date | null) {
  if (!value) return 'Not specified';
  return value.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const words = safeText(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      line = candidate;
    } else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

function drawParty(
  page: PDFPage,
  party: InvoicePartySnapshot,
  x: number,
  y: number,
  width: number,
  font: PDFFont,
  bold: PDFFont,
) {
  page.drawText(safeText(party.legalEntityName), {
    x,
    y,
    size: 11,
    font: bold,
    color: BLACK,
  });
  const address = [
    party.addressLine1,
    party.addressLine2,
    [party.city, party.state, party.postalCode].filter(Boolean).join(', '),
    party.country,
    party.email,
    party.phone || '',
    party.gstNumber ? `GSTIN: ${party.gstNumber}` : '',
  ].filter(Boolean);
  let cursor = y - 17;
  for (const item of address) {
    for (const line of wrapText(item, font, 8.5, width)) {
      page.drawText(line, { x, y: cursor, size: 8.5, font, color: rgb(0.32, 0.34, 0.38) });
      cursor -= 12;
    }
  }
}

export async function generateInvoicePdf(input: InvoicePdfInput) {
  const isProforma = input.documentType === 'PROFORMA';
  const isTaxInvoice = !isProforma;
  const documentLabel = isProforma ? 'PROFORMA INVOICE' : 'TAX INVOICE';
  const metadataLabel = isProforma ? 'Proforma Invoice' : 'Tax Invoice';
  const document = await PDFDocument.create();
  document.setTitle(`${metadataLabel} ${safeText(input.invoiceNumber)}`);
  document.setAuthor('IrisOS');
  document.setSubject(`${metadataLabel} for ${safeText(input.projectName)}`);
  document.setCreator('IrisOS Invoice Engine');
  document.setProducer('IrisOS');
  const page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const font = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const brand = colorFromHex(input.seller.brandColor);
  const brandText = contrastingText(input.seller.brandColor);

  // Draw an explicit opaque page background. PDF pages are implicitly white,
  // but some browser and OS previewers render transparent pages incorrectly.
  page.drawRectangle({ x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT, color: WHITE });
  page.drawRectangle({ x: 0, y: PAGE_HEIGHT - 112, width: PAGE_WIDTH, height: 112, color: brand });
  let companyNameX = MARGIN;
  try {
    const source = logoBytes(input.seller.logoDataUrl);
    if (!source) throw new Error('No agency logo');
    const logo = source.mimeType === 'image/png'
      ? await document.embedPng(source.bytes)
      : await document.embedJpg(source.bytes);
    const scaled = logo.scaleToFit(72, 42);
    page.drawImage(logo, {
      x: MARGIN,
      y: PAGE_HEIGHT - 78,
      width: scaled.width,
      height: scaled.height,
    });
    companyNameX += scaled.width + 14;
  } catch {}
  const companyName = input.seller.displayName || input.seller.legalEntityName || input.seller.name;
  wrapText(companyName, bold, 13.5, 245 - (companyNameX - MARGIN)).slice(0, 2).forEach((line, index) => {
    page.drawText(line, {
      x: companyNameX,
      y: PAGE_HEIGHT - 57 - index * 16,
      size: 13.5,
      font: bold,
      color: brandText,
    });
  });
  page.drawText(documentLabel, {
    x: PAGE_WIDTH - MARGIN - bold.widthOfTextAtSize(documentLabel, isProforma ? 20 : isTaxInvoice ? 23 : 27),
    y: PAGE_HEIGHT - 64,
    size: isProforma ? 20 : isTaxInvoice ? 23 : 27,
    font: bold,
    color: brandText,
  });
  page.drawText(safeText(input.invoiceNumber), {
    x: PAGE_WIDTH - MARGIN - 116,
    y: PAGE_HEIGHT - 84,
    size: 9,
    font,
    color: brandText,
  });

  page.drawText('FROM', { x: MARGIN, y: 699, size: 8, font: bold, color: SILVER });
  drawParty(page, input.seller, MARGIN, 681, 218, font, bold);

  page.drawRectangle({ x: 350, y: 633, width: 197, height: 78, color: LIGHT });
  const meta = [
    ['ISSUED', formatDate(input.issuedDate)],
    [isProforma ? 'VALID UNTIL' : 'DUE', formatDate(input.dueDate)],
    ['TYPE', isProforma ? 'PROFORMA' : 'TAX'],
  ];
  meta.forEach(([label, value], index) => {
    const y = 690 - index * 22;
    page.drawText(label, { x: 365, y, size: 7.5, font: bold, color: rgb(0.42, 0.44, 0.48) });
    const valueWidth = bold.widthOfTextAtSize(value, 8.5);
    page.drawText(value, { x: 531 - valueWidth, y, size: 8.5, font: bold, color: BLACK });
  });

  page.drawLine({ start: { x: MARGIN, y: 606 }, end: { x: PAGE_WIDTH - MARGIN, y: 606 }, thickness: 1, color: rgb(0.82, 0.83, 0.85) });
  page.drawText('BILL TO', { x: MARGIN, y: 584, size: 8, font: bold, color: SILVER });
  drawParty(page, input.buyer, MARGIN, 566, 260, font, bold);
  page.drawText(isProforma ? 'REFERENCE' : 'PROJECT', { x: 350, y: 584, size: 8, font: bold, color: SILVER });
  wrapText(input.projectName, bold, 11, 197).slice(0, 2).forEach((line, index) => {
    page.drawText(line, { x: 350, y: 566 - index * 14, size: 11, font: bold, color: BLACK });
  });
  wrapText(input.description, font, 8.5, 197).slice(0, 3).forEach((line, index) => {
    page.drawText(line, { x: 350, y: 530 - index * 12, size: 8.5, font, color: rgb(0.36, 0.38, 0.42) });
  });

  const tableTop = 468;
  page.drawRectangle({ x: MARGIN, y: tableTop, width: PAGE_WIDTH - MARGIN * 2, height: 30, color: brand });
  page.drawText('DESCRIPTION', { x: MARGIN + 12, y: tableTop + 10, size: 8, font: bold, color: brandText });
  page.drawText('QTY', { x: 365, y: tableTop + 10, size: 8, font: bold, color: brandText });
  page.drawText('RATE', { x: 411, y: tableTop + 10, size: 8, font: bold, color: brandText });
  page.drawText('AMOUNT', { x: 486, y: tableTop + 10, size: 8, font: bold, color: brandText });

  let rowY = tableTop - 31;
  for (const [itemIndex, item] of input.lineItems.slice(0, 8).entries()) {
    const lines = wrapText(item.description, font, 9, 278).slice(0, 2);
    const rowHeight = Math.max(35, lines.length * 13 + 14);
    page.drawRectangle({
      x: MARGIN,
      y: rowY - rowHeight + 12,
      width: PAGE_WIDTH - MARGIN * 2,
      height: rowHeight,
      color: itemIndex % 2 === 0 ? WHITE : rgb(0.975, 0.977, 0.98),
      borderColor: rgb(0.88, 0.89, 0.9),
      borderWidth: 0.5,
    });
    lines.forEach((line, index) => page.drawText(line, {
      x: MARGIN + 12,
      y: rowY - index * 13,
      size: 9,
      font,
      color: BLACK,
    }));
    page.drawText(String(item.quantity), { x: 368, y: rowY, size: 8.5, font, color: BLACK });
    page.drawText(formatMoney(item.unitPrice, input.currency), { x: 411, y: rowY, size: 7.5, font, color: BLACK });
    page.drawText(formatMoney(item.amount, input.currency), { x: 480, y: rowY, size: 7.5, font: bold, color: BLACK });
    rowY -= rowHeight;
  }

  const totalsX = 350;
  const totalsY = Math.max(160, rowY - 24);
  const totals = [
    ['Subtotal', formatMoney(input.subtotal, input.currency)],
    ...(input.taxAmount > 0
      ? [[`Tax (${input.taxRate.toFixed(2)}%)`, formatMoney(input.taxAmount, input.currency)]]
      : []),
    ['Paid', formatMoney(input.paidAmount, input.currency)],
  ];
  totals.forEach(([label, value], index) => {
    const y = totalsY - index * 22;
    page.drawText(label, { x: totalsX, y, size: 9, font, color: rgb(0.35, 0.37, 0.41) });
    page.drawText(value, {
      x: PAGE_WIDTH - MARGIN - bold.widthOfTextAtSize(value, 9),
      y,
      size: 9,
      font: bold,
      color: BLACK,
    });
  });
  const balanceBoxY = totalsY - totals.length * 22 - 24;
  page.drawRectangle({ x: totalsX, y: balanceBoxY, width: 197, height: 38, color: brand });
  page.drawText(isProforma ? 'ESTIMATED TOTAL' : 'BALANCE DUE', { x: totalsX + 12, y: balanceBoxY + 14, size: 8.5, font: bold, color: brandText });
  const balance = formatMoney(isProforma ? input.total : Math.max(0, input.total - input.paidAmount), input.currency);
  page.drawText(balance, {
    x: PAGE_WIDTH - MARGIN - 12 - bold.widthOfTextAtSize(balance, 11),
    y: balanceBoxY + 12,
    size: 11,
    font: bold,
    color: brandText,
  });

  page.drawText(input.termsOfSale ? 'Terms and Conditions' : (isProforma ? 'Validity' : 'Payment terms'), {
    x: MARGIN, y: 116, size: 8, font: bold, color: BLACK,
  });
  const terms = input.termsOfSale
    || (isProforma
      ? (input.dueDate
        ? `This proforma invoice is valid until ${formatDate(input.dueDate)} and is not a demand for payment.`
        : 'This proforma invoice is not a demand for payment.')
      : `Payment is due by ${formatDate(input.dueDate)}. Reference ${safeText(input.invoiceNumber)} when paying.`);
  wrapText(terms, font, 8.5, PAGE_WIDTH - MARGIN * 2).slice(0, 3).forEach((line, index) => {
    page.drawText(line, {
      x: MARGIN,
      y: 100 - index * 11,
      size: 8.5,
      font,
      color: rgb(0.38, 0.4, 0.44),
    });
  });
  page.drawLine({ start: { x: MARGIN, y: 76 }, end: { x: PAGE_WIDTH - MARGIN, y: 76 }, thickness: 0.7, color: rgb(0.82, 0.83, 0.85) });
  page.drawText('Generated securely by IrisOS', { x: MARGIN, y: 56, size: 7.5, font, color: rgb(0.5, 0.52, 0.56) });
  const pageNumber = 'Page 1 of 1';
  page.drawText(pageNumber, {
    x: PAGE_WIDTH - MARGIN - font.widthOfTextAtSize(pageNumber, 7.5),
    y: 56,
    size: 7.5,
    font,
    color: rgb(0.5, 0.52, 0.56),
  });

  return Buffer.from(await document.save({ useObjectStreams: false }));
}
