import 'server-only';

import { prisma } from '@/lib/db';
import { withDatabaseConnectionRetry } from '@/lib/database-resilience';
import type { MessagingLimits } from '@/lib/plan-entitlements';
import type { SafeAttachmentCategory } from '@/lib/file-security';

type MessagingInboxContext = {
  userId: string;
  orgId: string;
  role: string;
  limits: MessagingLimits | null;
};

const retryOptions = { maxAttempts: 3, delaysMs: [150, 500] } as const;

export async function getMessagingInbox(ctx: MessagingInboxContext) {
  const eligibleRoles = ctx.role.toLowerCase() === 'admin' ? ['client', 'member'] : ['admin'];

  // Keep each stage within the two-connection application pool. Starting both
  // relation-heavy reads together can starve other Server Components.
  const directory = await withDatabaseConnectionRetry(() => prisma.user.findMany({
    where: { orgId: ctx.orgId, id: { not: ctx.userId }, role: { in: eligibleRoles } },
    select: { id: true, name: true, email: true, role: true, avatarUrl: true },
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
  }), retryOptions);

  const conversations = await withDatabaseConnectionRetry(() => prisma.messagingConversation.findMany({
    where: { orgId: ctx.orgId, members: { some: { userId: ctx.userId } } },
    select: {
      id: true,
      updatedAt: true,
      members: {
        where: { userId: { not: ctx.userId } },
        select: { user: { select: { id: true, name: true, email: true, role: true, avatarUrl: true } } },
      },
      messages: {
        select: {
          id: true,
          senderUserId: true,
          senderDeviceId: true,
          clientMessageId: true,
          encryptedEnvelope: true,
          protocolVersion: true,
          createdAt: true,
          attachments: {
            select: {
              id: true,
              storageObjectId: true,
              category: true,
              byteSize: true,
              ciphertextSha256: true,
              encryptedMetadata: true,
            },
          },
          receipts: {
            where: { userId: { not: ctx.userId } },
            select: { readAt: true },
          },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 60,
      },
    },
    orderBy: { updatedAt: 'desc' },
  }), retryOptions);

  return {
    currentUserId: ctx.userId,
    currentUserRole: ctx.role,
    directory,
    limits: ctx.limits,
    conversations: conversations.map((conversation) => {
      const newestMessage = conversation.messages[0];
      const messages = [...conversation.messages].reverse().map((message) => ({
        id: message.id,
        senderUserId: message.senderUserId,
        senderDeviceId: message.senderDeviceId,
        clientMessageId: message.clientMessageId,
        encryptedEnvelope: message.encryptedEnvelope,
        protocolVersion: message.protocolVersion,
        createdAt: message.createdAt.toISOString(),
        attachments: message.attachments.map((attachment) => ({
          ...attachment,
          category: attachment.category as SafeAttachmentCategory,
        })),
      }));

      return {
        id: conversation.id,
        updatedAt: conversation.updatedAt.toISOString(),
        participant: conversation.members[0]?.user || null,
        lastMessage: newestMessage
          ? {
            id: newestMessage.id,
            senderUserId: newestMessage.senderUserId,
            createdAt: newestMessage.createdAt.toISOString(),
            attachmentCount: newestMessage.attachments.length,
          }
          : null,
        messages,
        receiptStates: conversation.messages
          .filter((message) => message.senderUserId === ctx.userId)
          .map((message) => ({
            messageId: message.id,
            clientMessageId: message.clientMessageId,
            readAt: message.receipts.find((receipt) => receipt.readAt)?.readAt?.toISOString() || null,
          })),
      };
    }),
  };
}
