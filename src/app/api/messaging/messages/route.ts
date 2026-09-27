import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import type { Prisma } from '@prisma/client';
import { getMessagingUser, messagingNoStoreHeaders } from '@/lib/messaging/server';
import { publishMessagingChange } from '@/lib/messaging/realtime';

const attachmentSchema = z.object({
  storageObjectId: z.string().uuid(),
  category: z.enum(['IMAGE', 'GIF', 'VOICE', 'VIDEO', 'DOCUMENT', 'ARCHIVE']),
  byteSize: z.number().int().positive(),
  ciphertextSha256: z.string().regex(/^[a-fA-F0-9]{64}$/),
  encryptedMetadata: z.string().min(16).max(65_536),
  ciphertext: z.string().startsWith('-----BEGIN PGP MESSAGE-----').max(100_000_000),
});

const messageSchema = z.object({
  conversationId: z.string().uuid(),
  senderDeviceId: z.string().uuid(),
  clientMessageId: z.string().uuid(),
  encryptedEnvelope: z.string().startsWith('-----BEGIN PGP MESSAGE-----').max(100_000),
  protocolVersion: z.number().int().min(1).max(10).default(1),
  clientCreatedAt: z.string().datetime(),
  expiresAt: z.string().datetime().optional(),
  attachments: z.array(attachmentSchema).default([]),
});

const categoryLimitKey = {
  IMAGE: 'imageBytes',
  GIF: 'gifBytes',
  VOICE: 'voiceBytes',
  VIDEO: 'videoBytes',
  DOCUMENT: 'documentBytes',
  ARCHIVE: 'archiveBytes',
} as const;

async function conversationMembership(conversationId: string, orgId: string, userId: string) {
  return prisma.messagingConversation.findFirst({
    where: { id: conversationId, orgId, members: { some: { userId } } },
    select: { id: true, members: { select: { userId: true } } },
  });
}

