import 'server-only';

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type RGB } from 'pdf-lib';
import type { ProposalInput } from './types';

const WIDTH = 595.28;
const HEIGHT = 841.89;
const MARGIN = 46;
const CONTENT_WIDTH = WIDTH - MARGIN * 2;
const WHITE = rgb(1, 1, 1);
const INK = rgb(0.055, 0.063, 0.08);
const MUTED = rgb(0.39, 0.42, 0.48);
const LINE = rgb(0.86, 0.87, 0.89);
const PALE = rgb(0.965, 0.97, 0.976);

type Fonts = { regular: PDFFont; bold: PDFFont; italic: PDFFont };

function safe(value: unknown) {
  return String(value ?? '').normalize('NFKD').replace(/[^\x20-\x7E\n]/g, '').trim();
}

function brandColor(value: string): RGB {
  const number = Number.parseInt(value.slice(1), 16);
  return rgb(((number >> 16) & 255) / 255, ((number >> 8) & 255) / 255, (number & 255) / 255);
}

function textOn(value: string) {
  const number = Number.parseInt(value.slice(1), 16);
  const luminance = (0.2126 * ((number >> 16) & 255) + 0.7152 * ((number >> 8) & 255) + 0.0722 * (number & 255)) / 255;
  return luminance > 0.62 ? INK : WHITE;
}

function wrap(text: unknown, font: PDFFont, size: number, maxWidth: number) {
  const paragraphs = safe(text).split(/\n+/);
  const lines: string[] = [];
  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean);
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
    lines.push('');
  }
  if (lines.at(-1) === '') lines.pop();
  return lines.length ? lines : [''];
}

