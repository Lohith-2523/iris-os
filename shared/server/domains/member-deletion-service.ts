import type { Prisma } from '@prisma/client';

type WorkspaceUserIdentity = {
  id: string;
  authUserId: string | null;
  email: string;
};

export async function purgeWorkspaceUsers(
  tx: Prisma.TransactionClient,
  orgId: string,
  users: WorkspaceUserIdentity[],
) {
  if (users.length === 0) return;

  const userIds = users.map(({ id }) => id);
  const emails = users.map(({ email }) => email.trim().toLowerCase());

  // Removing a direct-message participant removes the whole thread so neither
  // side retains messages or attachment history involving the removed account.
  await tx.messagingConversation.deleteMany({
    where: {
      orgId,
      OR: [
        { createdById: { in: userIds } },
        { members: { some: { userId: { in: userIds } } } },
      ],
    },
  });

  await tx.askAtlasMessage.deleteMany({ where: { orgId, userId: { in: userIds } } });
  await tx.atlasChatSession.deleteMany({ where: { orgId, userId: { in: userIds } } });

  await tx.generatedDocument.deleteMany({ where: { orgId, createdById: { in: userIds } } });
  await tx.generatedDocument.updateMany({
    where: { orgId, approvedById: { in: userIds } },
    data: {
      approvedById: null,
      approvedByName: null,
    },
  });
  await tx.generatedDocument.updateMany({
    where: { orgId, agencySignedById: { in: userIds } },
    data: {
      agencySignedById: null,
      agencySignerName: null,
    },
  });

  await tx.automationRun.deleteMany({ where: { automation: { orgId, createdById: { in: userIds } } } });
  await tx.automation.deleteMany({ where: { orgId, createdById: { in: userIds } } });
  await tx.report.deleteMany({ where: { orgId, createdById: { in: userIds } } });
  await tx.strategy.deleteMany({ where: { orgId, createdById: { in: userIds } } });
  await tx.deliverable.deleteMany({ where: { orgId, submittedById: { in: userIds } } });
  await tx.changeRequest.deleteMany({ where: { orgId, requestedById: { in: userIds } } });
  await tx.clientTask.deleteMany({ where: { assignedToId: { in: userIds }, client: { orgId } } });

  await tx.projectMember.deleteMany({ where: { userId: { in: userIds }, project: { orgId } } });
  await tx.taskComment.deleteMany({ where: { userId: { in: userIds } } });
  await tx.calendarEvent.deleteMany({ where: { orgId, creatorId: { in: userIds } } });
  await tx.notification.deleteMany({ where: { orgId, userId: { in: userIds } } });
  await tx.googleCalendarConnection.deleteMany({ where: { orgId, userId: { in: userIds } } });
  await tx.messagingDevice.deleteMany({ where: { orgId, userId: { in: userIds } } });

  await tx.memberInvite.deleteMany({ where: { orgId, email: { in: emails } } });
  await tx.waitlistEntry.deleteMany({ where: { email: { in: emails, mode: 'insensitive' } } });
  await tx.user.deleteMany({ where: { orgId, id: { in: userIds } } });
}
