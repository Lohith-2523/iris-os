import { describe, expect, it, vi } from 'vitest';
import { purgeWorkspaceUsers } from './member-deletion-service';

describe('purgeWorkspaceUsers', () => {
  it('removes message threads, AI chat history, generated work, and the workspace user', async () => {
    const operationNames = [
      'messagingConversation', 'askAtlasMessage', 'atlasChatSession', 'generatedDocument',
      'automationRun', 'automation', 'report', 'strategy', 'deliverable', 'changeRequest',
      'clientTask', 'projectMember', 'taskComment', 'calendarEvent', 'notification',
      'googleCalendarConnection', 'messagingDevice', 'memberInvite', 'waitlistEntry', 'user',
    ] as const;
    const tx = Object.fromEntries(operationNames.map((name) => [name, {
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    }])) as any;

    await purgeWorkspaceUsers(tx, 'org-1', [{
      id: 'user-1',
      authUserId: 'auth-1',
      email: 'member@example.com',
    }]);

    expect(tx.messagingConversation.deleteMany).toHaveBeenCalledWith({
      where: {
        orgId: 'org-1',
        OR: [
          { createdById: { in: ['user-1'] } },
          { members: { some: { userId: { in: ['user-1'] } } } },
        ],
      },
    });
    expect(tx.askAtlasMessage.deleteMany).toHaveBeenCalledWith({
      where: { orgId: 'org-1', userId: { in: ['user-1'] } },
    });
    expect(tx.atlasChatSession.deleteMany).toHaveBeenCalledWith({
      where: { orgId: 'org-1', userId: { in: ['user-1'] } },
    });
    expect(tx.user.deleteMany).toHaveBeenCalledWith({
      where: { orgId: 'org-1', id: { in: ['user-1'] } },
    });
  });
});

