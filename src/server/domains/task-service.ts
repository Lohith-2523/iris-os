import 'server-only';

import { prisma } from '@/lib/db';
import { descendingCursorWhere, finishCursorPage, type CursorPageRequest } from '@/lib/cursor-pagination';
import type { RequestSecurityContext } from '@/server/security/request-security-context';

const taskInclude = {
  assignedTo: true,
  client: true,
  project: true,
  stage: true,
  updates: { take: 25, orderBy: { createdAt: 'desc' as const } },
  comments: {
    take: 25,
    include: { user: true },
    orderBy: { createdAt: 'desc' as const },
  },
  parentTask: true,
  nextTasks: { take: 25 },
  deliverables: { take: 25, orderBy: { createdAt: 'desc' as const } },
} as const;

export async function listTasks(
  ctx: RequestSecurityContext,
  pageRequest: CursorPageRequest,
  filters: { clientId?: string | null; assignedToId?: string | null; projectId?: string | null } = {},
) {
  const role = ctx.role.toLowerCase();
  const tasks = await prisma.clientTask.findMany({
    where: {
      client: { orgId: ctx.orgId },
      ...(role === 'client' && ctx.clientId ? { clientId: ctx.clientId } : {}),
      ...(role === 'member' || (role === 'sub_admin' && ctx.deliveryWorkspace) ? { assignedToId: ctx.userId } : {}),
      ...(filters.projectId ? { projectId: filters.projectId } : {}),
      ...(filters.clientId ? { clientId: filters.clientId } : {}),
      ...(filters.assignedToId ? { assignedToId: filters.assignedToId } : {}),
      ...descendingCursorWhere(pageRequest.cursor, 'createdAt'),
    },
    include: taskInclude,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: pageRequest.take,
  });

  return finishCursorPage(tasks, pageRequest.limit, (task) => task.createdAt);
}
