import { describe, expect, it } from 'vitest';
import { serializeClientOnboardingInvite } from './onboarding-invite';

const invite = {
  email: 'client@example.com',
  token: 'secure token',
  used: false,
  expiresAt: new Date('2026-08-20T00:00:00.000Z'),
};

describe('serializeClientOnboardingInvite', () => {
  it('returns an encoded pending activation link for workspace admins', () => {
    expect(serializeClientOnboardingInvite(invite, true, Date.parse('2026-08-13T00:00:00.000Z'))).toEqual({
      email: 'client@example.com',
      path: '/invite?token=secure%20token',
      status: 'PENDING',
      expiresAt: '2026-08-20T00:00:00.000Z',
    });
  });

  it('never exposes the invitation token to non-admin workspaces', () => {
    expect(serializeClientOnboardingInvite(invite, false)).toBeNull();
  });

  it('distinguishes completed and expired onboarding', () => {
    expect(serializeClientOnboardingInvite({ ...invite, used: true }, true, 0)?.status).toBe('COMPLETED');
    expect(serializeClientOnboardingInvite(invite, true, Date.parse('2026-08-21T00:00:00.000Z'))?.status).toBe('EXPIRED');
  });
});
