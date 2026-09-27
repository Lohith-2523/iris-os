import 'server-only';

import { prisma } from '@/lib/db';
import { getDeliveryDelaySummary } from '@/lib/delivery-delays';
import { descendingCursorWhere, finishCursorPage, type CursorPageRequest } from '@/lib/cursor-pagination';
import type { RequestSecurityContext } from '@/server/security/request-security-context';

const projectInclude = {
  client: true,
  members: { take: 100, include: { user: true } },
  tasks: {
    take: 100,
    orderBy: { createdAt: 'desc' as const },
    include: { assignedTo: true, stage: true },
  },
  milestones: { take: 100, orderBy: { createdAt: 'desc' as const } },
  allocations: { take: 100 },
  stages: { take: 100, orderBy: { position: 'asc' as const } },
  invoices: { take: 50, orderBy: { issuedDate: 'desc' as const } },
  deliverables: {
    take: 50,
    include: { task: { select: { id: true, title: true, stage: { select: { id: true, name: true } } } } },
    orderBy: { createdAt: 'desc' as const },
  },
  changeRequests: { take: 50, orderBy: { createdAt: 'desc' as const } },
} as const;

export async function listProjects(
  ctx: RequestSecurityContext,
  pageRequest: CursorPageRequest,
  clientId?: string | null,
) {
  const projects = await prisma.project.findMany({
    where: {
      orgId: ctx.orgId,
      ...descendingCursorWhere(pageRequest.cursor, 'createdAt'),
      ...(ctx.role.toLowerCase() === 'client' && ctx.clientId ? { clientId: ctx.clientId } : {}),
      ...(clientId ? { clientId } : {}),
    },
    include: projectInclude,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: pageRequest.take,
  });

  const page = finishCursorPage(projects, pageRequest.limit, (project) => project.createdAt);
  return {
    ...page,
    items: page.items.map((project) => {
      const delays = getDeliveryDelaySummary(project);
      return {
        ...project,
        deliveryDelays: {
          stages: delays.delayedStages.map((stage) => ({ id: stage.id, name: stage.name })),
          tasks: delays.delayedTasks.map((task) => ({ title: task.title, deadline: task.deadline, stageId: task.stageId })),
          total: delays.total,
        },
      };
    }),
  };
}
