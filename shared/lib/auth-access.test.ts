// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createAccessToken: vi.fn(),
  findAccessToken: vi.fn(),
  consumeAccessToken: vi.fn(),
  createDeviceGrant: vi.fn(),
  createDirectDeviceGrant: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => ({
  prisma: {
    authAccessToken: {
      create: mocks.createAccessToken,
      findUnique: mocks.findAccessToken,
    },
    deviceAccessGrant: { create: mocks.createDirectDeviceGrant },
    $transaction: async (callback: (tx: unknown) => unknown) => callback({
      authAccessToken: { updateMany: mocks.consumeAccessToken },
      deviceAccessGrant: { create: mocks.createDeviceGrant },
    }),
  },
}));

import {
  ADMIN_DIRECT_ACCESS_PURPOSE,
  adminDirectAccessUrl,
  createAdminDirectAccessLink,
  redeemAuthAccessToken,
} from './auth-access';
import { verifyDeviceAccessCookieValue } from './auth-access-cookie';

describe('superadmin direct access links', () => {
  const now = new Date('2029-01-01T00:00:00.000Z');

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('AUTH_ACCESS_SECRET', 'test-auth-access-secret-that-is-long-enough');
    mocks.createAccessToken.mockResolvedValue({ id: 'access-1' });
  });

  it('creates an email-free access URL that remains active through onboarding', async () => {
    const result = await createAdminDirectAccessLink('https://irisos.app', now);
    const created = mocks.createAccessToken.mock.calls[0][0].data;
    const url = new URL(result.accessUrl);

    expect(url.pathname).toBe('/access');
    expect(url.searchParams.get('token')).toHaveLength(43);
    expect(created).toMatchObject({
      email: null,
      purpose: ADMIN_DIRECT_ACCESS_PURPOSE,
      status: 'SENT',
      scheduledAt: now,
      sentAt: now,
      expiresAt: null,
    });
    expect(created.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(created.tokenHash).not.toBe(url.searchParams.get('token'));
    expect(created.tokenCiphertext).not.toContain(url.searchParams.get('token'));
    expect(adminDirectAccessUrl(created.tokenCiphertext, 'https://irisos.app')).toBe(result.accessUrl);
  });

  it('redeems direct access with a popup-free HOME landing preference', async () => {
    mocks.findAccessToken.mockResolvedValue({
      id: 'access-1',
      email: null,
      authUserId: null,
      purpose: ADMIN_DIRECT_ACCESS_PURPOSE,
      status: 'SENT',
      expiresAt: null,
      redeemedAt: null,
    });
    mocks.createDirectDeviceGrant.mockResolvedValue({ id: 'grant-1' });

    const result = await redeemAuthAccessToken('raw-access-token', now);

    expect(result?.email).toBeNull();
    expect(verifyDeviceAccessCookieValue(result?.cookieValue, now)?.landingPreference).toBe('HOME');
  });
});
