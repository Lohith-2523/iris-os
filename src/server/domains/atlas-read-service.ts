import 'server-only';

import { cache } from 'react';
import { prisma } from '@/lib/db';
import { withDatabaseConnectionRetry } from '@/lib/database-resilience';
import type { RequestSecurityContext } from '@/server/security/request-security-context';

const retryOptions = { maxAttempts: 3, delaysMs: [150, 500] } as const;

function proSessionAllowed(session: { workflowType: string | null; workflowState: unknown }) {
  if (session.workflowType === 'MEETING') return true;
  return session.workflowType === 'AUTOMATION'
    && typeof session.workflowState === 'object'
    && session.workflowState !== null
    && !Array.isArray(session.workflowState)
    && (session.workflowState as Record<string, unknown>).kind === 'INVOICE';
}

export const getAtlasInitialReadModel = cache(async (ctx: RequestSecurityContext) => {
  const sessionRows = await withDatabaseConnectionRetry(() => prisma.atlasChatSession.findMany({
    where: { userId: ctx.userId, orgId: ctx.orgId },
    orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
    take: 51,
    select: {
      id: true,
      title: true,
      updatedAt: true,
      workflowType: true,
      workflowState: true,
      messages: {
        orderBy: { createdAt: 'asc' },
        select: { id: true, role: true, content: true, createdAt: true },
      },
    },
  }), retryOptions);

  const visibleSessions = (ctx.plan === 'PRO' ? sessionRows.filter(proSessionAllowed) : sessionRows).slice(0, 50);
  const sessionMessages = Object.fromEntries(visibleSessions.map((session) => [
    session.id,
    session.messages.map((message) => ({
      ...message,
      role: message.role as 'user' | 'assistant',
      createdAt: message.createdAt.toISOString(),
    })),
  ]));
  const latestSessionId = visibleSessions[0]?.id || null;

  return {
    sessions: visibleSessions.map((session) => ({
      id: session.id,
      title: session.title,
      updatedAt: session.updatedAt.toISOString(),
    })),
    currentSessionId: latestSessionId,
    messages: latestSessionId ? sessionMessages[latestSessionId] : [],
    sessionMessages,
    userId: ctx.userId,
    userName: ctx.user.name,
    userAvatarUrl: ctx.user.avatarUrl || null,
  };
});

export type AtlasInitialReadModel = Awaited<ReturnType<typeof getAtlasInitialReadModel>>;
