import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ purgeWorkspaceUsers: vi.fn() }));

vi.mock('./member-deletion-service', () => ({
  purgeWorkspaceUsers: mocks.purgeWorkspaceUsers,
}));

import { purgeClientData } from './client-deletion-service';

describe('purgeClientData', () => {
  beforeEach(() => vi.clearAllMocks());

  it('purges portal users and client-owned records before removing the client', async () => {
    const users = [{ id: 'user-1', authUserId: 'auth-1', email: 'client@example.com' }];
    const tx = {
      client: {
        findFirst: vi.fn().mockResolvedValue({ id: 'client-1', sourceLeadId: 'lead-1', users }),
        delete: vi.fn().mockResolvedValue({ id: 'client-1' }),
      },
      generatedDocument: { deleteMany: vi.fn().mockResolvedValue({ count: 1 }) },
      transaction: { deleteMany: vi.fn().mockResolvedValue({ count: 1 }) },
      invoice: { deleteMany: vi.fn().mockResolvedValue({ count: 1 }) },
      agencyLead: { deleteMany: vi.fn().mockResolvedValue({ count: 1 }) },
    } as any;

    const result = await purgeClientData(tx, 'org-1', 'client-1');

    expect(mocks.purgeWorkspaceUsers).toHaveBeenCalledWith(tx, 'org-1', users);
    expect(tx.transaction.deleteMany).toHaveBeenCalledWith({ where: { orgId: 'org-1', clientId: 'client-1' } });
    expect(tx.invoice.deleteMany).toHaveBeenCalledWith({ where: { orgId: 'org-1', clientId: 'client-1' } });
    expect(tx.client.delete).toHaveBeenCalledWith({ where: { id: 'client-1' } });
    expect(tx.agencyLead.deleteMany).toHaveBeenCalledWith({ where: { id: 'lead-1', orgId: 'org-1' } });
    expect(result).toEqual(users);
  });
});

