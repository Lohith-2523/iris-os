import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getRequestUser } from '@/lib/org';
import { parseAtlasReportDocument } from '@/lib/reports/types';
import { generateAtlasReportPdf, generateMilesTextReportPdf } from '@/lib/reports/pdf';

export const runtime = 'nodejs';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getRequestUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role === 'client') return Response.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  const report = await prisma.report.findFirst({
    where: { id, orgId: user.orgId },
    include: { organization: { select: { name: true, legalEntityName: true, invoiceBrandColor: true, invoiceLogoDataUrl: true } } },
  });
  if (!report) return Response.json({ error: 'Report not found' }, { status: 404 });
  const document = parseAtlasReportDocument(report.summary);
  const brand = {
    name: report.organization.legalEntityName || report.organization.name,
    color: report.organization.invoiceBrandColor,
    logoDataUrl: report.organization.invoiceLogoDataUrl,
  };
  const pdf = document
    ? await generateAtlasReportPdf(document, brand)
    : await generateMilesTextReportPdf({
        content: report.summary,
        createdAt: report.createdAt,
        title: report.title,
        type: report.type,
      }, brand);
  const filename = `${report.title.replace(/[^A-Za-z0-9._-]/g, '_')}.pdf`;
  const inline = request.nextUrl.searchParams.get('view') === '1';
  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="${filename}"`,
      'Content-Length': String(pdf.length),
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
