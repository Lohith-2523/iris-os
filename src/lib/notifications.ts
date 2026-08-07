import { prisma } from '@/lib/db';

export type NotificationInput = {
  orgId: string;
  userId?: string | null;
  type: 'UPDATE' | 'APPROVAL' | 'MESSAGE' | 'DELAY' | 'REMINDER' | 'ISSUE';
  title: string;
  body: string;
  href?: string | null;
  actionLabel?: string | null;
  scheduledAt?: Date | null;
};

export async function createNotification(input: NotificationInput) {
  return prisma.notification.create({
    data: {
      ...input,
      userId: input.userId || null,
      href: input.href || null,
      actionLabel: input.actionLabel || null,
      scheduledAt: input.scheduledAt || null,
    },
  });
}

export async function notifyOrganizationAdmins(input: Omit<NotificationInput, 'userId'>) {
  const admins = await prisma.user.findMany({
    where: { orgId: input.orgId, role: { in: ['admin', 'sub_admin'] }, accessRevokedAt: null },
    select: { id: true },
  });
  if (!admins.length) return [];
  return prisma.notification.createMany({
    data: admins.map((admin) => ({ ...input, userId: admin.id })),
  });
}
