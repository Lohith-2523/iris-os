import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getRequestUser: vi.fn(),
  isOrganizationAdmin: vi.fn(),
  findUsers: vi.fn(),
  deleteWaitlistEntries: vi.fn(),
  deleteOrganization: vi.fn(),
  transaction: vi.fn(),
  purgeOrganizationData: vi.fn(),
  deleteAuthUser: vi.fn(),
  createSupabaseAdminClient: vi.fn(),
}));

vi.mock('@/lib/org', () => ({
  getRequestUser: mocks.getRequestUser,
  isOrganizationAdmin: mocks.isOrganizationAdmin,
}));
vi.mock('@/lib/db', () => ({
  prisma: {
    user: { findMany: mocks.findUsers },
    $transaction: mocks.transaction,
  },
}));
vi.mock('@/server/domains/account-deletion-service', () => ({
  purgeOrganizationData: mocks.purgeOrganizationData,
}));
vi.mock('@/lib/supabase-admin', () => ({
  createSupabaseAdminClient: mocks.createSupabaseAdminClient,
}));

import { DELETE } from './route';

function deleteRequest(confirmation = 'DELETE Example Org') {
  return new Request('http://localhost:3000/api/account', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ confirmation }),
  });
}

describe('DELETE /api/account', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getRequestUser.mockResolvedValue({
      id: 'admin-1',
      authUserId: 'auth-admin',
      orgId: 'org-1',
      role: 'admin',
      organization: { name: 'Example Org' },
    });
    mocks.isOrganizationAdmin.mockReturnValue(true);
    mocks.findUsers.mockResolvedValue([
      { authUserId: 'auth-admin', email: 'admin@example.com' },
      { authUserId: 'auth-member', email: 'member@example.com' },
      { authUserId: null, email: 'pending@example.com' },
    ]);
    mocks.deleteWaitlistEntries.mockResolvedValue({ count: 0 });
    mocks.deleteOrganization.mockResolvedValue({ id: 'org-1' });
    mocks.transaction.mockImplementation(async (callback) => callback({
      organization: { delete: mocks.deleteOrganization },
      waitlistEntry: { deleteMany: mocks.deleteWaitlistEntries },
    }));
    mocks.purgeOrganizationData.mockResolvedValue(undefined);
    mocks.deleteAuthUser.mockResolvedValue({ error: null });
    mocks.createSupabaseAdminClient.mockReturnValue({
      auth: { admin: { deleteUser: mocks.deleteAuthUser } },
    });
  });

  it('hard-deletes organization data, its container, and every linked auth identity', async () => {
    const response = await DELETE(deleteRequest());

    expect(response.status).toBe(200);
    expect(mocks.purgeOrganizationData).toHaveBeenCalledWith(
      expect.any(Object),
      'org-1',
      expect.any(Function),
    );
    expect(mocks.deleteOrganization).toHaveBeenCalledWith({ where: { id: 'org-1' } });
    expect(mocks.deleteWaitlistEntries).toHaveBeenCalledWith({
      where: {
        email: {
          in: ['admin@example.com', 'member@example.com', 'pending@example.com'],
          mode: 'insensitive',
        },
      },
    });
    expect(mocks.deleteAuthUser.mock.calls.map(([id]) => id)).toEqual([
      'auth-member',
      'auth-admin',
    ]);
  });

  it('rejects a request without the exact destructive confirmation', async () => {
    const response = await DELETE(deleteRequest('DELETE Wrong Org'));

    expect(response.status).toBe(400);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it('does not allow a non-admin to delete the organization account', async () => {
    mocks.isOrganizationAdmin.mockReturnValue(false);

    const response = await DELETE(deleteRequest());

    expect(response.status).toBe(403);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it('does not delete database data when the server-side auth client is unavailable', async () => {
    mocks.createSupabaseAdminClient.mockImplementation(() => {
      throw new Error('missing secret');
    });

    const response = await DELETE(deleteRequest());

    expect(response.status).toBe(500);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it('retries a failed authentication deletion before reporting success', async () => {
    mocks.findUsers.mockResolvedValue([{ authUserId: 'auth-admin', email: 'admin@example.com' }]);
    mocks.deleteAuthUser
      .mockResolvedValueOnce({ error: new Error('temporary failure') })
      .mockResolvedValueOnce({ error: null });

    const response = await DELETE(deleteRequest());

    expect(response.status).toBe(200);
    expect(mocks.deleteAuthUser).toHaveBeenCalledTimes(2);
  });

  it('reports an authentication deletion that still fails after three attempts', async () => {
    mocks.findUsers.mockResolvedValue([{ authUserId: 'auth-admin', email: 'admin@example.com' }]);
    mocks.deleteAuthUser.mockResolvedValue({ error: new Error('persistent failure') });

    const response = await DELETE(deleteRequest());

    expect(response.status).toBe(500);
    expect(mocks.deleteAuthUser).toHaveBeenCalledTimes(3);
  });
});
