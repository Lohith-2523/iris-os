import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  getMessagingUser: vi.fn(),
  deleteConversation: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    messagingConversation: {
      deleteMany: mocks.deleteConversation,
    },
  },
}));

vi.mock('@/lib/messaging/server', () => ({
  directParticipantKey: vi.fn(),
  getMessagingUser: mocks.getMessagingUser,
  isAllowedDirectPair: vi.fn(),
  messagingNoStoreHeaders: () => ({ 'Cache-Control': 'no-store' }),
}));

vi.mock('@/server/domains/messaging-read-service', () => ({ getMessagingInbox: vi.fn() }));

import { DELETE } from './route';

describe('DELETE /api/messaging', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getMessagingUser.mockResolvedValue({
      user: { id: '05e2fa90-59a5-48ec-b73d-9c6fc05d1469', orgId: 'org-1' },
      entitlements: {},
    });
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
