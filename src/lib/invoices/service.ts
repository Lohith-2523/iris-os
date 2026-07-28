import 'server-only';

import { randomUUID } from 'node:crypto';
import { prisma } from '@/lib/db';
import { IrisEmailDeliveryError, sendIrisEmail } from '@/lib/email/iris-email';
import { invoiceDeliveryEmail } from '@/lib/email/iris-templates';
import {
  billingSnapshot,
  invoiceDueDate,
  missingBillingProfileFields,
  roundMoney,
} from './billing-profile';
import { generateInvoicePdf } from './pdf';
import type { InvoiceLineItem, InvoicePartySnapshot } from './types';
import {
  DEFAULT_INVOICE_BRAND_COLOR,
  inclusiveGstBreakdown,
  normalizeInvoiceBrandColor,
} from './branding';

export class InvoiceServiceError extends Error {
  constructor(message: string, readonly status = 400, readonly invoiceId?: string) {
    super(message);
    this.name = 'InvoiceServiceError';
  }
}

function formatInvoiceAmount(amount: number, currency: string) {
  return `${currency} ${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function invoiceNumber() {
  return `INV-${new Date().getUTCFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

export async function getInvoiceForPdf(invoiceId: string) {
  return prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      organization: true,
      client: true,
      project: true,
    },
  });
}

export async function invoicePdfFromRecord(invoice: NonNullable<Awaited<ReturnType<typeof getInvoiceForPdf>>>) {
  // Older invoices predate immutable billing snapshots. Reconstructing a PDF
  // from the current billing profiles keeps their admin download available,
  // while invoices issued through the new workflow always use their snapshots.
  const savedSeller = invoice.sellerSnapshot as InvoicePartySnapshot | null;
  const sellerBase = savedSeller
    || billingSnapshot(invoice.organization, invoice.organization.billingEmail || '');
  const seller: InvoicePartySnapshot = {
    ...sellerBase,
    displayName: sellerBase.displayName || invoice.organization.legalEntityName || invoice.organization.name,
    logoDataUrl: sellerBase.logoDataUrl || invoice.organization.invoiceLogoDataUrl || '',
    brandColor: normalizeInvoiceBrandColor(
      sellerBase.brandColor || invoice.organization.invoiceBrandColor || DEFAULT_INVOICE_BRAND_COLOR,
    ),
  };
  const buyer = invoice.buyerSnapshot as InvoicePartySnapshot | null
    || billingSnapshot(invoice.client, invoice.emailRecipient || '');
  const savedLineItems = Array.isArray(invoice.lineItems)
    ? invoice.lineItems as InvoiceLineItem[]
    : [];
  const lineItems = savedLineItems.length > 0
    ? savedLineItems
    : [{
        description: invoice.description || invoice.project.name,
        quantity: 1,
        unitPrice: invoice.subtotal > 0 ? invoice.subtotal : invoice.amount,
        amount: invoice.subtotal > 0 ? invoice.subtotal : invoice.amount,
      }];
  return generateInvoicePdf({
    invoiceNumber: invoice.invoiceNumber,
    issuedDate: invoice.issuedDate,
    dueDate: invoice.dueDate,
    currency: invoice.organization.currency,
    projectName: invoice.project.name,
    description: invoice.description || invoice.project.name,
    seller,
    buyer,
    lineItems,
    subtotal: invoice.subtotal,
    taxRate: invoice.taxRate,
    taxAmount: invoice.taxAmount,
    total: invoice.amount,
    paidAmount: invoice.paidAmount,
    status: invoice.status,
  });
}

