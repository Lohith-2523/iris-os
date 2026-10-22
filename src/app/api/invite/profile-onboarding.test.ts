// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({ invite: vi.fn(), identity: vi.fn(), existing: vi.fn(), save: vi.fn(), used: vi.fn(), organization: vi.fn() }));
vi.mock('@/lib/db', () => ({ prisma: {
  clientInvite: { findUnique: mocks.invite, update: mocks.used },
  memberInvite: { findUnique: mocks.invite, update: mocks.used },
  user: { findUnique: mocks.existing, findFirst: mocks.existing, create: mocks.save, update: mocks.save },
  organization: { findUniqueOrThrow: mocks.organization },
} }));
vi.mock('@/lib/org', () => ({ getAuthenticatedIdentity: mocks.identity, getRequestUser: vi.fn(), isOrganizationAdmin: vi.fn() }));
vi.mock('@/lib/email/iris-email', () => ({ assertIrisEmailConfigured: vi.fn(), sendIrisEmail: vi.fn(), IrisEmailDeliveryError: class extends Error {} }));
import { POST as acceptClient } from './route';
import { POST as acceptMember } from '../member/route';

describe.each([['client', acceptClient], ['member', acceptMember]] as const)('%s onboarding photo', (role, handler) => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.invite.mockResolvedValue({ email: 'person@example.com', name: 'Person', used: false, expiresAt: new Date(Date.now() + 60_000), clientId: 'client', orgId: 'org', client: { orgId: 'org' }, projects: [] });
    mocks.identity.mockResolvedValue({ id: 'auth', email: 'person@example.com' });
    mocks.existing.mockResolvedValue({ id: 'user', role });
    mocks.save.mockResolvedValue({ id: 'user', email: 'person@example.com', name: 'Person', role });
    mocks.organization.mockResolvedValue({ plan: 'BASIC' });
  });
  const submit = (avatarDataUrl: unknown) => handler(new NextRequest('https://iris.example/api/invite', { method: 'POST', body: JSON.stringify({ token: 'invite-token', action: 'complete_onboarding', avatarDataUrl }) }));
  it('saves the chosen avatar as part of activation', async () => {
    expect((await submit('iris-avatar:crop')).status).toBe(200);
    expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ avatarUrl: 'iris-avatar:crop' }) }));
    expect(mocks.used).toHaveBeenCalled();
  });
  it('rejects invalid images without consuming the invite', async () => {
    expect((await submit('data:image/png;base64,YmFk')).status).toBe(400);
    expect(mocks.save).not.toHaveBeenCalled();
    expect(mocks.used).not.toHaveBeenCalled();
  });
  it('requires the invited identity before saving', async () => {
    mocks.identity.mockResolvedValue({ id: 'other', email: 'someone-else@example.com' });
    expect((await submit('iris-avatar:crop')).status).toBe(401);
    expect(mocks.save).not.toHaveBeenCalled();
  });
});
