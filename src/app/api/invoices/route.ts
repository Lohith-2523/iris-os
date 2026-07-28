import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getRequestUser, isOrganizationAdmin } from '@/lib/org';
import {
  createAndSendProjectInvoice,
  InvoiceServiceError,
} from '@/lib/invoices/service';
import { publicAppUrl } from '@/lib/app-url';

export const runtime = 'nodejs';

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
        ...(outstanding ? { status: { in: ['UNPAID', 'PARTIALLY_PAID'] } } : {}),
      },
      include: {
        client: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
      orderBy: [{ issuedDate: 'desc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json(invoices.map((invoice) => ({
      ...invoice,
      balanceDue: Math.max(0, invoice.amount - invoice.paidAmount),
      downloadUrl: `/api/invoices/${invoice.id}/pdf`,
    })));
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
    const projectId = typeof body.projectId === 'string' ? body.projectId.trim() : '';
    if (!projectId) {
      return NextResponse.json({ error: 'A project is required for every invoice.' }, { status: 400 });
    }
    const invoice = await createAndSendProjectInvoice({
      projectId,
      orgId: user.orgId,
      baseUrl: publicAppUrl(request),
      description: typeof body.description === 'string' ? body.description : undefined,
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
