import 'server-only';

import { PDFDocument, StandardFonts, rgb, type PDFImage, type PDFFont, type PDFPage, type RGB } from 'pdf-lib';
import type { ContractInput, LegalDocumentInput, SowInput } from './types';

const WIDTH = 595.28, HEIGHT = 841.89, MARGIN = 46, CONTENT = WIDTH - MARGIN * 2;
const WHITE = rgb(1, 1, 1), INK = rgb(.055, .063, .08), MUTED = rgb(.39, .42, .48), LINE = rgb(.86, .87, .89), PALE = rgb(.965, .97, .976);
type Fonts = { regular: PDFFont; bold: PDFFont; italic: PDFFont };
type Section = { title: string; body: string; bullets?: boolean; pageBreak?: boolean };
type Table = { title: string; columns: string[]; widths: number[]; rows: string[][]; pageBreak?: boolean };

const safe = (value: unknown) => String(value ?? '').normalize('NFKD').replace(/[^\x20-\x7E\n]/g, '').trim();
const color = (hex: string): RGB => { const n = Number.parseInt(hex.slice(1), 16); return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255); };
const contrast = (hex: string) => { const n = Number.parseInt(hex.slice(1), 16); return (.2126 * ((n >> 16) & 255) + .7152 * ((n >> 8) & 255) + .0722 * (n & 255)) / 255 > .62 ? INK : WHITE; };
const money = (value: number, currency: string) => `${safe(currency)} ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function wrap(value: unknown, font: PDFFont, size: number, width: number) {
  const output: string[] = [];
  for (const paragraph of safe(value).split(/\n+/)) {
    let line = '';
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= width) line = candidate;
      else { if (line) output.push(line); line = word; }
    }
    if (line) output.push(line);
    output.push('');
  }
  if (output.at(-1) === '') output.pop();
  return output.length ? output : [''];
}

async function logo(document: PDFDocument, dataUrl: string): Promise<PDFImage | null> {
  const match = dataUrl.match(/^data:(image\/(?:png|jpeg));base64,(.+)$/);
  if (!match) return null;
  try { const bytes = Uint8Array.from(Buffer.from(match[2], 'base64')); return match[1] === 'image/png' ? document.embedPng(bytes) : document.embedJpg(bytes); } catch { return null; }
}

function contractSections(input: ContractInput): Section[] {
  return [
    { title: 'Background and recitals', body: input.recitals, pageBreak: true },
    { title: '1. Services', body: input.services, bullets: true }, { title: '2. Deliverables', body: input.deliverables, bullets: true },
    { title: '3. Term and commencement', body: `Services commence on ${input.commencementDate}. Initial term: ${input.initialTerm}.` },
    { title: '4. Fees', body: input.fees, pageBreak: true }, { title: '5. Payment terms', body: input.paymentTerms }, { title: '6. Late payment and suspension', body: input.latePayment },
    { title: '7. Cancellation and refunds', body: input.cancellation }, { title: '8. Performance disclaimer', body: input.performanceDisclaimer }, { title: '9. Termination', body: input.termination },
    { title: '10. Agency obligations', body: input.agencyObligations, bullets: true, pageBreak: true }, { title: '11. Client obligations', body: input.clientObligations, bullets: true },
    { title: '12. Confidentiality', body: input.confidentiality }, { title: '13. Publicity and case studies', body: input.publicity }, { title: '14. Intellectual property', body: input.intellectualProperty }, { title: '15. Data protection', body: input.dataProtection },
    { title: '16. Mutual indemnification', body: input.indemnification, pageBreak: true }, { title: '17. Limitation of liability', body: input.limitationOfLiability },
    { title: '18. Independent contractor', body: input.independentContractor }, { title: '19. Assignment', body: input.assignment }, { title: '20. Force majeure', body: input.forceMajeure },
    { title: '21. Notices', body: input.notices }, { title: '22. Amendments', body: input.amendments }, { title: '23. Entire agreement', body: input.entireAgreement },
    { title: '24. Severability and waiver', body: input.severability }, { title: '25. Governing law and venue', body: input.governingLaw }, { title: '26. Dispute resolution', body: input.disputeResolution },
    ...(input.additionalTerms ? [{ title: '27. Additional terms and conditions', body: input.additionalTerms }] : []),
  ];
}

function sowSections(input: SowInput): Section[] {
  return [
    { title: '1. Introduction', body: input.introduction, pageBreak: true }, { title: '2. Objectives', body: input.objectives, bullets: true }, { title: '3. Scope of work', body: input.scope, bullets: true },
    { title: '4. Execution process', body: input.executionProcess, bullets: true, pageBreak: true },
    { title: '5. Pricing', body: `${money(input.fee, input.currency)} plus ${input.taxRate.toFixed(2)}% tax.\n${input.pricingNotes}`, pageBreak: true },
    { title: '6. Payment terms', body: input.paymentTerms }, { title: '7. Expenses, media and ad spend', body: input.expensesAndAdSpend }, { title: '8. Revisions', body: input.revisions }, { title: '9. Reporting', body: input.reporting },
    { title: '10. Assumptions', body: input.assumptions, bullets: true, pageBreak: true }, { title: '11. Dependencies', body: input.dependencies, bullets: true }, { title: '12. Exclusions', body: input.exclusions, bullets: true },
    { title: '13. Governance and communications', body: input.governance }, { title: '14. Change management', body: input.changeManagement }, { title: '15. Confidentiality', body: input.confidentiality },
    { title: '16. Intellectual property', body: input.intellectualProperty }, { title: '17. Termination', body: input.termination }, { title: '18. Closing note', body: input.closingNote },
    ...(input.additionalTerms ? [{ title: '19. Additional terms and conditions', body: input.additionalTerms }] : []),
  ];
}

export async function generateLegalDocumentPdf(input: LegalDocumentInput) {
  const document = await PDFDocument.create();
  const fonts: Fonts = { regular: await document.embedFont(StandardFonts.Helvetica), bold: await document.embedFont(StandardFonts.HelveticaBold), italic: await document.embedFont(StandardFonts.HelveticaOblique) };
  const accent = color(input.brandColor), accentText = contrast(input.brandColor), embeddedLogo = await logo(document, input.logoDataUrl);
  const documentLabel = input.kind === 'CONTRACT' ? 'SERVICE AGREEMENT' : 'STATEMENT OF WORK';
  document.setTitle(input.title); document.setAuthor(input.agencyName); document.setSubject(`${documentLabel} for ${input.clientLegalName}`); document.setCreator('Iris OS Document Studio'); document.setProducer('Iris OS');
  let page!: PDFPage, y = 0, pageLabel = documentLabel;
  const addPage = (label = pageLabel) => { pageLabel = label; page = document.addPage([WIDTH, HEIGHT]); page.drawRectangle({ x: 0, y: 0, width: WIDTH, height: HEIGHT, color: WHITE }); page.drawRectangle({ x: 0, y: HEIGHT - 58, width: WIDTH, height: 58, color: accent }); page.drawText(safe(input.agencyName), { x: MARGIN, y: HEIGHT - 35, size: 10, font: fonts.bold, color: accentText }); const right = safe(label).toUpperCase(); page.drawText(right, { x: WIDTH - MARGIN - fonts.bold.widthOfTextAtSize(right, 8), y: HEIGHT - 34, size: 8, font: fonts.bold, color: accentText }); y = HEIGHT - 90; };
  const ensure = (height: number) => { if (y - height < 74) addPage(`${pageLabel} - CONTINUED`); };
  const heading = (title: string) => { ensure(38); page.drawText(safe(title).toUpperCase(), { x: MARGIN, y, size: 8.5, font: fonts.bold, color: accent }); page.drawLine({ start: { x: MARGIN, y: y - 8 }, end: { x: WIDTH - MARGIN, y: y - 8 }, thickness: .6, color: LINE }); y -= 28; };
  const paragraph = (body: string, bullets = false) => { const items = bullets ? safe(body).split(/\n|;/).map(v => v.trim()).filter(Boolean) : [body]; for (const item of items) { const x = bullets ? MARGIN + 14 : MARGIN, lines = wrap(item, fonts.regular, 9.1, CONTENT - (bullets ? 14 : 0)); for (const [index, line] of lines.entries()) { ensure(18); if (bullets && index === 0) page.drawCircle({ x: MARGIN + 3, y: y + 3, size: 2, color: accent }); page.drawText(line, { x, y, size: 9.1, font: fonts.regular, color: INK }); y -= 13; } y -= 6; } };
  const table = (definition: Table) => { if (definition.pageBreak) addPage(definition.title); heading(definition.title); const headerHeight = 28; ensure(headerHeight + 40); page.drawRectangle({ x: MARGIN, y: y - headerHeight + 7, width: CONTENT, height: headerHeight, color: accent }); let x = MARGIN; definition.columns.forEach((column, index) => { page.drawText(safe(column).toUpperCase(), { x: x + 6, y: y - 10, size: 6.8, font: fonts.bold, color: accentText }); x += definition.widths[index]; }); y -= headerHeight; for (const row of definition.rows) { const wrapped = row.map((cell, index) => wrap(cell, fonts.regular, 7.7, definition.widths[index] - 12)); const rowHeight = Math.max(30, Math.max(...wrapped.map(lines => lines.length)) * 10 + 12); ensure(rowHeight + headerHeight); if (y > HEIGHT - 100) { page.drawRectangle({ x: MARGIN, y: y - headerHeight + 7, width: CONTENT, height: headerHeight, color: accent }); y -= headerHeight; } page.drawRectangle({ x: MARGIN, y: y - rowHeight + 7, width: CONTENT, height: rowHeight, color: PALE, borderColor: LINE, borderWidth: .45 }); x = MARGIN; wrapped.forEach((lines, columnIndex) => { lines.forEach((line, lineIndex) => page.drawText(line, { x: x + 6, y: y - 10 - lineIndex * 10, size: 7.7, font: columnIndex === 0 ? fonts.bold : fonts.regular, color: columnIndex === 0 ? INK : MUTED })); x += definition.widths[columnIndex]; }); y -= rowHeight; } y -= 14; };

  const cover = document.addPage([WIDTH, HEIGHT]); cover.drawRectangle({ x: 0, y: 0, width: WIDTH, height: HEIGHT, color: WHITE }); cover.drawRectangle({ x: 0, y: HEIGHT - 300, width: WIDTH, height: 300, color: accent });
  if (embeddedLogo) { const scaled = embeddedLogo.scaleToFit(118, 52); cover.drawImage(embeddedLogo, { x: MARGIN, y: HEIGHT - 78, width: scaled.width, height: scaled.height }); } else cover.drawText(safe(input.agencyName), { x: MARGIN, y: HEIGHT - 70, size: 14, font: fonts.bold, color: accentText });
  cover.drawText(documentLabel, { x: MARGIN, y: HEIGHT - 128, size: 9, font: fonts.bold, color: accentText }); wrap(input.title, fonts.bold, 28, CONTENT).slice(0, 3).forEach((line, index) => cover.drawText(line, { x: MARGIN, y: HEIGHT - 174 - index * 33, size: 28, font: fonts.bold, color: accentText })); cover.drawText(`PRIVATE & CONFIDENTIAL  |  ${safe(input.documentNumber)}`, { x: MARGIN, y: HEIGHT - 275, size: 8, font: fonts.bold, color: accentText });
  cover.drawText('BETWEEN', { x: MARGIN, y: 472, size: 8, font: fonts.bold, color: MUTED }); cover.drawText(safe(input.agencyLegalName), { x: MARGIN, y: 444, size: 16, font: fonts.bold, color: INK }); cover.drawText('Agency', { x: MARGIN, y: 423, size: 9, font: fonts.italic, color: MUTED }); cover.drawText('AND', { x: MARGIN, y: 380, size: 8, font: fonts.bold, color: MUTED }); cover.drawText(safe(input.clientLegalName), { x: MARGIN, y: 352, size: 16, font: fonts.bold, color: INK }); cover.drawText('Client', { x: MARGIN, y: 331, size: 9, font: fonts.italic, color: MUTED });
  const meta = input.kind === 'CONTRACT' ? [`Effective: ${input.effectiveDate}`, `Commencement: ${input.commencementDate}`, `Initial term: ${input.initialTerm}`] : [`Effective: ${input.effectiveDate}`, `Engagement: ${input.engagementType}`, `Period: ${input.startDate} to ${input.endDate}`]; meta.forEach((line, index) => cover.drawText(safe(line), { x: MARGIN, y: 230 - index * 22, size: 9, font: index === 0 ? fonts.bold : fonts.regular, color: index === 0 ? INK : MUTED }));

  const sections = input.kind === 'CONTRACT' ? contractSections(input) : sowSections(input);
  for (const section of sections) { if (section.pageBreak) addPage(section.title); heading(section.title); paragraph(section.body, section.bullets); }
  if (input.kind === 'SOW') {
    table({ title: 'Deliverables summary', columns: ['Deliverable', 'Scope', 'Cadence', 'Acceptance'], widths: [112, 181, 82, 128], rows: input.deliverables.map(item => [item.name, item.scope, item.cadence, item.acceptance]), pageBreak: true });
    table({ title: 'Milestones', columns: ['Milestone', 'Target', 'Output'], widths: [150, 100, 253], rows: input.milestones.map(item => [item.name, item.targetDate, item.output]), pageBreak: true });
  }
  addPage('AUTHORISED ACCEPTANCE'); heading('Authorised acceptance'); paragraph(`By signing below, each party confirms that it has read, understood, and agrees to this ${documentLabel.toLowerCase()}.`);
  ensure(230); const signatureY = y - 50; const audit = input.signatureAudit; for (const [index, party] of [[input.agencySignatoryName, input.agencySignatoryTitle, input.agencyLegalName], [input.clientSignatoryName, input.clientSignatoryTitle, input.clientLegalName]].entries()) { const x = index === 0 ? MARGIN : 320; const signedName = index === 0 ? audit?.agencyName : audit?.recipientName; const signedAt = index === 0 ? audit?.agencySignedAt : audit?.recipientSignedAt; page.drawLine({ start: { x, y: signatureY }, end: { x: x + 225, y: signatureY }, thickness: .8, color: INK }); page.drawText(safe(signedName || party[0]), { x, y: signatureY - 18, size: 9, font: fonts.bold, color: INK }); page.drawText(`${safe(party[1])} - ${safe(party[2])}`, { x, y: signatureY - 34, size: 7.5, font: fonts.regular, color: MUTED }); if (signedAt) { page.drawText('ELECTRONICALLY SIGNED', { x, y: signatureY - 57, size: 7, font: fonts.bold, color: accent }); page.drawText(safe(new Date(signedAt).toISOString()), { x, y: signatureY - 72, size: 7, font: fonts.regular, color: MUTED }); } else { page.drawLine({ start: { x, y: signatureY - 74 }, end: { x: x + 100, y: signatureY - 74 }, thickness: .6, color: LINE }); page.drawText('Date', { x, y: signatureY - 88, size: 7, font: fonts.regular, color: MUTED }); } }
  if (audit?.executedAt && audit.contentHash) { page.drawText(`Executed ${safe(new Date(audit.executedAt).toISOString())} | Content SHA-256 ${safe(audit.contentHash)}`, { x: MARGIN, y: signatureY - 128, size: 6.5, font: fonts.regular, color: MUTED }); }

  const pages = document.getPages(); pages.forEach((current, index) => { current.drawLine({ start: { x: MARGIN, y: 48 }, end: { x: WIDTH - MARGIN, y: 48 }, thickness: .5, color: LINE }); current.drawText(`Private & Confidential - ${safe(input.agencyName)} - Generated by Iris OS`, { x: MARGIN, y: 29, size: 7, font: fonts.regular, color: MUTED }); const label = `${index + 1} / ${pages.length}`; current.drawText(label, { x: WIDTH - MARGIN - fonts.regular.widthOfTextAtSize(label, 7), y: 29, size: 7, font: fonts.regular, color: MUTED }); });
  return Buffer.from(await document.save({ useObjectStreams: false }));
}
