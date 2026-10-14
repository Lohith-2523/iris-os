import { NextRequest } from 'next/server';
import { getRequestUser, isOrganizationAdmin } from '@/lib/org';
import { prisma } from '@/lib/db';
import {
  getInvoiceForPdf,
  invoicePdfInputFromRecord,
  invoicePdfFromRecord,
  InvoiceServiceError,
} from '@/lib/invoices/service';
import { artifactSourceVersion, readRenderedArtifact, writeRenderedArtifact } from '@/lib/documents/rendered-artifact';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const invoice = await getInvoiceForPdf(id);
    if (!invoice) return Response.json({ error: 'Invoice not found' }, { status: 404 });

    const token = request.nextUrl.searchParams.get('token');
    let authorized = Boolean(token && token === invoice.downloadToken);
    if (!authorized) {
      const user = await getRequestUser(request);
      authorized = Boolean(
        user
        && user.orgId === invoice.orgId
        && (
          isOrganizationAdmin(user)
          || (user.role.toLowerCase() === 'client' && user.clientId === invoice.clientId)
        ),
      );
    }
    if (!authorized) return Response.json({ error: 'Oops! Please sign in to continue.' }, { status: 401 });

    const artifactKey = {
      orgId: invoice.orgId,
      sourceType: 'INVOICE' as const,
      sourceId: invoice.id,
      format: 'PDF' as const,
      sourceVersion: artifactSourceVersion(invoicePdfInputFromRecord(invoice)),
    };
    let pdf = await readRenderedArtifact(artifactKey);
    if (!pdf) {
      pdf = await invoicePdfFromRecord(invoice);
      await Promise.all([
        writeRenderedArtifact(artifactKey, pdf),
        prisma.invoice.update({ where: { id: invoice.id }, data: { pdfGeneratedAt: new Date() } }),
      ]);
    }
    const filename = `${invoice.invoiceNumber.replace(/[^A-Za-z0-9._-]/g, '_')}.pdf`;
    return new Response(new Uint8Array(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(pdf.length),
        'Cache-Control': 'private, no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    if (error instanceof InvoiceServiceError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.error('Unable to render invoice PDF:', error);
    return Response.json({ error: 'Unable to render invoice PDF.' }, { status: 500 });
  }
}
