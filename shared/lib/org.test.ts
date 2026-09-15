import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getClaims: vi.fn(),
  getUser: vi.fn(),
  findUnique: vi.fn(),
  transaction: vi.fn(),
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
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));
vi.mock('./database-resilience', () => ({
  withDatabaseConnectionRetry: (operation: () => unknown) => operation(),
}));
vi.mock('@/server/observability/performance', () => ({
  measureServerOperation: (_name: string, operation: () => unknown) => operation(),
}));
vi.mock('@/lib/team-member-access', () => ({ hasDeliveryWork: vi.fn() }));

import { getAuthenticatedIdentity, getRequestUser, provisionAuthenticatedUser } from './org';

describe('workspace authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not provision a workspace from editable email-verification metadata', async () => {
    mocks.findUnique.mockResolvedValue(null);
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'auth-user', email: 'person@example.com', email_confirmed_at: null } }, error: null });
    await expect(provisionAuthenticatedUser({ id: 'auth-user', email: 'person@example.com', user_metadata: { email_verified: true } })).rejects.toThrow('Confirm your email');
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it('uses the verified callback identity before redirect cookies reach the browser', async () => {
    mocks.findUnique.mockResolvedValue(null);
    mocks.transaction.mockResolvedValue({ id: 'created-workspace-user' });
    await expect(provisionAuthenticatedUser({
      id: 'auth-user', email: 'person@example.com', user_metadata: {},
      app_metadata: { provider: 'google' }, email_confirmed_at: '2026-09-13T12:00:00Z',
    })).resolves.toEqual({ id: 'created-workspace-user' });
    expect(mocks.getUser).not.toHaveBeenCalled();
    expect(mocks.transaction).toHaveBeenCalled();
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

  it('rejects an invalid claim set before querying the workspace', async () => {
    mocks.getClaims.mockResolvedValue({ data: { claims: null }, error: new Error('invalid token') });

    await expect(getRequestUser()).resolves.toBeNull();
    expect(mocks.findUnique).not.toHaveBeenCalled();
    expect(mocks.getUser).not.toHaveBeenCalled();
  });
});
