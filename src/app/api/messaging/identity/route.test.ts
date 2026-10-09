import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  decrypt: vi.fn(),
  getMessagingUser: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    messagingAccountKey: { findMany: mocks.findMany },
  },
}));
vi.mock('@/lib/messaging/account-key-secrets', () => ({
  decryptMessagingPrivateKey: mocks.decrypt,
  encryptMessagingPrivateKey: vi.fn(),
}));
vi.mock('@/lib/messaging/server', () => ({
  getMessagingUser: mocks.getMessagingUser,
  messagingNoStoreHeaders: () => ({ 'Cache-Control': 'private, no-store, max-age=0' }),
}));
vi.mock('openpgp', () => ({
  readKey: vi.fn(),
  readPrivateKey: vi.fn(),
}));

import { GET } from './route';

const key = (id: string, encryptedPrivateKey: string, isPrimary: boolean) => ({
  id,
  deviceId: `device-${id}`,
  encryptedPrivateKey,
  publicKeyFingerprint: id.repeat(40).slice(0, 40),
  isPrimary,
  device: { identityPublicKey: `public-${id}` },
});

describe('GET /api/messaging/identity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    mocks.getMessagingUser.mockResolvedValue({ user: { id: 'user-1', orgId: 'org-1' } });
  });

  it('skips an unreadable legacy key and promotes the first readable key for recovery', async () => {
    mocks.findMany.mockResolvedValue([key('a', 'stale', true), key('b', 'current', false)]);
    mocks.decrypt.mockImplementation((payload: string) => {
      if (payload === 'stale') throw new Error('unable to authenticate data');
      return 'private-b';
    });

    const response = await GET(new NextRequest('http://localhost/api/messaging/identity'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.keys).toEqual([expect.objectContaining({ id: 'b', identityPrivateKey: 'private-b', isPrimary: true })]);
  });

  it('returns an empty identity instead of a 500 when every stored key is unreadable', async () => {
    mocks.findMany.mockResolvedValue([key('a', 'stale', true)]);
    mocks.decrypt.mockImplementation(() => { throw new Error('unable to authenticate data'); });

    const response = await GET(new NextRequest('http://localhost/api/messaging/identity'));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ keys: [] });
  });
});