export async function GET(request: NextRequest) {
  const authorization = await getMessagingUser(request);
  if ('error' in authorization) return NextResponse.json({ error: authorization.error }, { status: authorization.status });
  const conversationId = request.nextUrl.searchParams.get('conversationId') || '';
  const conversation = await conversationMembership(conversationId, authorization.user.orgId, authorization.user.id);
  if (!conversation) return NextResponse.json({ error: 'Conversation not found.' }, { status: 404 });
  const attachmentId = request.nextUrl.searchParams.get('attachmentId');
  if (attachmentId) {
    const parsedAttachmentId = z.string().uuid().safeParse(attachmentId);
    if (!parsedAttachmentId.success) return NextResponse.json({ error: 'Invalid attachment.' }, { status: 400 });
    const attachment = await prisma.encryptedAttachment.findFirst({
      where: { id: parsedAttachmentId.data, message: { conversationId } },
      select: { id: true, ciphertext: true },
    });
    if (!attachment) return NextResponse.json({ error: 'Attachment not found.' }, { status: 404 });
    return NextResponse.json({ attachment }, { headers: messagingNoStoreHeaders() });
  }
  const after = request.nextUrl.searchParams.get('after');
  const afterId = request.nextUrl.searchParams.get('afterId') || '';
  const afterDate = after && !Number.isNaN(new Date(after).getTime()) ? new Date(after) : undefined;
  const where: Prisma.EncryptedMessageWhereInput = {
    conversationId,
    ...(afterDate ? {
      OR: [
        { createdAt: { gt: afterDate } },
        ...(afterId ? [{ createdAt: afterDate, id: { gt: afterId } }] : []),
      ],
    } : {}),
  };
  const messageQuery = prisma.encryptedMessage.findMany({
    where,
    select: {
      id: true,
      senderUserId: true,
      senderDeviceId: true,
      clientMessageId: true,
      encryptedEnvelope: true,
      protocolVersion: true,
      clientCreatedAt: true,
      createdAt: true,
      expiresAt: true,
      attachments: {
          select: { id: true, storageObjectId: true, category: true, byteSize: true, ciphertextSha256: true, encryptedMetadata: true },
      },
      receipts: { select: { userId: true, deliveredAt: true, readAt: true } },
    },
    orderBy: afterDate ? [{ createdAt: 'asc' as const }, { id: 'asc' as const }] : [{ createdAt: 'desc' as const }, { id: 'desc' as const }],
    take: afterDate ? 100 : 60,
  });
  const receiptQuery = prisma.encryptedMessage.findMany({
    where: { conversationId, senderUserId: authorization.user.id },
    select: {
      id: true,
      clientMessageId: true,
      receipts: {
        where: { userId: { not: authorization.user.id } },
        select: { readAt: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  const [queriedMessages, outgoingReceipts] = await Promise.all([messageQuery, receiptQuery]);
  const messages = afterDate ? queriedMessages : queriedMessages.reverse();
  return NextResponse.json({
    messages,
    receiptStates: outgoingReceipts.map((message) => ({
      messageId: message.id,
      clientMessageId: message.clientMessageId,
      readAt: message.receipts.find((receipt) => receipt.readAt)?.readAt || null,
    })),
  }, { headers: messagingNoStoreHeaders() });
}

export async function POST(request: NextRequest) {
  const authorization = await getMessagingUser(request);
  if ('error' in authorization) return NextResponse.json({ error: authorization.error }, { status: authorization.status });
  const parsed = messageSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: 'Invalid encrypted message envelope.' }, { status: 400 });
  const { user, entitlements } = authorization;
  if (!entitlements.messaging || !entitlements.messagingLimits) {
    return NextResponse.json({
      error: 'Sending messages is available on the Pro and Advanced plans.',
      code: 'PLAN_UPGRADE_REQUIRED',
      requiredPlan: 'PRO',
    }, { status: 403 });
  }
  const limits = entitlements.messagingLimits!;
  const input = parsed.data;
  const envelopeBytes = new TextEncoder().encode(input.encryptedEnvelope).byteLength;
  if (envelopeBytes > limits.textBytes + 8_192) {
    return NextResponse.json({ error: 'Encrypted message exceeds this plan’s text limit.' }, { status: 413 });
  }
  if (input.attachments.length > limits.attachmentsPerMessage) {
    return NextResponse.json({ error: 'Too many attachments for this plan.' }, { status: 413 });
  }
  const totalAttachmentBytes = input.attachments.reduce((sum, attachment) => sum + attachment.byteSize, 0);
  if (totalAttachmentBytes > limits.combinedAttachmentBytes) {
    return NextResponse.json({ error: 'Combined attachments exceed this plan’s limit.' }, { status: 413 });
  }
  if (totalAttachmentBytes > 0) {
    const transferred = await prisma.encryptedAttachment.aggregate({
      where: { orgId: user.orgId },
      _sum: { byteSize: true },
    });
    const usedBytes = transferred._sum.byteSize ?? 0;
    if (usedBytes + totalAttachmentBytes > entitlements.dataTransferBytes) {
      return NextResponse.json({ error: 'This workspace has reached its plan data-transfer limit.', code: 'PLAN_LIMIT_REACHED' }, { status: 413 });
    }
  }
  for (const attachment of input.attachments) {
    if (attachment.byteSize > limits[categoryLimitKey[attachment.category]]) {
      return NextResponse.json({ error: `${attachment.category.toLowerCase()} attachment exceeds this plan’s limit.` }, { status: 413 });
    }
  }
  for (const attachment of input.attachments) {
    const encryptedBytes = new TextEncoder().encode(attachment.ciphertext).byteLength;
    const maximumEncryptedBytes = Math.ceil(limits[categoryLimitKey[attachment.category]] * 1.45) + 65_536;
    if (encryptedBytes > maximumEncryptedBytes) {
      return NextResponse.json({ error: 'Encrypted attachment payload exceeds the permitted storage envelope.' }, { status: 413 });
    }
  }
  const [conversation, device] = await Promise.all([
    conversationMembership(input.conversationId, user.orgId, user.id),
    prisma.messagingDevice.findFirst({
      where: { id: input.senderDeviceId, userId: user.id, orgId: user.orgId, revokedAt: null },
      select: { id: true },
    }),
  ]);
  if (!conversation) return NextResponse.json({ error: 'Conversation not found.' }, { status: 404 });
  if (!device) return NextResponse.json({ error: 'Registered sender device not found.' }, { status: 403 });
  const recipientIds = conversation.members.map((member) => member.userId).filter((id) => id !== user.id);

  const message = await prisma.$transaction(async (tx) => {
    const created = await tx.encryptedMessage.create({
      data: {
        orgId: user.orgId,
        conversationId: input.conversationId,
        senderUserId: user.id,
        senderDeviceId: input.senderDeviceId,
        clientMessageId: input.clientMessageId,
        encryptedEnvelope: input.encryptedEnvelope,
        protocolVersion: input.protocolVersion,
        clientCreatedAt: new Date(input.clientCreatedAt),
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
        attachments: { create: input.attachments.map((attachment) => ({ ...attachment, orgId: user.orgId })) },
        receipts: { create: recipientIds.map((userId) => ({ userId })) },
      },
      select: { id: true, createdAt: true },
    });
    await tx.messagingConversation.update({ where: { id: input.conversationId }, data: { updatedAt: new Date() } });
    if (recipientIds.length) {
      await tx.notification.createMany({
        data: recipientIds.map((userId) => ({
          orgId: user.orgId,
          userId,
          type: 'MESSAGE',
          title: `New message from ${user.name}`,
          body: 'New message received.',
          href: `/messages?conversationId=${input.conversationId}&messageId=${created.id}`,
          actionLabel: 'Open message',
        })),
      });
    }
    return created;
  });
  publishMessagingChange(input.conversationId);
  return NextResponse.json({ message }, { status: 201, headers: messagingNoStoreHeaders() });
}

export async function PATCH(request: NextRequest) {
  const authorization = await getMessagingUser(request);
  if ('error' in authorization) return NextResponse.json({ error: authorization.error }, { status: authorization.status });
  const body = await request.json() as { conversationId?: string };
  const conversationId = String(body.conversationId || '');
  const conversation = await conversationMembership(conversationId, authorization.user.orgId, authorization.user.id);
  if (!conversation) return NextResponse.json({ error: 'Conversation not found.' }, { status: 404 });
  const now = new Date();
  await prisma.$transaction([
    prisma.messagingConversationMember.update({
      where: { conversationId_userId: { conversationId, userId: authorization.user.id } },
      data: { lastReadAt: now },
    }),
    prisma.messageDeliveryReceipt.updateMany({
      where: { userId: authorization.user.id, message: { conversationId }, readAt: null },
      data: { deliveredAt: now, readAt: now },
    }),
  ]);
  publishMessagingChange(conversationId);
  return NextResponse.json({ success: true, readAt: now }, { headers: messagingNoStoreHeaders() });
}
