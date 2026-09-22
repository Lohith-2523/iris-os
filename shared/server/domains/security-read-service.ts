import 'server-only';

import { cache } from 'react';
import { prisma } from '@/lib/db';
import { SECURITY_ALLOWED_PAGES } from '@/lib/security-pages';
import type { RequestSecurityContext } from '@/server/security/request-security-context';

export const getSecurityUsersReadModel = cache(async (ctx: RequestSecurityContext) => {
  const users = await prisma.user.findMany({
    where: { orgId: ctx.orgId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      accessPermissions: true,
      handlesDeliverables: true,
      accessRevokedAt: true,
    },
    orderBy: [{ accessRevokedAt: 'asc' }, { role: 'asc' }, { name: 'asc' }],
  });
  return {
    users: users.map((user) => ({
      ...user,
      accessRevokedAt: user.accessRevokedAt?.toISOString() || null,
      accessPermissions: user.accessPermissions as string[] | null,
    })),
    plan: ctx.organization.plan,
    allowedPages: [...SECURITY_ALLOWED_PAGES],
  };
});

export type SecurityUsersReadModel = Awaited<ReturnType<typeof getSecurityUsersReadModel>>;
