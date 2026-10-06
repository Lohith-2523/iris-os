import { PDFDocument } from 'pdf-lib';
import { PDFArray, PDFRawStream, decodePDFRawStream } from 'pdf-lib/cjs/core';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { generateInvoicePdf } from './pdf';

function decodedPageContent(document: PDFDocument) {
  const contents = document.getPage(0).node.Contents();
  if (!contents) return '';
  const streams = contents instanceof PDFArray
    ? Array.from({ length: contents.size() }, (_, index) => contents.lookup(index, PDFRawStream))
    : [contents as PDFRawStream];
  return streams
    .map((stream) => new TextDecoder('latin1').decode(decodePDFRawStream(stream).decode()))
    .join('\n');
}

function encodedPdfText(value: string) {
  return `<${Buffer.from(value, 'latin1').toString('hex').toUpperCase()}> Tj`;
}

describe('invoice PDF', () => {
  it('creates a valid one-page PDF with invoice metadata', async () => {
    const logoDataUrl = `data:image/png;base64,${(await readFile(path.join(process.cwd(), 'public', 'iris-logo-white-bg.png'))).toString('base64')}`;
    const pdf = await generateInvoicePdf({
      invoiceNumber: 'INV-2026-TEST',
      issuedDate: new Date('2026-07-28T00:00:00.000Z'),
      dueDate: new Date('2026-08-27T00:00:00.000Z'),
      currency: 'INR',
      projectName: 'IrisOS implementation',
      description: 'Enterprise operating system implementation and onboarding',
      seller: {
        name: 'Iris Studio',
        legalEntityName: 'Iris Studio Private Limited',
        email: 'noreply@irisos.app',
        addressLine1: '100 Residency Road',
        addressLine2: '',
        city: 'Bengaluru',
        state: 'Karnataka',
        postalCode: '560025',
        country: 'India',
        gstNumber: '29ABCDE1234F1Z5',
        displayName: 'Iris Studio Private Limited',
        logoDataUrl,
        brandColor: '#5B3F8C',
      },
      buyer: {
        name: 'Aether Technologies',
        legalEntityName: 'Aether Technologies Private Limited',
        email: 'client@example.com',
        addressLine1: '42 Market Street',
        addressLine2: '',
        city: 'Bengaluru',
        state: 'Karnataka',
        postalCode: '560001',
        country: 'India',
        gstNumber: '',
      },
      lineItems: [{
        description: 'IrisOS implementation',
        quantity: 1,
        unitPrice: 100000,
        amount: 100000,
      }],
      subtotal: 100000,
      taxRate: 18,
      taxAmount: 18000,
      total: 118000,
      paidAmount: 25000,
      status: 'PARTIALLY_PAID',
    });

    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pdf.length).toBeGreaterThan(3_000);
    const parsed = await PDFDocument.load(Uint8Array.from(pdf));
    expect(parsed.getPageCount()).toBe(1);
    expect(parsed.getTitle()).toBe('Tax Invoice INV-2026-TEST');
    const pageContent = decodedPageContent(parsed);
    expect(pageContent.match(/ Tj/g)?.length).toBeGreaterThan(20);
    expect(pageContent).toContain(encodedPdfText('TAX INVOICE'));
    expect(pageContent).toContain(encodedPdfText('INV-2026-TEST'));
    expect(pageContent).toContain(encodedPdfText('IrisOS implementation'));
    expect(pageContent).toContain(encodedPdfText('BALANCE DUE'));

    if (process.env.WRITE_SAMPLE_PDF === '1') {
      const outputDirectory = path.join(process.cwd(), 'tmp', 'pdfs');
      await mkdir(outputDirectory, { recursive: true });
      await writeFile(path.join(outputDirectory, 'iris-os-sample-invoice.pdf'), pdf);
    }

    if (process.env.WRITE_INVOICE_TEMPLATE_PDF === '1') {
      const template = await generateInvoicePdf({
        invoiceNumber: 'INV-YYYY-0001',
        issuedDate: new Date('2026-01-01T00:00:00.000Z'),
        dueDate: new Date('2026-01-31T00:00:00.000Z'),
        currency: 'INR',
        projectName: 'Project name',
        description: 'Project service, milestone, or billing period',
        seller: {
          name: 'Agency name',
          legalEntityName: 'Agency legal entity name',
          email: 'billing@agency.example',
          addressLine1: 'Agency address line 1',
          addressLine2: 'Agency address line 2',
          city: 'City',
          state: 'State',
          postalCode: 'Postal code',
          country: 'Country',
          gstNumber: 'AGENCY GSTIN',
          displayName: 'Agency legal entity name',
          logoDataUrl,
          brandColor: '#5B3F8C',
        },
        buyer: {
          name: 'Client name',
          legalEntityName: 'Client legal entity name',
          email: 'billing@client.example',
          addressLine1: 'Client address line 1',
          addressLine2: 'Client address line 2',
          city: 'City',
          state: 'State',
          postalCode: 'Postal code',
          country: 'Country',
          gstNumber: 'CLIENT GSTIN',
        },
        lineItems: [{
          description: 'Project service or milestone',
          quantity: 1,
          unitPrice: 100000,
          amount: 100000,
        }],
        subtotal: 100000,
        taxRate: 18,
        taxAmount: 18000,
        total: 118000,
        paidAmount: 0,
        status: 'UNPAID',
      });
      const outputDirectory = path.join(process.cwd(), 'output', 'pdf');
      await mkdir(outputDirectory, { recursive: true });
      await writeFile(path.join(outputDirectory, 'iris-os-invoice-template.pdf'), template);
    }
  });

  it.each([
    [{ documentType: 'INVOICE' as const, invoiceType: 'TAX' }, 'Tax Invoice TAX-2026-TEST'],
    [{ documentType: 'PROFORMA' as const, invoiceType: 'STANDARD' }, 'Proforma Invoice PF-2026-TEST'],
  ])('labels tax and proforma documents clearly in PDF metadata', async (documentDetails, expectedTitle) => {
    const isProforma = documentDetails.documentType === 'PROFORMA';
    const pdf = await generateInvoicePdf({
      ...documentDetails,
      invoiceNumber: isProforma ? 'PF-2026-TEST' : 'TAX-2026-TEST',
      issuedDate: new Date('2026-07-29T00:00:00.000Z'),
      dueDate: new Date('2026-08-29T00:00:00.000Z'),
      currency: 'INR',
      projectName: 'Manual quotation',
      description: 'Professional services',
      seller: {
        name: 'Miles Studio',
        legalEntityName: 'Miles Studio Private Limited',
        email: 'billing@example.com',
        addressLine1: '1 Studio Road',
        addressLine2: '',
        city: 'Bengaluru',
        state: 'Karnataka',
        postalCode: '560001',
        country: 'India',
        gstNumber: '',
      },
      buyer: {
        name: 'Manual Customer',
        legalEntityName: 'Manual Customer',
        email: 'customer@example.com',
        addressLine1: '2 Customer Road',
        addressLine2: '',
        city: 'Bengaluru',
        state: 'Karnataka',
        postalCode: '560002',
        country: 'India',
        gstNumber: '',
      },
      lineItems: [{
        description: 'Professional services',
        quantity: 1,
        unitPrice: 1000,
        amount: 1000,
      }],
      subtotal: 1000,
      taxRate: 18,
      taxAmount: 180,
      total: 1180,
      paidAmount: 0,
      status: isProforma ? 'PROFORMA' : 'UNPAID',
    });

    const parsed = await PDFDocument.load(Uint8Array.from(pdf));
    expect(parsed.getTitle()).toBe(expectedTitle);
  });
});
