import 'server-only';

import { randomUUID } from 'node:crypto';
import { prisma } from '@/lib/db';
import { IrisEmailDeliveryError, sendIrisEmail } from '@/lib/email/iris-email';
import { invoiceDeliveryEmail } from '@/lib/email/iris-templates';
import { agencyViaIrisSenderName } from '@/lib/email/sender-name';
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
import {
  allocateProjectValue,
  calculateInvoiceItems,
  calculateInvoiceItemsWithOverallTax,
  MAX_INVOICE_ITEMS,
  type InvoiceLineItemInput,
} from './calculations';
import { entitlementsFor, planLimitMessage } from '@/lib/plan-entitlements';
import { generateRecurringOccurrences } from '@/lib/finance/recurrence';

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

function documentNumber(documentType: 'INVOICE' | 'PROFORMA') {
  const prefix = documentType === 'PROFORMA' ? 'PF' : 'INV';
  return `${prefix}-${new Date().getUTCFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

export async function getInvoiceForPdf(invoiceId: string) {
  return prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      organization: true,
      client: true,
      project: true,
      lead: true,
    },
  });
}

async function getCreatedInvoice(invoiceId: string) {
  const invoice = await getInvoiceForPdf(invoiceId);
  if (!invoice) throw new InvoiceServiceError('The created invoice could not be loaded.', 500, invoiceId);
  return invoice;
}

function partySnapshot(value: unknown): Partial<InvoicePartySnapshot> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Partial<InvoicePartySnapshot>
    : {};
}

function mergePartySnapshot(
  savedValue: unknown,
  liveValue: Partial<InvoicePartySnapshot>,
  fallback: { name: string; email?: string },
): InvoicePartySnapshot {
  const saved = partySnapshot(savedValue);
  const value = (key: keyof InvoicePartySnapshot) => String(saved[key] || liveValue[key] || '').trim();
  const name = value('name') || value('legalEntityName') || fallback.name;
  return {
    name,
    legalEntityName: value('legalEntityName') || name,
    email: value('email') || fallback.email || '',
    phone: value('phone') || undefined,
    addressLine1: value('addressLine1'),
    addressLine2: value('addressLine2'),
    city: value('city'),
    state: value('state'),
    postalCode: value('postalCode'),
    country: value('country'),
    gstNumber: value('gstNumber'),
    displayName: value('displayName') || undefined,
    logoDataUrl: value('logoDataUrl') || undefined,
    brandColor: value('brandColor') || undefined,
  };
}

export async function invoicePdfFromRecord(invoice: NonNullable<Awaited<ReturnType<typeof getInvoiceForPdf>>>) {
  const liveSeller = billingSnapshot(invoice.organization, invoice.organization.billingEmail || '');
  const sellerBase = mergePartySnapshot(
    invoice.sellerSnapshot,
    liveSeller,
    { name: invoice.organization.legalEntityName || invoice.organization.name, email: invoice.organization.billingEmail || '' },
  );
  const seller: InvoicePartySnapshot = {
    ...sellerBase,
    displayName: sellerBase.displayName || invoice.organization.legalEntityName || invoice.organization.name,
    logoDataUrl: sellerBase.logoDataUrl || invoice.organization.invoiceLogoDataUrl || '',
    brandColor: normalizeInvoiceBrandColor(
      sellerBase.brandColor || invoice.organization.invoiceBrandColor || DEFAULT_INVOICE_BRAND_COLOR,
    ),
  };
  const liveBuyer = invoice.client
    ? billingSnapshot(invoice.client, invoice.emailRecipient || '')
    : invoice.lead
      ? {
          name: invoice.lead.fullName,
          legalEntityName: invoice.lead.fullName,
          email: invoice.lead.email,
          phone: invoice.lead.phone || undefined,
          addressLine1: '', addressLine2: '', city: '', state: '', postalCode: '', country: '', gstNumber: '',
        }
      : null;
  const savedBuyer = partySnapshot(invoice.buyerSnapshot);
  if (!liveBuyer && Object.keys(savedBuyer).length === 0) throw new InvoiceServiceError('This invoice is missing customer billing details.');
  const buyer = mergePartySnapshot(
    savedBuyer,
    liveBuyer || {},
    {
      name: invoice.client?.name || invoice.lead?.fullName || invoice.description || 'Customer',
      email: invoice.emailRecipient || invoice.lead?.email || '',
    },
  );
  const referenceName = invoice.project?.name || invoice.client?.name || invoice.lead?.fullName || invoice.description || 'Commercial quotation';
  const savedLineItems = Array.isArray(invoice.lineItems)
    ? invoice.lineItems as InvoiceLineItem[]
    : [];
  const lineItems = savedLineItems.length > 0
    ? savedLineItems
    : [{
        description: invoice.description || referenceName,
        quantity: 1,
        unitPrice: invoice.subtotal > 0 ? invoice.subtotal : invoice.amount,
        amount: invoice.subtotal > 0 ? invoice.subtotal : invoice.amount,
        taxRate: invoice.taxRate,
        taxAmount: invoice.taxAmount,
        total: invoice.amount,
      }];
  const pdf = await generateInvoicePdf({
    invoiceNumber: invoice.invoiceNumber,
    documentType: invoice.documentType === 'PROFORMA' ? 'PROFORMA' : 'INVOICE',
    invoiceType: invoice.documentType === 'PROFORMA' ? 'STANDARD' : 'TAX',
    issuedDate: invoice.issuedDate,
    dueDate: invoice.dueDate,
    currency: invoice.organization.currency,
    projectName: referenceName,
    description: invoice.description || referenceName,
    seller,
    buyer,
    lineItems,
    subtotal: invoice.subtotal,
    taxRate: invoice.taxRate,
    taxAmount: invoice.taxAmount,
    total: invoice.amount,
    paidAmount: invoice.paidAmount,
    status: invoice.status,
    termsOfSale: invoice.termsOfSale || undefined,
  });
  if (pdf.length < 2_000 || pdf.subarray(0, 5).toString() !== '%PDF-') {
    throw new InvoiceServiceError('The invoice PDF could not be rendered correctly.', 500);
  }
  return pdf;
}

async function createAndSendDocument(input: {
  orgId: string;
  clientId?: string;
  projectId?: string;
  leadId?: string;
  baseUrl: string;
  documentType: 'INVOICE' | 'PROFORMA';
  invoiceType?: unknown;
  description?: string;
  termsOfSale?: string;
  paymentTerms?: string | null;
  totals: ReturnType<typeof calculateInvoiceItems>;
  automationKey?: string;
  source?: 'MANUAL' | 'PROJECT_INITIALIZATION' | 'ATLAS_AI' | 'PROPOSAL';
  buyerSnapshot?: InvoicePartySnapshot;
  recipient?: { name: string; email: string };
  invoiceNumber?: string;
  issuedDate?: Date;
  dueDate?: Date | null;
  referenceName?: string;
  sendEmail?: boolean;
}) {
  if (input.automationKey) {
    const existing = await prisma.invoice.findUnique({
      where: { automationKey: input.automationKey },
      include: { project: true, client: true, lead: true, organization: true },
    });
    if (existing) return existing;
  }
  const [organization, client, project, lead] = await Promise.all([
    prisma.organization.findUnique({ where: { id: input.orgId } }),
    input.clientId
      ? prisma.client.findFirst({
          where: { id: input.clientId, orgId: input.orgId },
          include: { contacts: { orderBy: { createdAt: 'asc' }, take: 1 } },
        })
      : Promise.resolve(null),
    input.projectId
      ? prisma.project.findFirst({
          where: {
            id: input.projectId,
            orgId: input.orgId,
            ...(input.clientId ? { clientId: input.clientId } : {}),
          },
        })
      : Promise.resolve(null),
    input.leadId
      ? prisma.agencyLead.findFirst({
          where: { id: input.leadId, orgId: input.orgId },
        })
      : Promise.resolve(null),
  ]);
  if (!organization) throw new InvoiceServiceError('Organization not found.', 404);
  if (input.clientId && !client) throw new InvoiceServiceError('Client not found.', 404);
  if (input.leadId && !lead) throw new InvoiceServiceError('Lead not found.', 404);
  if (!client && !input.buyerSnapshot) throw new InvoiceServiceError('Customer billing details are required.');
  if (input.projectId && !project) throw new InvoiceServiceError('Project not found.', 404);
  const recipient = lead
    ? { name: lead.fullName, email: lead.email }
    : input.recipient || client?.contacts[0] || null;
  if (input.sendEmail !== false && !recipient?.email) {
    throw new InvoiceServiceError('The client needs a primary contact email before this document can be sent.');
  }
  const missing = [
    ...missingBillingProfileFields(organization, { requireLegalName: true, label: 'agency' }),
    ...(!input.buyerSnapshot && client
      ? missingBillingProfileFields(client, { requireLegalName: false, label: 'client' })
      : []),
  ];
  if (missing.length) throw new InvoiceServiceError(`Invoice creation requires: ${missing.join(', ')}.`);

  const issuedDate = input.issuedDate || new Date();
  const monthlyInvoiceLimit = entitlementsFor(organization.plan).monthlyInvoiceLimit;
  if (monthlyInvoiceLimit !== null) {
    const monthStart = new Date(Date.UTC(issuedDate.getUTCFullYear(), issuedDate.getUTCMonth(), 1));
    const nextMonth = new Date(Date.UTC(issuedDate.getUTCFullYear(), issuedDate.getUTCMonth() + 1, 1));
    const issuedThisMonth = await prisma.invoice.count({
      where: { orgId: input.orgId, issuedDate: { gte: monthStart, lt: nextMonth } },
    });
    if (issuedThisMonth >= monthlyInvoiceLimit) {
      throw new InvoiceServiceError(planLimitMessage('monthly invoices', monthlyInvoiceLimit, organization.plan), 409);
    }
  }
  const dueDate = input.dueDate ?? (input.documentType === 'PROFORMA' ? null : invoiceDueDate(issuedDate));
  const seller: InvoicePartySnapshot = {
    ...billingSnapshot(organization, organization.billingEmail || ''),
    displayName: organization.legalEntityName || organization.name,
    logoDataUrl: organization.invoiceLogoDataUrl || '',
    brandColor: normalizeInvoiceBrandColor(organization.invoiceBrandColor),
  };
  const buyerBase = input.buyerSnapshot || billingSnapshot(client!, recipient?.email || '');
  const buyer = lead
    ? {
        ...buyerBase,
        name: lead.fullName,
        email: lead.email.toLowerCase(),
        phone: lead.phone || undefined,
      }
    : buyerBase;
  // documentType is the commercial distinction. Every payable document is a
  // tax invoice; proformas remain non-transactional quotations.
  const invoiceType = input.documentType === 'PROFORMA' ? 'STANDARD' : 'TAX';
  const invoiceNumber = input.invoiceNumber?.trim() || documentNumber(input.documentType);
  const duplicateNumber = await prisma.invoice.findFirst({
    where: { orgId: input.orgId, invoiceNumber },
    select: { id: true },
  });
  if (duplicateNumber) throw new InvoiceServiceError(`Document number ${invoiceNumber} is already in use.`);
  const description = input.description?.trim()
    || project?.serviceLine
    || project?.name
    || input.totals.lineItems[0].description;
  const createdInvoice = await prisma.invoice.create({
    data: {
      invoiceNumber,
      documentType: input.documentType,
      invoiceType,
      description,
      termsOfSale: input.termsOfSale?.trim() || null,
      subtotal: input.totals.subtotal,
      taxRate: input.totals.taxRate,
      taxAmount: input.totals.taxAmount,
      amount: input.totals.total,
      paidAmount: 0,
      dueDate,
      status: input.documentType === 'PROFORMA' ? 'PROFORMA' : 'UNPAID',
      source: input.source || 'MANUAL',
      sellerSnapshot: seller,
      buyerSnapshot: buyer,
      lineItems: input.totals.lineItems,
      emailRecipient: recipient?.email.toLowerCase() || null,
      deliveryStatus: 'PENDING',
      automationKey: input.automationKey,
      organization: { connect: { id: input.orgId } },
      ...(client ? { client: { connect: { id: client.id } } } : {}),
      ...(project ? { project: { connect: { id: project.id } } } : {}),
      ...(lead ? { lead: { connect: { id: lead.id } } } : {}),
      issuedDate,
    },
  });
  // Prisma's adapter-pg currently loads relations for a write through the same
  // transaction client. Hydrate in a separate read so pg never receives
  // overlapping client.query() calls.
  const invoice = await getCreatedInvoice(createdInvoice.id);

  const pdf = await invoicePdfFromRecord(invoice);
  if (input.sendEmail === false) {
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { pdfGeneratedAt: new Date() },
    });
    return getCreatedInvoice(invoice.id);
  }
  if (!recipient) {
    throw new InvoiceServiceError('The client needs a primary contact email before this document can be sent.');
  }
  const baseUrl = input.baseUrl.replace(/\/+$/, '');
  const downloadUrl = `${baseUrl}/api/invoices/${invoice.id}/pdf?token=${encodeURIComponent(invoice.downloadToken)}`;
  const referenceName = input.referenceName || project?.name || client?.name || lead?.fullName || buyer.legalEntityName;
  const email = invoiceDeliveryEmail({
    recipientName: recipient.name,
    organizationName: organization.legalEntityName || organization.name,
    invoiceNumber,
    projectName: referenceName,
    amount: formatInvoiceAmount(input.totals.total, organization.currency),
    dueDate: dueDate?.toLocaleDateString('en-US', { dateStyle: 'long', timeZone: 'UTC' }),
    downloadUrl,
    documentType: input.documentType,
  });

  try {
    await sendIrisEmail({
      to: [recipient.email],
      fromName: agencyViaIrisSenderName(organization.name, organization.plan),
      subject: email.subject,
      html: email.html,
      text: email.text,
      idempotencyKey: `invoice-${invoice.id}`,
      tags: [{ name: 'category', value: input.documentType === 'PROFORMA' ? 'proforma_invoice' : 'project_invoice' }],
      attachments: [{
        filename: `${invoice.invoiceNumber}.pdf`,
        content: pdf,
        contentType: 'application/pdf',
      }],
    });
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        deliveryStatus: 'SENT',
        deliveryError: null,
        sentAt: new Date(),
        pdfGeneratedAt: new Date(),
      },
    });
    return getCreatedInvoice(invoice.id);
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
        `${input.documentType === 'PROFORMA' ? 'Proforma invoice' : 'Invoice'} ${invoice.invoiceNumber} was created, but email delivery failed: ${error.message}`,
        error.status,
        invoice.id,
      );
    }
    throw error;
  }
}

export async function createAndSendProjectInvoice(input: {
  projectId: string;
  orgId: string;
  baseUrl: string;
  description?: string;
  invoiceType?: unknown;
  itemCount?: number;
  termsOfSale?: string;
  lineItems?: InvoiceLineItemInput[];
  taxRate?: number;
  automationKey?: string;
  source?: 'MANUAL' | 'PROJECT_INITIALIZATION' | 'ATLAS_AI';
  issuedDate?: Date;
  sendEmail?: boolean;
}) {
  const project = await prisma.project.findFirst({
    where: { id: input.projectId, orgId: input.orgId },
    include: {
      organization: true,
      tasks: { orderBy: { createdAt: 'asc' }, select: { title: true } },
    },
  });
  if (!project) throw new InvoiceServiceError('Project not found.', 404);
  let totals: ReturnType<typeof calculateInvoiceItems>;
  try {
    if (input.lineItems) {
      totals = input.taxRate === undefined
        ? calculateInvoiceItems(input.lineItems)
        : calculateInvoiceItemsWithOverallTax(input.lineItems, input.taxRate);
    } else {
      const configuredAmount = roundMoney(project.paymentAmount ?? 0);
      if (!Number.isFinite(configuredAmount) || configuredAmount <= 0) {
        throw new Error('The project needs a positive client payment amount before invoicing.');
      }
      const taxRate = 18;
      const itemCount = Math.max(1, Math.min(MAX_INVOICE_ITEMS, project.tasks.length || 1));
      totals = allocateProjectValue({
        deliverables: project.tasks.map((task) => task.title),
        itemCount,
        subtotal: configuredAmount,
        taxRate,
        fallbackDescription: input.description?.trim() || project.serviceLine || project.name,
      });
    }
  } catch (error) {
    throw new InvoiceServiceError(error instanceof Error ? error.message : 'Invoice items are invalid.');
  }
  const termsOfSale = input.termsOfSale?.trim() || project.paymentTerms?.trim() || undefined;
  return createAndSendDocument({
    orgId: input.orgId,
    clientId: project.clientId,
    projectId: project.id,
    baseUrl: input.baseUrl,
    documentType: 'INVOICE',
    invoiceType: input.invoiceType,
    description: input.description,
    termsOfSale,
    issuedDate: input.issuedDate,
    dueDate: invoiceDueDate(input.issuedDate || new Date()),
    totals,
    automationKey: input.automationKey,
    source: input.source,
    sendEmail: input.sendEmail,
  });
}

export async function createHistoricalProjectInvoices(input: {
  projectId: string;
  orgId: string;
  baseUrl: string;
  through?: Date;
}) {
  const project = await prisma.project.findFirst({
    where: { id: input.projectId, orgId: input.orgId },
    select: {
      id: true,
      clientId: true,
      name: true,
      paymentType: true,
      paymentAmount: true,
      paymentFrequency: true,
      paymentStartDate: true,
    },
  });
  if (!project) throw new InvoiceServiceError('Project not found.', 404);
  if (project.paymentType !== 'RETAINER' || !project.paymentStartDate || !project.paymentFrequency || !project.paymentAmount) return [];

  const today = input.through || new Date();
  const startOfToday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const strictlyBeforeToday = new Date(startOfToday.getTime() - 1);
  const occurrences = generateRecurringOccurrences(
    project.paymentStartDate,
    project.paymentAmount,
    project.paymentFrequency,
    strictlyBeforeToday,
  );
  const invoices = [];
  for (const occurrence of occurrences) {
    const dateKey = occurrence.date.toISOString().slice(0, 10);
    const invoice = await createAndSendProjectInvoice({
      projectId: project.id,
      orgId: input.orgId,
      baseUrl: input.baseUrl,
      automationKey: `project-history:${project.id}:${dateKey}`,
      source: 'PROJECT_INITIALIZATION',
      issuedDate: occurrence.date,
      sendEmail: false,
    });
    const existingRevenue = await prisma.transaction.findFirst({
      where: { orgId: input.orgId, invoiceId: invoice.id, category: 'Revenue' },
      select: { id: true },
    });
    if (!existingRevenue) {
      await prisma.$transaction([
        prisma.invoice.update({
          where: { id: invoice.id },
          data: { paidAmount: invoice.amount, status: 'FULLY_PAID' },
        }),
        prisma.transaction.create({
          data: {
            orgId: input.orgId,
            clientId: project.clientId,
            invoiceId: invoice.id,
            date: occurrence.date,
            details: `Historical retainer revenue: ${project.name}`,
            category: 'Revenue',
            type: 'Others',
            transactorAccount: project.name,
            yourAccount: 'Historical revenue',
            amount: invoice.amount,
            referenceNumber: invoice.invoiceNumber,
            comments: 'Automatically logged from historical project MRR.',
          },
        }),
      ]);
    }
    invoices.push(invoice);
  }
  return invoices;
}

export async function createAndSendProformaInvoice(input: {
  clientId?: string;
  leadId?: string;
  orgId: string;
  baseUrl: string;
  invoiceType?: unknown;
  description?: string;
  termsOfSale?: string;
  lineItems: InvoiceLineItemInput[];
  automationKey?: string;
  source?: 'MANUAL' | 'ATLAS_AI' | 'PROPOSAL';
  taxRate?: number;
  buyerSnapshot?: InvoicePartySnapshot;
  recipient?: { name: string; email: string };
  invoiceNumber?: string;
  issuedDate?: Date;
  validUntil?: Date;
  referenceName?: string;
  sendEmail?: boolean;
}) {
  let totals: ReturnType<typeof calculateInvoiceItems>;
  try {
    totals = input.taxRate === undefined
      ? calculateInvoiceItems(input.lineItems)
      : calculateInvoiceItemsWithOverallTax(input.lineItems, input.taxRate);
  } catch (error) {
    throw new InvoiceServiceError(error instanceof Error ? error.message : 'Proforma items are invalid.');
  }
  return createAndSendDocument({
    orgId: input.orgId,
    clientId: input.clientId,
    leadId: input.leadId,
    baseUrl: input.baseUrl,
    documentType: 'PROFORMA',
    invoiceType: input.invoiceType,
    description: input.description,
    termsOfSale: input.termsOfSale,
    totals,
    automationKey: input.automationKey,
    source: input.source,
    buyerSnapshot: input.buyerSnapshot,
    recipient: input.recipient,
    invoiceNumber: input.invoiceNumber,
    issuedDate: input.issuedDate,
    dueDate: input.validUntil,
    referenceName: input.referenceName,
    sendEmail: input.sendEmail,
  });
}

// Retained for callers and tests that expect the legacy inclusive GST helper.
export { inclusiveGstBreakdown };
