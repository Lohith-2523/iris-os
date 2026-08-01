import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getRequestUser, isOrganizationAdmin } from '@/lib/org';
import {
  createAndSendProjectInvoice,
  createAndSendProformaInvoice,
  InvoiceServiceError,
} from '@/lib/invoices/service';
import { publicAppUrl } from '@/lib/app-url';
import { z } from 'zod';

export const runtime = 'nodejs';

const lineItemSchema = z.object({
  description: z.string().trim().min(1).max(300),
  quantity: z.coerce.number().positive().max(1_000_000),
  unitPrice: z.coerce.number().min(0).max(1_000_000_000),
});
const projectInvoiceSchema = z.object({
  mode: z.literal('PROJECT'),
  projectId: z.string().trim().min(1),
  description: z.string().trim().max(2_000).optional(),
  termsOfSale: z.string().trim().max(4_000).optional(),
});
const detailedInvoiceSchema = z.object({
  mode: z.literal('DETAILED'),
  projectId: z.string().trim().min(1),
  description: z.string().trim().max(2_000).optional(),
  termsOfSale: z.string().trim().max(4_000).optional(),
  taxRate: z.coerce.number().min(0).max(40).default(18),
  lineItems: z.array(lineItemSchema).min(1).max(8),
});
const proformaInvoiceSchema = z.object({
  mode: z.literal('PROFORMA'),
  leadId: z.string().trim().min(1),
  invoiceNumber: z.string().trim().min(2).max(80),
  issuedDate: z.string().date(),
  validUntil: z.union([z.string().date(), z.literal('')]).optional().transform((value) => value || undefined),
  referenceName: z.string().trim().min(2).max(200),
  customerName: z.string().trim().min(2).max(200),
  customerLegalName: z.string().trim().max(200).optional(),
  customerEmail: z.string().trim().email().max(320),
  customerAddressLine1: z.string().trim().min(2).max(300),
  customerAddressLine2: z.string().trim().max(300).optional(),
  customerCity: z.string().trim().min(1).max(120),
  customerState: z.string().trim().min(1).max(120),
  customerPostalCode: z.string().trim().min(1).max(40),
  customerCountry: z.string().trim().min(1).max(120),
  customerGstNumber: z.string().trim().max(80).optional(),
  description: z.string().trim().min(2).max(2_000),
  termsOfSale: z.string().trim().max(4_000).optional(),
  taxRate: z.coerce.number().min(0).max(40).default(18),
  lineItems: z.array(lineItemSchema).min(1).max(8),
});
const createInvoiceSchema = z.discriminatedUnion('mode', [
  projectInvoiceSchema,
  detailedInvoiceSchema,
  proformaInvoiceSchema,
]);

export async function GET(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const isClient = user.role.toLowerCase() === 'client';
    if (!isOrganizationAdmin(user) && !isClient) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (isClient && !user.clientId) {
      return NextResponse.json({ error: 'Client account is not linked.' }, { status: 403 });
    }
    const { searchParams } = request.nextUrl;
    const clientId = searchParams.get('clientId')?.trim();
    const projectId = searchParams.get('projectId')?.trim();
    const outstanding = searchParams.get('outstanding') === 'true';

    const invoices = await prisma.invoice.findMany({
      where: {
        orgId: user.orgId,
        ...(isClient && user.clientId
          ? { clientId: user.clientId }
          : {}),
        ...(clientId ? { clientId } : {}),
        ...(projectId ? { projectId } : {}),
        ...(outstanding
          ? { documentType: 'INVOICE', status: { in: ['UNPAID', 'PARTIALLY_PAID'] } }
          : {}),
      },
      include: {
        client: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
        lead: { select: { id: true, fullName: true, email: true, phone: true } },
      },
      orderBy: [{ issuedDate: 'desc' }, { createdAt: 'desc' }],
    });

    const responseInvoices = invoices.map((invoice) => ({
      ...invoice,
      balanceDue: invoice.documentType === 'PROFORMA' ? 0 : Math.max(0, invoice.amount - invoice.paidAmount),
      downloadUrl: `/api/invoices/${invoice.id}/pdf`,
    }));
    if (outstanding) {
      responseInvoices.sort((left, right) => right.balanceDue - left.balanceDue);
    }
    return NextResponse.json(responseInvoices);
  } catch (error) {
    console.error('Unable to list invoices:', error);
    return NextResponse.json({ error: 'Unable to load invoices.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isOrganizationAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const body = await request.json();
    const parsed = createInvoiceSchema.safeParse({
      ...body,
      mode: body.mode || 'PROJECT',
    });
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invoice details are invalid.' }, { status: 400 });
    }
    const baseUrl = publicAppUrl(request);
    const invoice = parsed.data.mode === 'PROFORMA'
      ? await (() => {
          const issuedDate = new Date(`${parsed.data.issuedDate}T00:00:00.000Z`);
          const validUntil = parsed.data.validUntil
            ? new Date(`${parsed.data.validUntil}T00:00:00.000Z`)
            : undefined;
          if (validUntil && validUntil < issuedDate) {
            throw new InvoiceServiceError('The proforma valid-until date cannot be before its issue date.');
          }
          return createAndSendProformaInvoice({
          orgId: user.orgId,
          leadId: parsed.data.leadId,
          baseUrl,
          description: parsed.data.description,
          termsOfSale: parsed.data.termsOfSale,
          lineItems: parsed.data.lineItems,
          taxRate: parsed.data.taxRate,
          invoiceNumber: parsed.data.invoiceNumber,
          issuedDate,
          validUntil,
          referenceName: parsed.data.referenceName,
          recipient: {
            name: parsed.data.customerName,
            email: parsed.data.customerEmail,
          },
          buyerSnapshot: {
            name: parsed.data.customerName,
            legalEntityName: parsed.data.customerLegalName || parsed.data.customerName,
            email: parsed.data.customerEmail.toLowerCase(),
            addressLine1: parsed.data.customerAddressLine1,
            addressLine2: parsed.data.customerAddressLine2 || '',
            city: parsed.data.customerCity,
            state: parsed.data.customerState,
            postalCode: parsed.data.customerPostalCode,
            country: parsed.data.customerCountry,
            gstNumber: parsed.data.customerGstNumber?.toUpperCase() || '',
          },
          source: 'MANUAL',
          });
        })()
      : await createAndSendProjectInvoice({
          projectId: parsed.data.projectId,
          orgId: user.orgId,
          baseUrl,
          invoiceType: 'TAX',
          description: parsed.data.description,
          termsOfSale: parsed.data.termsOfSale,
          lineItems: parsed.data.mode === 'DETAILED' ? parsed.data.lineItems : undefined,
          taxRate: parsed.data.mode === 'DETAILED' ? parsed.data.taxRate : undefined,
          source: 'MANUAL',
        });
    return NextResponse.json({ success: true, invoice }, { status: 201 });
  } catch (error) {
    if (error instanceof InvoiceServiceError) {
      return NextResponse.json({
        error: error.message,
        invoiceId: error.invoiceId,
      }, { status: error.status });
    }
    console.error('Unable to create invoice:', error);
    return NextResponse.json({ error: 'Unable to create the invoice.' }, { status: 500 });
  }
}
