import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  clientFindMany: vi.fn().mockResolvedValue([]),
  userFindMany: vi.fn().mockResolvedValue([]),
  projectFindMany: vi.fn().mockResolvedValue([]),
  taskFindMany: vi.fn().mockResolvedValue([]),
  deliverableFindMany: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    client: { findMany: mocks.clientFindMany },
    user: { findMany: mocks.userFindMany },
    project: { findMany: mocks.projectFindMany },
    clientTask: { findMany: mocks.taskFindMany },
    deliverable: { findMany: mocks.deliverableFindMany },
  },
}));

vi.mock('@/lib/org', () => ({
  isOrganizationAdmin: (user: { role: string }) => user.role.toLowerCase() === 'admin',
}));

import { listWorkspaceClients, listWorkspaceTeam } from './workspace-directory-service';
import { listProjects } from './project-service';
import { listTasks } from './task-service';

const firstPage = { cursor: null, limit: 50, take: 51 } as const;

function context(overrides: Partial<{ orgId: string; userId: string; role: string; clientId: string | null }> = {}) {
  const orgId = overrides.orgId ?? 'org-a';
  const userId = overrides.userId ?? 'user-a';
  const role = overrides.role ?? 'admin';
  const clientId = overrides.clientId ?? null;
  return {
    authUserId: `auth-${userId}`,
    userId,
    orgId,
    role,
    clientId,
    user: { id: userId, orgId, role, clientId },
    organization: { id: orgId },
    preferences: null,
    onboardingState: null,
    plan: 'BASIC',
    entitlements: {},
  } as any;
}

describe('server domain tenant isolation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('builds separate tenant predicates for consecutive organization contexts', async () => {
    await listProjects(context({ orgId: 'org-a', userId: 'user-a' }), firstPage);
    await listProjects(context({ orgId: 'org-b', userId: 'user-b' }), firstPage);
    await listTasks(context({ orgId: 'org-a', userId: 'user-a' }), firstPage);
    await listTasks(context({ orgId: 'org-b', userId: 'user-b' }), firstPage);
    await listWorkspaceClients(context({ orgId: 'org-a', userId: 'user-a' }));
    await listWorkspaceClients(context({ orgId: 'org-b', userId: 'user-b' }));

    expect(mocks.projectFindMany.mock.calls[0][0].where.orgId).toBe('org-a');
    expect(mocks.projectFindMany.mock.calls[1][0].where.orgId).toBe('org-b');
    expect(mocks.taskFindMany.mock.calls[0][0].where.client.orgId).toBe('org-a');
    expect(mocks.taskFindMany.mock.calls[1][0].where.client.orgId).toBe('org-b');
    expect(mocks.clientFindMany.mock.calls[0][0].where.orgId).toBe('org-a');
    expect(mocks.clientFindMany.mock.calls[1][0].where.orgId).toBe('org-b');
  });

  it('retains client and member visibility restrictions in direct server reads', async () => {
    const client = context({ role: 'client', clientId: 'client-a', userId: 'client-user' });
    const member = context({ role: 'member', userId: 'member-a' });

    await listProjects(client, firstPage);
    await listTasks(client, firstPage);
    await listWorkspaceClients(client);
    await listTasks(member, firstPage);
    await listWorkspaceClients(member);

    expect(mocks.projectFindMany.mock.calls[0][0].where.clientId).toBe('client-a');
    expect(mocks.taskFindMany.mock.calls[0][0].where.clientId).toBe('client-a');
    expect(mocks.clientFindMany.mock.calls[0][0].where.id).toBe('client-a');
    expect(mocks.taskFindMany.mock.calls[1][0].where.assignedToId).toBe('member-a');
    expect(mocks.clientFindMany.mock.calls[1][0].where.projects).toEqual({
      some: { members: { some: { userId: 'member-a' } } },
    });
  });

  it('scopes team reads to organization and excludes revoked access', async () => {
    await listWorkspaceTeam(context({ orgId: 'org-a' }));
    expect(mocks.userFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ orgId: 'org-a', accessRevokedAt: null }),
    }));
  });
});
