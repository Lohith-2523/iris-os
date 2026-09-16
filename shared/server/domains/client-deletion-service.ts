import type { Prisma } from '@prisma/client';
import { purgeWorkspaceUsers } from './member-deletion-service';

export async function purgeClientData(
  tx: Prisma.TransactionClient,
  orgId: string,
  clientId: string,
) {
  const client = await tx.client.findFirst({
    where: { id: clientId, orgId },
    select: {
      id: true,
      sourceLeadId: true,
      users: { select: { id: true, authUserId: true, email: true } },
      invites: { select: { email: true } },
    },
  });
  if (!client) return null;

  const linkedUserIds = new Set(client.users.map(({ id }) => id));
  const invitedEmails = client.invites.map(({ email }) => email.trim().toLowerCase());
  const orphanedInviteUsers = invitedEmails.length === 0
    ? []
    : await tx.user.findMany({
        where: {
          orgId,
          role: { equals: 'client', mode: 'insensitive' },
          clientId: null,
          email: { in: invitedEmails, mode: 'insensitive' },
        },
        select: { id: true, authUserId: true, email: true },
      });
  const clientUsers = [
    ...client.users,
    ...orphanedInviteUsers.filter(({ id }) => !linkedUserIds.has(id)),
  ];

  await purgeWorkspaceUsers(tx, orgId, clientUsers);

  const documentRelations = [
    { recipientType: 'CLIENT', recipientId: client.id },
    { onboardedClientId: client.id },
    ...(client.sourceLeadId
      ? [{ recipientType: 'LEAD', recipientId: client.sourceLeadId }]
      : []),
  ];
  await tx.generatedDocument.deleteMany({ where: { orgId, OR: documentRelations } });
  await tx.transaction.deleteMany({ where: { orgId, clientId: client.id } });
  await tx.invoice.deleteMany({ where: { orgId, clientId: client.id } });
  await tx.client.delete({ where: { id: client.id } });
  if (client.sourceLeadId) {
    await tx.agencyLead.deleteMany({ where: { id: client.sourceLeadId, orgId } });
  }

  return clientUsers;
}

