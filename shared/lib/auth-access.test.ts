// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createAccessToken: vi.fn(),
  findAccessToken: vi.fn(),
  consumeAccessToken: vi.fn(),
  createDeviceGrant: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => ({
  prisma: {
    authAccessToken: {
      create: mocks.createAccessToken,
      findUnique: mocks.findAccessToken,
    },
    $transaction: async (callback: (tx: unknown) => unknown) => callback({
      authAccessToken: { updateMany: mocks.consumeAccessToken },
      deviceAccessGrant: { create: mocks.createDeviceGrant },
    }),
  },
}));

import {
  ADMIN_DIRECT_ACCESS_PURPOSE,
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

  it('stores only a token digest and returns a single-use access URL', async () => {
    const result = await createAdminDirectAccessLink(' Approved@Example.com ', 3, 'https://irisos.app', now);
    const created = mocks.createAccessToken.mock.calls[0][0].data;
    const url = new URL(result.accessUrl);

    expect(result.email).toBe('approved@example.com');
    expect(result.expiresAt.toISOString()).toBe('2029-01-04T00:00:00.000Z');
    expect(url.pathname).toBe('/access');
    expect(url.searchParams.get('token')).toHaveLength(43);
    expect(created).toMatchObject({
      email: 'approved@example.com',
      purpose: ADMIN_DIRECT_ACCESS_PURPOSE,
      status: 'SENT',
      scheduledAt: now,
      sentAt: now,
    });
    expect(created.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(created.tokenHash).not.toBe(url.searchParams.get('token'));
  });

  it('redeems direct access with a popup-free HOME landing preference', async () => {
    mocks.findAccessToken.mockResolvedValue({
      id: 'access-1',
      email: 'approved@example.com',
      purpose: ADMIN_DIRECT_ACCESS_PURPOSE,
      status: 'SENT',
      expiresAt: new Date('2029-01-02T00:00:00.000Z'),
      redeemedAt: null,
    });
    mocks.consumeAccessToken.mockResolvedValue({ count: 1 });
    mocks.createDeviceGrant.mockResolvedValue({ id: 'grant-1' });

    const result = await redeemAuthAccessToken('raw-access-token', now);

    expect(result?.email).toBe('approved@example.com');
    expect(verifyDeviceAccessCookieValue(result?.cookieValue, now)?.landingPreference).toBe('HOME');
  });
});