export async function createAndSendProjectInvoice(input: {
  projectId: string;
  orgId: string;
  baseUrl: string;
  description?: string;
  automationKey?: string;
  source?: 'MANUAL' | 'PROJECT_INITIALIZATION';
}) {
  if (input.automationKey) {
    const existing = await prisma.invoice.findUnique({
      where: { automationKey: input.automationKey },
      include: { project: true, client: true, organization: true },
    });
    if (existing) return existing;
  }

  const project = await prisma.project.findFirst({
    where: { id: input.projectId, orgId: input.orgId },
    include: {
      organization: true,
      client: {
        include: {
          contacts: { orderBy: { createdAt: 'asc' }, take: 1 },
        },
      },
    },
  });
  if (!project) throw new InvoiceServiceError('Project not found.', 404);

  const recipient = project.client.contacts[0];
  if (!recipient?.email) {
    throw new InvoiceServiceError('The client needs a primary contact email before an invoice can be sent.');
  }
  const missing = [
    ...missingBillingProfileFields(project.organization, { requireLegalName: true, label: 'agency' }),
    ...missingBillingProfileFields(project.client, { requireLegalName: false, label: 'client' }),
  ];
  if (missing.length) {
    throw new InvoiceServiceError(`Invoice creation requires: ${missing.join(', ')}.`);
  }

  const configuredAmount = roundMoney(project.paymentAmount ?? 0);
  if (!Number.isFinite(configuredAmount) || configuredAmount <= 0) {
    throw new InvoiceServiceError('The project needs a positive client payment amount before invoicing.');
  }
  const { subtotal, taxRate, taxAmount, total } = inclusiveGstBreakdown(
    configuredAmount,
    Boolean(project.organization.gstNumber?.trim()),
  );
  const issuedDate = new Date();
  const dueDate = invoiceDueDate(issuedDate, project.paymentTerms);
  const seller: InvoicePartySnapshot = {
    ...billingSnapshot(
      project.organization,
      project.organization.billingEmail || '',
    ),
    displayName: project.organization.legalEntityName || project.organization.name,
    logoDataUrl: project.organization.invoiceLogoDataUrl || '',
    brandColor: normalizeInvoiceBrandColor(project.organization.invoiceBrandColor),
  };
  const buyer = billingSnapshot(project.client, recipient.email);
  const description = input.description?.trim() || project.serviceLine || project.name;
  const lineItems: InvoiceLineItem[] = [{
    description,
    quantity: 1,
    unitPrice: subtotal,
    amount: subtotal,
  }];

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber: invoiceNumber(),
      description,
      subtotal,
      taxRate,
      taxAmount,
      amount: total,
      paidAmount: 0,
      dueDate,
      status: 'UNPAID',
      source: input.source || 'MANUAL',
      sellerSnapshot: seller,
      buyerSnapshot: buyer,
      lineItems,
      emailRecipient: recipient.email.toLowerCase(),
      deliveryStatus: 'PENDING',
      automationKey: input.automationKey,
      orgId: project.orgId,
      clientId: project.clientId,
      projectId: project.id,
      issuedDate,
    },
    include: { project: true, client: true, organization: true },
  });

  const pdf = await invoicePdfFromRecord(invoice);
  const baseUrl = input.baseUrl.replace(/\/+$/, '');
  const downloadUrl = `${baseUrl}/api/invoices/${invoice.id}/pdf?token=${encodeURIComponent(invoice.downloadToken)}`;
  const email = invoiceDeliveryEmail({
    recipientName: recipient.name,
    organizationName: project.organization.legalEntityName || project.organization.name,
    invoiceNumber: invoice.invoiceNumber,
    projectName: project.name,
    amount: formatInvoiceAmount(total, project.organization.currency),
    dueDate: dueDate.toLocaleDateString('en-US', { dateStyle: 'long', timeZone: 'UTC' }),
    downloadUrl,
  });

  try {
    await sendIrisEmail({
      to: [recipient.email],
      subject: email.subject,
      html: email.html,
      text: email.text,
      idempotencyKey: `invoice-${invoice.id}`,
      tags: [{ name: 'category', value: 'project_invoice' }],
      attachments: [{
        filename: `${invoice.invoiceNumber}.pdf`,
        content: pdf,
        contentType: 'application/pdf',
      }],
    });
    return prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        deliveryStatus: 'SENT',
        deliveryError: null,
        sentAt: new Date(),
        pdfGeneratedAt: new Date(),
      },
      include: { project: true, client: true, organization: true },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Email delivery failed.';
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        deliveryStatus: 'FAILED',
        deliveryError: message.slice(0, 500),
        pdfGeneratedAt: new Date(),
      },
    });
    if (error instanceof IrisEmailDeliveryError) {
      throw new InvoiceServiceError(
        `Invoice ${invoice.invoiceNumber} was created, but email delivery failed: ${error.message}`,
        error.status,
        invoice.id,
      );
    }
    throw error;
  }
}
