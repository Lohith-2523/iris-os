import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getRequestUser } from '@/lib/org';
import { createLeadExportWorkbook, parseLeadExportRequest } from '@/lib/lead-archive';

export async function GET(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const range = parseLeadExportRequest(
    request.nextUrl.searchParams.get('from'),
    request.nextUrl.searchParams.get('to'),
    request.nextUrl.searchParams.get('all') === 'true',
  );
  if ('error' in range) return NextResponse.json({ error: range.error }, { status: 400 });

  try {
    const leads = await prisma.agencyLead.findMany({
      where: {
        orgId: user.orgId,
        createdTime: {
          ...(range.start ? { gte: range.start } : {}),
          lt: range.endExclusive,
        },
      },
      orderBy: { createdTime: 'desc' },
      include: { convertedClient: { select: { name: true } } },
    });
    const workbook = await createLeadExportWorkbook(leads);
    const filename = `crystalos-leads-${range.from}-to-${range.to}.xlsx`;

    return new NextResponse(new Uint8Array(workbook), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    console.error('Unable to export agency leads:', error);
    return NextResponse.json({ error: 'Unable to export leads.' }, { status: 500 });
  }
}
