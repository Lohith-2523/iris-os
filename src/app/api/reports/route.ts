import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getRequestUser } from '@/lib/org';
import { buildAtlasReportDocument } from '@/lib/reports/data';
import { REPORT_KINDS, parseAtlasReportDocument } from '@/lib/reports/types';
import { cursorHeaders, descendingCursorWhere, finishCursorPage, readCursorPage } from '@/lib/cursor-pagination';

const createSchema = z.object({
  title: z.string().trim().min(2).max(200),
  type: z.enum(['FINANCIAL', 'MARKETING', 'FINANCE', 'CLIENT', 'OPERATIONS', 'CREATIVE']),
  content: z.string().max(200_000),
});

const generateSchema = z.object({
  action: z.literal('generate'),
  kind: z.enum(REPORT_KINDS),
  clientId: z.string().uuid().optional(),
});

export async function GET(request: Request) {
  const user = await getRequestUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const pageRequest = readCursorPage(request);
  const reports = await prisma.report.findMany({
    where: { orgId: user.orgId, ...descendingCursorWhere(pageRequest.cursor, 'createdAt') },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: pageRequest.take,
    select: { id: true, title: true, type: true, status: true, summary: true, createdAt: true, createdBy: { select: { name: true } } },
  });
  const page = finishCursorPage(reports, pageRequest.limit, (report) => report.createdAt);
  return NextResponse.json(page.items.map((report) => {
    const document = parseAtlasReportDocument(report.summary);
    return {
    id: report.id,
    title: report.title,
    type: report.type,
    status: report.status,
    client: document?.clientName || 'Agency-wide',
    author: report.createdBy.name,
    pageCount: document ? 3 : null,
    pdfUrl: `/api/reports/${report.id}/pdf`,
    date: report.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
  }; }), { headers: cursorHeaders(page, pageRequest.limit) });
}

export async function POST(request: Request) {
  const user = await getRequestUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role === 'client') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await request.json();
  const generation = generateSchema.safeParse(body);
  if (generation.success) {
    if (!user.organization.aiSharingConsent) {
      return NextResponse.json({ error: 'Enable Miles AI Analysis in Settings before generating reports from workspace data.' }, { status: 403 });
    }
    if (generation.data.kind === 'MARKETING' && (!user.organization.metaAccessConsent || !user.organization.atlasMetaAnalyticsConsent)) {
      return NextResponse.json({ error: 'Marketing reports require both Meta access consent and Miles Meta analytics consent.' }, { status: 403 });
    }
    try {
      const document = await buildAtlasReportDocument(user.orgId, user.id, user.role, generation.data.kind, generation.data.clientId);
      const report = await prisma.report.create({
        data: {
          title: document.title,
          type: document.kind,
          status: 'READY',
          summary: JSON.stringify(document),
          filePath: 'DYNAMIC_PDF_V1',
          createdById: user.id,
          orgId: user.orgId,
        },
      });
      return NextResponse.json({
        id: report.id,
        title: report.title,
        type: report.type,
        status: report.status,
        client: document.clientName || 'Agency-wide',
        author: user.name,
        pageCount: 3,
        pdfUrl: `/api/reports/${report.id}/pdf`,
        date: report.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      }, { status: 201 });
    } catch (error) {
      console.error('Unable to generate Miles report:', error);
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to generate report.' }, { status: 500 });
    }
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid report' }, { status: 400 });
  const report = await prisma.report.create({
    data: {
      title: parsed.data.title,
      type: parsed.data.type,
      status: 'READY',
      summary: parsed.data.content,
      createdById: user.id,
      orgId: user.orgId,
    },
  });
  return NextResponse.json(report, { status: 201 });
}
