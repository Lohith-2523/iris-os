import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getClaims: vi.fn(),
  getUser: vi.fn(),
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  update: vi.fn(),
  createOrganization: vi.fn(),
  transaction: vi.fn(),
  purgeWorkspaceUsers: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('react', () => ({ cache: <T,>(operation: T) => operation }));
vi.mock('./server', () => ({
  createClient: vi.fn(async () => ({ auth: { getClaims: mocks.getClaims, getUser: mocks.getUser } })),
}));
vi.mock('./db', () => ({
  prisma: {
    $transaction: mocks.transaction,
    user: {
      findUnique: mocks.findUnique,
      findFirst: mocks.findFirst,
      update: mocks.update,
    },
    organization: { create: mocks.createOrganization },
  },
}));
vi.mock('./database-resilience', () => ({
  withDatabaseConnectionRetry: (operation: () => unknown) => operation(),
}));
vi.mock('@/server/observability/performance', () => ({
  measureServerOperation: (_name: string, operation: () => unknown) => operation(),
}));
vi.mock('@/lib/team-member-access', () => ({ hasDeliveryWork: vi.fn() }));
vi.mock('@/server/domains/member-deletion-service', () => ({
  purgeWorkspaceUsers: mocks.purgeWorkspaceUsers,
}));

import { getAuthenticatedIdentity, getRequestUser, provisionAuthenticatedUser } from './org';

describe('workspace authentication', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.findFirst.mockResolvedValue(null);
    mocks.createOrganization.mockResolvedValue({ id: 'created-organization' });
    mocks.transaction.mockImplementation(async (operation: (tx: unknown) => unknown) => operation({}));
    mocks.purgeWorkspaceUsers.mockResolvedValue(undefined);
  });

  it('does not provision a workspace from editable email-verification metadata', async () => {
    mocks.findUnique.mockResolvedValue(null);
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'auth-user', email: 'person@example.com', email_confirmed_at: null } }, error: null });
    await expect(provisionAuthenticatedUser({ id: 'auth-user', email: 'person@example.com', user_metadata: { email_verified: true } })).rejects.toThrow('Confirm your email');
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it('uses the verified callback identity before redirect cookies reach the browser', async () => {
    const workspaceUser = { id: 'created-workspace-user' };
    mocks.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(workspaceUser);
    await expect(provisionAuthenticatedUser({
      id: 'auth-user', email: 'person@example.com', user_metadata: {},
      app_metadata: { provider: 'google' }, email_confirmed_at: '2026-09-13T12:00:00Z',
    })).resolves.toEqual(workspaceUser);
    expect(mocks.getUser).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.createOrganization).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        onboardingState: { create: expect.objectContaining({ needsOnboarding: true }) },
        users: { create: expect.objectContaining({ authUserId: 'auth-user', email: 'person@example.com' }) },
      }),
    }));
  });

  it('uses verified session claims without calling the remote getUser endpoint', async () => {
    const workspaceUser = { id: 'workspace-user', accessRevokedAt: null };
    mocks.getClaims.mockResolvedValue({
      data: {
        claims: {
          sub: 'auth-user',
          email: 'ADMIN@EXAMPLE.COM',
          phone: '+15551234567',
          email_verified: true,
          user_metadata: { full_name: 'Admin User' },
        },
      },
      error: null,
    });
    mocks.findUnique.mockResolvedValue(workspaceUser);

    await expect(getAuthenticatedIdentity()).resolves.toMatchObject({
      id: 'auth-user',
      email: 'ADMIN@EXAMPLE.COM',
      phone: '+15551234567',
      emailVerified: true,
      user_metadata: { full_name: 'Admin User' },
    });
    await expect(getRequestUser()).resolves.toBe(workspaceUser);
    expect(mocks.getClaims).toHaveBeenCalledTimes(2);
    expect(mocks.getUser).not.toHaveBeenCalled();
    expect(mocks.findUnique).toHaveBeenCalledWith(expect.objectContaining({
      where: { authUserId: 'auth-user' },
    }));
  });

  it('recovers the workspace created by a simultaneous signup callback', async () => {
    const concurrentUser = { id: 'concurrent-workspace-user', accessRevokedAt: null };
    mocks.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(concurrentUser);
    mocks.createOrganization.mockRejectedValue({ code: 'P2002' });

    await expect(provisionAuthenticatedUser({
      id: 'auth-user', email: 'person@example.com', user_metadata: {},
      email_confirmed_at: '2026-09-13T12:00:00Z',
    })).resolves.toBe(concurrentUser);

    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it('purges an orphaned client identity before creating a new workspace', async () => {
    const workspaceUser = { id: 'new-admin-user', role: 'admin' };
    mocks.findUnique
      .mockResolvedValueOnce({
      id: 'former-client-user',
      authUserId: 'old-client-auth-user',
      email: 'person@example.com',
      orgId: 'former-org',
      role: 'client',
      clientId: null,
      })
      .mockResolvedValueOnce(workspaceUser);

    await expect(provisionAuthenticatedUser({
      id: 'old-client-auth-user',
      email: 'person@example.com',
      user_metadata: {},
      email_confirmed_at: '2026-09-13T12:00:00Z',
    }, { intent: 'workspace-signup' })).resolves.toBe(workspaceUser);

    expect(mocks.purgeWorkspaceUsers).toHaveBeenCalledWith({}, 'former-org', [{
      id: 'former-client-user',
      authUserId: 'old-client-auth-user',
      email: 'person@example.com',
    }]);
    expect(mocks.createOrganization).toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('does not authenticate an orphaned client into a deleted workspace', async () => {
    mocks.findUnique.mockResolvedValue({
      id: 'former-client-user',
      authUserId: 'old-client-auth-user',
      email: 'person@example.com',
      orgId: 'former-org',
      role: 'client',
      clientId: null,
    });

    await expect(provisionAuthenticatedUser({
      id: 'old-client-auth-user',
      email: 'person@example.com',
      user_metadata: {},
      email_confirmed_at: '2026-09-13T12:00:00Z',
    })).rejects.toThrow('client workspace was deleted');

    expect(mocks.purgeWorkspaceUsers).not.toHaveBeenCalled();
    expect(mocks.createOrganization).not.toHaveBeenCalled();
  });

  it('does not reclaim a client row by email during a new workspace signup', async () => {
    mocks.findUnique.mockResolvedValue(null);
    mocks.findFirst.mockResolvedValue({
      id: 'client-user',
      role: 'client',
      clientId: 'client-1',
    });

    await expect(provisionAuthenticatedUser({
      id: 'new-auth-user',
      email: 'person@example.com',
      user_metadata: {},
      email_confirmed_at: '2026-09-13T12:00:00Z',
    }, { intent: 'workspace-signup' })).rejects.toThrow('belongs to an invited workspace account');

    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('rejects an invalid claim set before querying the workspace', async () => {
    mocks.getClaims.mockResolvedValue({ data: { claims: null }, error: new Error('invalid token') });

    await expect(getRequestUser()).resolves.toBeNull();
    expect(mocks.findUnique).not.toHaveBeenCalled();
    expect(mocks.getUser).not.toHaveBeenCalled();
  });
});
