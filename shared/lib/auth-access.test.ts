// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createAccessToken: vi.fn(),
  upsertAccessToken: vi.fn(),
  findAccessToken: vi.fn(),
  consumeAccessToken: vi.fn(),
  createDeviceGrant: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => ({
  prisma: {
    authAccessToken: {
      create: mocks.createAccessToken,
      upsert: mocks.upsertAccessToken,
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
  scheduleWaitlistInvitation,
  WAITLIST_SIGNUP_PURPOSE,
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

  it('redeems a superadmin link before the public waitlist release', async () => {
    const beforeLaunch = new Date('2026-10-01T00:00:00.000Z');
    mocks.findAccessToken.mockResolvedValue({
      id: 'access-1',
      email: 'approved@example.com',
      purpose: ADMIN_DIRECT_ACCESS_PURPOSE,
      status: 'SENT',
      expiresAt: new Date('2026-10-02T00:00:00.000Z'),
      redeemedAt: null,
    });
    mocks.consumeAccessToken.mockResolvedValue({ count: 1 });
    mocks.createDeviceGrant.mockResolvedValue({ id: 'grant-1' });

    const result = await redeemAuthAccessToken('raw-access-token', beforeLaunch);

    expect(result?.email).toBe('approved@example.com');
    expect(verifyDeviceAccessCookieValue(result?.cookieValue, beforeLaunch)?.landingPreference).toBe('HOME');
  });
});

describe('waitlist launch access', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('AUTH_ACCESS_SECRET', 'test-auth-access-secret-that-is-long-enough');
    mocks.upsertAccessToken.mockResolvedValue({ id: 'waitlist-access-1' });
  });

  it('schedules every pre-launch registration for October 14', async () => {
    await scheduleWaitlistInvitation(
      { id: 'waitlist-1', email: 'person@example.com' },
      new Date('2026-09-30T12:00:00.000Z'),
    );

    expect(mocks.upsertAccessToken).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({
        scheduledAt: new Date('2026-10-13T18:30:00.000Z'),
      }),
    }));
  });

  it('does not redeem a waitlist invitation before launch', async () => {
    mocks.findAccessToken.mockResolvedValue({
      id: 'waitlist-access-1',
      email: 'person@example.com',
      purpose: WAITLIST_SIGNUP_PURPOSE,
      status: 'SENT',
      expiresAt: new Date('2026-10-20T00:00:00.000Z'),
      redeemedAt: null,
    });

    await expect(redeemAuthAccessToken('raw-access-token', new Date('2026-10-13T18:29:59.999Z'))).resolves.toBeNull();
    expect(mocks.consumeAccessToken).not.toHaveBeenCalled();
  });
});