function money(value: number, currency: string) {
  return `${safe(currency)} ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export async function generateProposalPdf(input: ProposalInput) {
  const document = await PDFDocument.create();
  const fonts: Fonts = {
    regular: await document.embedFont(StandardFonts.Helvetica),
    bold: await document.embedFont(StandardFonts.HelveticaBold),
    italic: await document.embedFont(StandardFonts.HelveticaOblique),
  };
  const accent = brandColor(input.brandColor);
  const accentText = textOn(input.brandColor);
  document.setTitle(input.title);
  document.setAuthor(input.agencyName);
  document.setSubject(`Business proposal for ${input.clientCompany}`);
  document.setCreator('IrisOS Proposal Studio');
  document.setProducer('IrisOS');

  let page!: PDFPage;
  let y = 0;
  let sectionLabel = 'PROPOSAL';

  const addContentPage = (label = sectionLabel) => {
    sectionLabel = label;
    page = document.addPage([WIDTH, HEIGHT]);
    page.drawRectangle({ x: 0, y: 0, width: WIDTH, height: HEIGHT, color: WHITE });
    page.drawRectangle({ x: 0, y: HEIGHT - 58, width: WIDTH, height: 58, color: accent });
    page.drawText(safe(input.agencyName), { x: MARGIN, y: HEIGHT - 35, size: 10, font: fonts.bold, color: accentText });
    const right = safe(label).toUpperCase();
    page.drawText(right, { x: WIDTH - MARGIN - fonts.bold.widthOfTextAtSize(right, 8), y: HEIGHT - 34, size: 8, font: fonts.bold, color: accentText });
    y = HEIGHT - 90;
    return page;
  };

  const ensure = (height: number) => {
    if (y - height < 72) addContentPage(`${sectionLabel} - CONTINUED`);
  };

  const heading = (title: string) => {
    ensure(36);
    page.drawText(safe(title).toUpperCase(), { x: MARGIN, y, size: 8, font: fonts.bold, color: accent });
    page.drawLine({ start: { x: MARGIN, y: y - 8 }, end: { x: WIDTH - MARGIN, y: y - 8 }, thickness: 0.7, color: LINE });
    y -= 28;
  };

  const paragraph = (value: string, options?: { italic?: boolean; bullets?: boolean }) => {
    const font = options?.italic ? fonts.italic : fonts.regular;
    const rawItems = options?.bullets ? safe(value).split(/\n|;/).map((item) => item.trim()).filter(Boolean) : [value];
    for (const item of rawItems) {
      const x = options?.bullets ? MARGIN + 14 : MARGIN;
      const maxWidth = options?.bullets ? CONTENT_WIDTH - 14 : CONTENT_WIDTH;
      const lines = wrap(item, font, 9.2, maxWidth);
      for (const [lineIndex, line] of lines.entries()) {
        ensure(18);
        if (options?.bullets && lineIndex === 0) page.drawCircle({ x: MARGIN + 3, y: y + 3, size: 2.2, color: accent });
        page.drawText(line, { x, y, size: 9.2, font, color: INK });
        y -= 13;
      }
      y -= 6;
    }
  };

  const cover = document.addPage([WIDTH, HEIGHT]);
  cover.drawRectangle({ x: 0, y: 0, width: WIDTH, height: HEIGHT, color: WHITE });
  cover.drawRectangle({ x: 0, y: HEIGHT - 315, width: WIDTH, height: 315, color: accent });
  let logoBottom = HEIGHT - 82;
  const logoMatch = input.logoDataUrl.match(/^data:(image\/(?:png|jpeg));base64,(.+)$/);
  if (logoMatch) {
    try {
      const bytes = Uint8Array.from(Buffer.from(logoMatch[2], 'base64'));
      const logo = logoMatch[1] === 'image/png' ? await document.embedPng(bytes) : await document.embedJpg(bytes);
      const scaled = logo.scaleToFit(116, 52);
      cover.drawImage(logo, { x: MARGIN, y: HEIGHT - 76, width: scaled.width, height: scaled.height });
      logoBottom = HEIGHT - 100;
    } catch {}
  } else {
    cover.drawText(safe(input.agencyName), { x: MARGIN, y: HEIGHT - 70, size: 14, font: fonts.bold, color: accentText });
  }
  cover.drawText('BUSINESS PROPOSAL', { x: MARGIN, y: logoBottom - 38, size: 9, font: fonts.bold, color: accentText });
  wrap(input.title, fonts.bold, 29, CONTENT_WIDTH).slice(0, 3).forEach((line, index) => cover.drawText(line, { x: MARGIN, y: logoBottom - 82 - index * 34, size: 29, font: fonts.bold, color: accentText }));
  cover.drawText(`PRIVATE & CONFIDENTIAL  |  ${safe(input.proposalNumber)}`, { x: MARGIN, y: HEIGHT - 287, size: 8, font: fonts.bold, color: accentText });
  cover.drawText('PREPARED FOR', { x: MARGIN, y: 468, size: 8, font: fonts.bold, color: MUTED });
  cover.drawText(safe(input.clientCompany), { x: MARGIN, y: 440, size: 20, font: fonts.bold, color: INK });
  cover.drawText(safe(input.clientName), { x: MARGIN, y: 420, size: 10, font: fonts.regular, color: MUTED });
  cover.drawText('PREPARED BY', { x: 350, y: 468, size: 8, font: fonts.bold, color: MUTED });
  cover.drawText(safe(input.agencyName), { x: 350, y: 442, size: 12, font: fonts.bold, color: INK });
  cover.drawText(safe(input.agencyEmail), { x: 350, y: 423, size: 9, font: fonts.regular, color: MUTED });
  cover.drawRectangle({ x: MARGIN, y: 225, width: CONTENT_WIDTH, height: 135, color: PALE, borderColor: LINE, borderWidth: 0.6 });
  wrap(input.introduction, fonts.regular, 10, CONTENT_WIDTH - 32).slice(0, 8).forEach((line, index) => cover.drawText(line, { x: MARGIN + 16, y: 330 - index * 14, size: 10, font: fonts.regular, color: INK }));
  cover.drawText(`Issued ${safe(input.issueDate)}  |  Valid until ${safe(input.validUntil)}`, { x: MARGIN, y: 94, size: 8.5, font: fonts.bold, color: MUTED });

  addContentPage('PROPOSAL OVERVIEW');
  heading('Letter of introduction'); paragraph(input.introduction);
  heading('Executive summary'); paragraph(input.executiveSummary);
  heading('Client objectives'); paragraph(input.objectives, { bullets: true });
  heading('Scope of work'); paragraph(input.scope, { bullets: true });

  addContentPage('DELIVERY PLAN');
  heading('Services offered');
  for (const service of input.services) {
    const descriptionLines = wrap(service.description, fonts.regular, 8, CONTENT_WIDTH - 24);
    const rowHeight = Math.max(54, descriptionLines.length * 10 + 34);
    ensure(rowHeight + 12);
    page.drawRectangle({ x: MARGIN, y: y - rowHeight + 6, width: CONTENT_WIDTH, height: rowHeight, color: PALE, borderColor: LINE, borderWidth: 0.5 });
    page.drawText(safe(service.name), { x: MARGIN + 12, y: y - 11, size: 10, font: fonts.bold, color: INK });
    page.drawText(safe(service.duration), { x: WIDTH - MARGIN - fonts.bold.widthOfTextAtSize(safe(service.duration), 8), y: y - 11, size: 8, font: fonts.bold, color: accent });
    descriptionLines.forEach((line, index) => page.drawText(line, { x: MARGIN + 12, y: y - 28 - index * 10, size: 8, font: fonts.regular, color: MUTED }));
    y -= rowHeight + 11;
  }
  heading('Deliverables'); paragraph(input.deliverables, { bullets: true });
  heading('Timeline and milestones'); paragraph(input.timeline, { bullets: true });
  heading('Out of scope'); paragraph(input.exclusions, { bullets: true });

  addContentPage('COMMERCIAL PROPOSAL');
  const subtotal = input.services.reduce((sum, item) => sum + item.price, 0);
  const tax = subtotal * input.taxRate / 100;
  heading('Investment');
  for (const service of input.services) {
    ensure(28);
    page.drawText(safe(service.name), { x: MARGIN, y, size: 9, font: fonts.regular, color: INK });
    const value = money(service.price, input.currency);
    page.drawText(value, { x: WIDTH - MARGIN - fonts.bold.widthOfTextAtSize(value, 9), y, size: 9, font: fonts.bold, color: INK });
    page.drawLine({ start: { x: MARGIN, y: y - 8 }, end: { x: WIDTH - MARGIN, y: y - 8 }, thickness: 0.4, color: LINE });
    y -= 26;
  }
  ensure(72);
  page.drawRectangle({ x: 330, y: y - 55, width: WIDTH - MARGIN - 330, height: 62, color: accent });
  page.drawText('TOTAL INVESTMENT', { x: 344, y: y - 17, size: 7.5, font: fonts.bold, color: accentText });
  const total = money(subtotal + tax, input.currency);
  page.drawText(total, { x: WIDTH - MARGIN - fonts.bold.widthOfTextAtSize(total, 14), y: y - 41, size: 14, font: fonts.bold, color: accentText });
  y -= 82;
  if (input.proformaInvoice) {
    heading('Linked proforma invoice');
    paragraph(`Proforma invoice ${input.proformaInvoice.invoiceNumber} is included with this proposal. Amount: ${money(input.proformaInvoice.amount, input.proformaInvoice.currency)}${input.proformaInvoice.validUntil ? `. Valid until ${input.proformaInvoice.validUntil}.` : '.'}`);
  }
  heading('Payment schedule');
  for (const payment of input.paymentSchedule) {
    const paymentLines = wrap(payment.description, fonts.regular, 8, CONTENT_WIDTH);
    const paymentHeight = Math.max(58, paymentLines.length * 10 + 39);
    ensure(paymentHeight);
    page.drawText(safe(payment.phase), { x: MARGIN, y, size: 9.5, font: fonts.bold, color: INK });
    const amount = money(payment.amount, input.currency);
    page.drawText(amount, { x: WIDTH - MARGIN - fonts.bold.widthOfTextAtSize(amount, 9), y, size: 9, font: fonts.bold, color: accent });
    page.drawText(`Due: ${safe(payment.due)}`, { x: MARGIN, y: y - 15, size: 8, font: fonts.bold, color: MUTED });
    paymentLines.forEach((line, index) => page.drawText(line, { x: MARGIN, y: y - 29 - index * 10, size: 8, font: fonts.regular, color: MUTED }));
    y -= paymentHeight;
  }

  addContentPage('TERMS & CONDITIONS');
  const terms: Array<[string, string, boolean?]> = [
    ['Assumptions', input.assumptions, true],
    ['Agency responsibilities', input.agencyResponsibilities, true],
    ['Client responsibilities', input.clientResponsibilities, true],
    ['Change control', input.changeControl],
    ['Confidentiality', input.confidentiality],
    ['Intellectual property', input.intellectualProperty],
    ['Term and termination', input.termination],
    ['Governing law and dispute resolution', input.governingLaw],
  ];
  for (const [title, body, bullets] of terms) { heading(title); paragraph(body, { bullets }); }
  if (input.additionalTerms) { heading('Additional terms and conditions'); paragraph(input.additionalTerms); }

  addContentPage('NEXT STEPS');
  heading('Next steps'); paragraph(input.nextSteps, { bullets: true });
  heading('Proposal contacts');
  paragraph(`${input.agencyName}\n${input.agencyEmail}${input.agencyPhone ? `\n${input.agencyPhone}` : ''}\n${input.agencyAddress}`);
  heading('Client details');
  paragraph(`${input.clientName}\n${input.clientCompany}\n${input.clientEmail}${input.clientPhone ? `\n${input.clientPhone}` : ''}\n${input.clientAddress}`);
  ensure(58);
  page.drawRectangle({ x: MARGIN, y: y - 42, width: CONTENT_WIDTH, height: 48, color: PALE, borderColor: LINE, borderWidth: 0.6 });
  page.drawText(`This proposal remains valid until ${safe(input.validUntil)}.`, { x: MARGIN + 14, y: y - 14, size: 9, font: fonts.bold, color: INK });
  page.drawText('Approval can be recorded through the project workflow in IrisOS; no signature block is included.', { x: MARGIN + 14, y: y - 30, size: 8, font: fonts.regular, color: MUTED });

  const pages = document.getPages();
  pages.forEach((current, index) => {
    current.drawLine({ start: { x: MARGIN, y: 48 }, end: { x: WIDTH - MARGIN, y: 48 }, thickness: 0.5, color: LINE });
    current.drawText(`Private & Confidential - ${safe(input.agencyName)} - Generated by IrisOS`, { x: MARGIN, y: 29, size: 7, font: fonts.regular, color: MUTED });
    const number = `${index + 1} / ${pages.length}`;
    current.drawText(number, { x: WIDTH - MARGIN - fonts.regular.widthOfTextAtSize(number, 7), y: 29, size: 7, font: fonts.regular, color: MUTED });
  });

  return Buffer.from(await document.save({ useObjectStreams: false }));
}
