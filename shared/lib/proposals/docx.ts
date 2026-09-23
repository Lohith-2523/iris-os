import 'server-only';

import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
  LevelFormat,
  PageNumber,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from 'docx';
import type { ProposalInput } from './types';

const PAGE_WIDTH = 12_240;
const PAGE_HEIGHT = 15_840;
const MARGIN = 1_440;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const INK = '111318';
const MUTED = '646B78';
const LINE = 'D9DDE3';
const PALE = 'F5F7F9';

function clean(value: unknown) {
  return String(value ?? '').replace(/\r\n/g, '\n').trim();
}

function money(value: number, currency: string) {
  return `${clean(currency)} ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function textParagraphs(value: string) {
  return clean(value).split(/\n+/).filter(Boolean).map(text => new Paragraph({ text, style: 'Normal' }));
}

function bulletParagraphs(value: string) {
  return clean(value).split(/\n|;/).map(item => item.trim()).filter(Boolean).map(text => new Paragraph({
    text,
    style: 'Normal',
    numbering: { reference: 'proposal-bullets', level: 0 },
  }));
}

function heading(text: string) {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_1 });
}

function label(text: string) {
  return new Paragraph({
    spacing: { before: 0, after: 90 },
    children: [new TextRun({ text: text.toUpperCase(), bold: true, size: 17, color: MUTED, characterSpacing: 24 })],
  });
}

function infoCell(labelText: string, value: string, width: number) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    verticalAlign: VerticalAlign.TOP,
    margins: { top: 160, bottom: 160, left: 180, right: 180 },
    shading: { fill: PALE, type: ShadingType.CLEAR },
    children: [label(labelText), new Paragraph({ children: [new TextRun({ text: clean(value), bold: true, color: INK })] })],
  });
}

function twoColumnInfo(leftLabel: string, leftValue: string, rightLabel: string, rightValue: string) {
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: [CONTENT_WIDTH / 2, CONTENT_WIDTH / 2],
    rows: [new TableRow({ children: [
      infoCell(leftLabel, leftValue, CONTENT_WIDTH / 2),
      infoCell(rightLabel, rightValue, CONTENT_WIDTH / 2),
    ] })],
  });
}

const borders = {
  top: { style: BorderStyle.SINGLE, size: 4, color: LINE },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: LINE },
  left: { style: BorderStyle.SINGLE, size: 4, color: LINE },
  right: { style: BorderStyle.SINGLE, size: 4, color: LINE },
  insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: LINE },
  insideVertical: { style: BorderStyle.SINGLE, size: 4, color: LINE },
};

export async function generateProposalDocx(input: ProposalInput) {
  const accent = input.brandColor.replace('#', '').toUpperCase();
  const subtotal = input.services.reduce((sum, service) => sum + service.price, 0);
  const tax = subtotal * input.taxRate / 100;
  const total = subtotal + tax;
  const children: Array<Paragraph | Table> = [
    new Paragraph({
      spacing: { before: 680, after: 130 },
      children: [new TextRun({ text: 'BUSINESS PROPOSAL', bold: true, size: 19, color: accent, characterSpacing: 32 })],
    }),
    new Paragraph({ text: input.title, heading: HeadingLevel.TITLE }),
    new Paragraph({
      spacing: { after: 500 },
      children: [new TextRun({ text: `Prepared for ${input.clientCompany}`, size: 25, color: MUTED })],
    }),
    twoColumnInfo('Proposal number', input.proposalNumber, 'Validity', `${input.issueDate} to ${input.validUntil}`),
    new Paragraph({ spacing: { after: 220 } }),
    twoColumnInfo('Prepared for', `${input.clientName}\n${input.clientCompany}\n${input.clientEmail}`, 'Prepared by', `${input.agencyName}\n${input.agencyEmail}\n${input.agencyAddress}`),
    new Paragraph({ spacing: { after: 280 } }),
    heading('Letter of introduction'),
    ...textParagraphs(input.introduction),
    heading('Executive summary'),
    ...textParagraphs(input.executiveSummary),
    heading('Client objectives'),
    ...bulletParagraphs(input.objectives),
    heading('Scope of work'),
    ...bulletParagraphs(input.scope),
    heading('Services and investment'),
    new Table({
      width: { size: CONTENT_WIDTH, type: WidthType.DXA },
      layout: TableLayoutType.FIXED,
      columnWidths: [5_300, 2_000, 2_060],
      borders,
      rows: [
        new TableRow({ tableHeader: true, children: [
          new TableCell({ width: { size: 5_300, type: WidthType.DXA }, shading: { fill: accent, type: ShadingType.CLEAR }, margins: { top: 120, bottom: 120, left: 140, right: 140 }, children: [new Paragraph({ children: [new TextRun({ text: 'Service', bold: true, color: 'FFFFFF' })] })] }),
          new TableCell({ width: { size: 2_000, type: WidthType.DXA }, shading: { fill: accent, type: ShadingType.CLEAR }, margins: { top: 120, bottom: 120, left: 140, right: 140 }, children: [new Paragraph({ children: [new TextRun({ text: 'Duration', bold: true, color: 'FFFFFF' })] })] }),
          new TableCell({ width: { size: 2_060, type: WidthType.DXA }, shading: { fill: accent, type: ShadingType.CLEAR }, margins: { top: 120, bottom: 120, left: 140, right: 140 }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Investment', bold: true, color: 'FFFFFF' })] })] }),
        ] }),
        ...input.services.map(service => new TableRow({ children: [
          new TableCell({ width: { size: 5_300, type: WidthType.DXA }, margins: { top: 140, bottom: 140, left: 140, right: 140 }, children: [new Paragraph({ children: [new TextRun({ text: service.name, bold: true }), new TextRun({ text: `\n${service.description}`, color: MUTED })] })] }),
          new TableCell({ width: { size: 2_000, type: WidthType.DXA }, margins: { top: 140, bottom: 140, left: 140, right: 140 }, children: [new Paragraph(service.duration)] }),
          new TableCell({ width: { size: 2_060, type: WidthType.DXA }, margins: { top: 140, bottom: 140, left: 140, right: 140 }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: money(service.price, input.currency), bold: true })] })] }),
        ] })),
        new TableRow({ children: [
          new TableCell({ columnSpan: 2, width: { size: 7_300, type: WidthType.DXA }, margins: { top: 110, bottom: 110, left: 140, right: 140 }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, text: 'Subtotal' })] }),
          new TableCell({ width: { size: 2_060, type: WidthType.DXA }, margins: { top: 110, bottom: 110, left: 140, right: 140 }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, text: money(subtotal, input.currency) })] }),
        ] }),
        new TableRow({ children: [
          new TableCell({ columnSpan: 2, width: { size: 7_300, type: WidthType.DXA }, margins: { top: 110, bottom: 110, left: 140, right: 140 }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, text: `Tax (${input.taxRate}%)` })] }),
          new TableCell({ width: { size: 2_060, type: WidthType.DXA }, margins: { top: 110, bottom: 110, left: 140, right: 140 }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, text: money(tax, input.currency) })] }),
        ] }),
        new TableRow({ children: [
          new TableCell({ columnSpan: 2, width: { size: 7_300, type: WidthType.DXA }, shading: { fill: PALE, type: ShadingType.CLEAR }, margins: { top: 130, bottom: 130, left: 140, right: 140 }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Total investment', bold: true })] })] }),
          new TableCell({ width: { size: 2_060, type: WidthType.DXA }, shading: { fill: PALE, type: ShadingType.CLEAR }, margins: { top: 130, bottom: 130, left: 140, right: 140 }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: money(total, input.currency), bold: true, color: accent })] })] }),
        ] }),
      ],
    }),
    heading('Deliverables'),
    ...bulletParagraphs(input.deliverables),
    heading('Timeline and milestones'),
    ...bulletParagraphs(input.timeline),
    heading('Out of scope'),
    ...bulletParagraphs(input.exclusions),
    heading('Payment schedule'),
    ...input.paymentSchedule.flatMap(payment => [
      new Paragraph({ keepNext: true, children: [new TextRun({ text: payment.phase, bold: true }), new TextRun({ text: ` — ${money(payment.amount, input.currency)}`, bold: true, color: accent })] }),
      new Paragraph({ children: [new TextRun({ text: `Due: ${payment.due}. `, bold: true }), new TextRun(payment.description)] }),
    ]),
  ];

  if (input.proformaInvoice) {
    children.push(heading('Linked proforma invoice'), ...textParagraphs(`Proforma invoice ${input.proformaInvoice.invoiceNumber} is included with this proposal. Amount: ${money(input.proformaInvoice.amount, input.proformaInvoice.currency)}${input.proformaInvoice.validUntil ? `. Valid until ${input.proformaInvoice.validUntil}.` : '.'}`));
  }

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
  for (const [title, body, bullets] of terms) children.push(heading(title), ...(bullets ? bulletParagraphs(body) : textParagraphs(body)));
  if (input.additionalTerms) children.push(heading('Additional terms and conditions'), ...textParagraphs(input.additionalTerms));
  children.push(heading('Next steps'), ...bulletParagraphs(input.nextSteps));

  const document = new Document({
    creator: 'IrisOS',
    title: input.title,
    subject: `Business proposal for ${input.clientCompany}`,
    description: `Proposal ${input.proposalNumber}`,
    styles: {
      default: { document: { run: { font: 'Aptos', size: 21, color: INK }, paragraph: { spacing: { after: 150, line: 290 } } } },
      paragraphStyles: [
        { id: 'Title', name: 'Title', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: 'Aptos Display', size: 48, bold: true, color: INK }, paragraph: { spacing: { before: 0, after: 160 }, keepNext: true } },
        { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: 'Aptos Display', size: 28, bold: true, color: accent }, paragraph: { spacing: { before: 360, after: 140 }, keepNext: true, outlineLevel: 0 } },
      ],
    },
    numbering: { config: [{ reference: 'proposal-bullets', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 420, hanging: 220 } } } }] }] },
    sections: [{
      properties: { page: { size: { width: PAGE_WIDTH, height: PAGE_HEIGHT }, margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN, header: 540, footer: 540 } } },
      headers: { default: new Header({ children: [new Table({ width: { size: CONTENT_WIDTH, type: WidthType.DXA }, layout: TableLayoutType.FIXED, columnWidths: [6_200, 3_160], rows: [new TableRow({ children: [
        new TableCell({ width: { size: 6_200, type: WidthType.DXA }, borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } }, children: [new Paragraph({ children: [new TextRun({ text: input.agencyName, bold: true, color: accent })] })] }),
        new TableCell({ width: { size: 3_160, type: WidthType.DXA }, borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: input.proposalNumber, bold: true, color: MUTED })] })] }),
      ] })] })] }) },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `Private & Confidential  ·  ${input.agencyName}  ·  `, color: MUTED, size: 17 }), new TextRun({ children: [PageNumber.CURRENT], color: MUTED, size: 17 }), new TextRun({ text: ' / ', color: MUTED, size: 17 }), new TextRun({ children: [PageNumber.TOTAL_PAGES], color: MUTED, size: 17 })] })] }) },
      children,
    }],
  });

  return Uint8Array.from(await Packer.toBuffer(document));
}
