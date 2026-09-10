import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getClaims: vi.fn(),
  getUser: vi.fn(),
  findUnique: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('react', () => ({ cache: <T,>(operation: T) => operation }));
vi.mock('./server', () => ({
  createClient: vi.fn(async () => ({ auth: { getClaims: mocks.getClaims, getUser: mocks.getUser } })),
}));
vi.mock('./db', () => ({
  prisma: {
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

import { getAuthenticatedIdentity, getRequestUser } from './org';

describe('workspace authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
