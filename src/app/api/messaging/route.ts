import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import {
  directParticipantKey,
  getMessagingUser,
  isAllowedDirectPair,
  messagingNoStoreHeaders,
} from '@/lib/messaging/server';
import { isTransientDatabaseConnectionError } from '@/lib/database-resilience';
import { getMessagingInbox } from '@/server/domains/messaging-read-service';

const createConversationSchema = z.object({
  participantUserId: z.string().uuid(),
});

export async function GET(request: NextRequest) {
  try {
  const authorization = await getMessagingUser(request);
  if ('error' in authorization) {
    return NextResponse.json({ error: authorization.error }, { status: authorization.status });
  }
  const { user, entitlements } = authorization;
  const inbox = await getMessagingInbox({
    userId: user.id,
    orgId: user.orgId,
    role: user.role,
    limits: entitlements.messagingLimits,
  });

  return NextResponse.json({
    ...inbox,
    plan: user.organization.plan,
    protocol: { name: 'OPENPGP_SIGNED_E2EE', version: 1, plaintextAccepted: false },
  }, { headers: messagingNoStoreHeaders() });
  } catch (error) {
    console.error('Unable to load messaging inbox:', error);
    if (isTransientDatabaseConnectionError(error)) {
      return NextResponse.json({ error: 'Secure messaging is temporarily unavailable. Please retry.' }, { status: 503, headers: { ...messagingNoStoreHeaders(), 'Retry-After': '2' } });
    }
    return NextResponse.json({ error: 'Unable to load secure messaging.' }, { status: 500, headers: messagingNoStoreHeaders() });
  }
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
