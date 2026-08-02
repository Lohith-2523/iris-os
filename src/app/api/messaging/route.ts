import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import {
  directParticipantKey,
  getMessagingUser,
  isAllowedDirectPair,
  messagingNoStoreHeaders,
} from '@/lib/messaging/server';

const createConversationSchema = z.object({
  participantUserId: z.string().uuid(),
});

export async function GET(request: NextRequest) {
  const authorization = await getMessagingUser(request);
  if ('error' in authorization) {
    return NextResponse.json({ error: authorization.error }, { status: authorization.status });
  }
  const { user, entitlements } = authorization;
  const eligibleRoles = user.role.toLowerCase() === 'admin' ? ['client', 'member'] : ['admin'];
  const [directory, conversations] = await Promise.all([
    prisma.user.findMany({
      where: { orgId: user.orgId, id: { not: user.id }, role: { in: eligibleRoles } },
      select: { id: true, name: true, email: true, role: true, avatarUrl: true, clientId: true },
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
    }),
    prisma.messagingConversation.findMany({
      where: { orgId: user.orgId, members: { some: { userId: user.id } } },
      select: {
        id: true,
        updatedAt: true,
        members: {
          where: { userId: { not: user.id } },
          select: {
            lastReadAt: true,
            user: { select: { id: true, name: true, email: true, role: true, avatarUrl: true } },
          },
        },
        messages: {
          select: { id: true, senderUserId: true, createdAt: true, attachments: { select: { id: true } } },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    }),
  ]);

  return NextResponse.json({
    currentUserId: user.id,
    plan: user.organization.plan,
    protocol: { name: 'OPENPGP_SIGNED_E2EE', version: 1, plaintextAccepted: false },
    limits: entitlements.messagingLimits,
    directory,
    conversations: conversations.map((conversation) => ({
      id: conversation.id,
      updatedAt: conversation.updatedAt,
      participant: conversation.members[0]?.user || null,
      lastMessage: conversation.messages[0]
        ? { ...conversation.messages[0], attachmentCount: conversation.messages[0].attachments.length }
        : null,
    })),
  }, { headers: messagingNoStoreHeaders() });
}

export async function POST(request: NextRequest) {
  const authorization = await getMessagingUser(request);
  if ('error' in authorization) {
    return NextResponse.json({ error: authorization.error }, { status: authorization.status });
  }
  const parsed = createConversationSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: 'Choose a valid participant.' }, { status: 400 });

  const { user } = authorization;
  const participant = await prisma.user.findFirst({
    where: { id: parsed.data.participantUserId, orgId: user.orgId },
    select: { id: true, name: true, email: true, role: true, avatarUrl: true },
  });
  if (!participant) return NextResponse.json({ error: 'Participant not found.' }, { status: 404 });
  if (!isAllowedDirectPair(user.role, participant.role)) {
    return NextResponse.json({
      error: 'Clients and team members can only message an agency owner.',
    }, { status: 403 });
  }

  const participantKey = directParticipantKey(user.id, participant.id);
  const conversation = await prisma.messagingConversation.upsert({
    where: { orgId_participantKey: { orgId: user.orgId, participantKey } },
    create: {
      orgId: user.orgId,
      participantKey,
      createdById: user.id,
      members: { create: [{ userId: user.id }, { userId: participant.id }] },
    },
    update: {},
    select: { id: true, updatedAt: true },
  });

  return NextResponse.json({ conversation: { ...conversation, participant } }, {
    status: 201,
    headers: messagingNoStoreHeaders(),
  });
}
