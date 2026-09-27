import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  getMessagingUser: vi.fn(),
  deleteConversation: vi.fn(),
  findParticipant: vi.fn(),
  upsertConversation: vi.fn(),
  findConversation: vi.fn(),
  directParticipantKey: vi.fn(),
  isAllowedDirectPair: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    user: { findFirst: mocks.findParticipant },
    messagingConversation: {
      deleteMany: mocks.deleteConversation,
      upsert: mocks.upsertConversation,
      findUnique: mocks.findConversation,
    },
  },
}));

vi.mock('@/lib/messaging/server', () => ({
  directParticipantKey: mocks.directParticipantKey,
  getMessagingUser: mocks.getMessagingUser,
  isAllowedDirectPair: mocks.isAllowedDirectPair,
  messagingNoStoreHeaders: () => ({ 'Cache-Control': 'no-store' }),
}));

vi.mock('@/server/domains/messaging-read-service', () => ({ getMessagingInbox: vi.fn() }));

import { DELETE, POST } from './route';

describe('DELETE /api/messaging', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getMessagingUser.mockResolvedValue({
      user: { id: '05e2fa90-59a5-48ec-b73d-9c6fc05d1469', orgId: 'org-1', role: 'admin' },
      entitlements: {},
    });
    mocks.directParticipantKey.mockReturnValue('direct-key');
    mocks.isAllowedDirectPair.mockReturnValue(true);
  });

  it('deletes only a conversation belonging to the signed-in participant', async () => {
    mocks.deleteConversation.mockResolvedValue({ count: 1 });
    const conversationId = 'c31d8fc8-6cc0-4d12-84a4-5e90161aab88';

    const response = await DELETE(new NextRequest(`https://iris.example/api/messaging?conversationId=${conversationId}`, { method: 'DELETE' }));

    expect(response.status).toBe(200);
    expect(mocks.deleteConversation).toHaveBeenCalledWith({
      where: {
        id: conversationId,
        orgId: 'org-1',
        members: { some: { userId: '05e2fa90-59a5-48ec-b73d-9c6fc05d1469' } },
      },
    });
  });

  it('does not expose conversations outside the signed-in membership', async () => {
    mocks.deleteConversation.mockResolvedValue({ count: 0 });
    const response = await DELETE(new NextRequest('https://iris.example/api/messaging?conversationId=c31d8fc8-6cc0-4d12-84a4-5e90161aab88', { method: 'DELETE' }));

    expect(response.status).toBe(404);
  });
});

describe('POST /api/messaging', () => {
  const participantId = 'd8c5186d-f3e5-48a8-9d25-df1488148cf7';

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getMessagingUser.mockResolvedValue({ user: { id: '05e2fa90-59a5-48ec-b73d-9c6fc05d1469', orgId: 'org-1', role: 'admin' }, entitlements: {} });
    mocks.findParticipant.mockResolvedValue({ id: participantId, name: 'Client User', email: 'client@example.com', role: 'client', avatarUrl: null });
    mocks.directParticipantKey.mockReturnValue('direct-key');
    mocks.isAllowedDirectPair.mockReturnValue(true);
  });

  it('returns the conversation created by the upsert', async () => {
    mocks.upsertConversation.mockResolvedValue({ id: 'conversation-1', updatedAt: new Date('2026-09-27T00:00:00Z') });
    const response = await POST(new NextRequest('https://iris.example/api/messaging', { method: 'POST', body: JSON.stringify({ participantUserId: participantId }), headers: { 'Content-Type': 'application/json' } }));
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({ conversation: { id: 'conversation-1', participant: { id: participantId } } });
  });

  it('recovers the winning conversation when concurrent upserts collide', async () => {
    mocks.upsertConversation.mockRejectedValue(Object.assign(new Error('Unique constraint'), { code: 'P2002' }));
    mocks.findConversation.mockResolvedValue({ id: 'conversation-winner', updatedAt: new Date('2026-09-27T00:00:00Z') });
    const response = await POST(new NextRequest('https://iris.example/api/messaging', { method: 'POST', body: JSON.stringify({ participantUserId: participantId }), headers: { 'Content-Type': 'application/json' } }));
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({ conversation: { id: 'conversation-winner' } });
    expect(mocks.findConversation).toHaveBeenCalledWith({ where: { orgId_participantKey: { orgId: 'org-1', participantKey: 'direct-key' } }, select: { id: true, updatedAt: true } });
  });
});
