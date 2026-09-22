import 'server-only';

import { cache } from 'react';
import { prisma } from '@/lib/db';
import { parseAtlasReportDocument } from '@/lib/reports/types';
import type { RequestSecurityContext } from '@/server/security/request-security-context';
import { listWorkspaceClients } from '@/server/domains/workspace-directory-service';

export const getReportingInitialReadModel = cache(async (ctx: RequestSecurityContext) => {
  const [reports, clients] = await Promise.all([
    prisma.report.findMany({
      where: { orgId: ctx.orgId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 50,
      select: {
        id: true,
        title: true,
        type: true,
        status: true,
        summary: true,
        createdAt: true,
        createdBy: { select: { name: true } },
      },
    }),
    listWorkspaceClients(ctx),
  ]);

  return {
    reports: reports.map((report) => {
      const document = parseAtlasReportDocument(report.summary);
      return {
        id: report.id,
        title: report.title,
        type: report.type,
        status: report.status,
        client: document?.clientName || 'Agency-wide',
        author: report.createdBy.name,
        pageCount: document ? 3 : null,
        pdfUrl: document ? `/api/reports/${report.id}/pdf` : null,
        date: report.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      };
    }),
    clients: clients.map((client) => ({ id: client.id, name: client.name })),
  };
});

export type ReportingInitialReadModel = Awaited<ReturnType<typeof getReportingInitialReadModel>>;
