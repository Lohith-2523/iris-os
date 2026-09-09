import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getRequestUser: vi.fn(),
  updateUser: vi.fn(),
}));

vi.mock('@/lib/org', () => ({ getRequestUser: mocks.getRequestUser }));
vi.mock('@/lib/db', () => ({
  prisma: { user: { update: mocks.updateUser } },
}));

import { PATCH } from './route';

function patchRequest(avatarDataUrl: string | null) {
  return new Request('http://localhost:3000/api/user', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ avatarDataUrl }),
  });
}

describe('PATCH /api/user', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getRequestUser.mockResolvedValue({ id: 'user-1', role: 'member' });
    mocks.updateUser.mockResolvedValue({ avatarUrl: null });
  });

  it.each(['admin', 'sub_admin', 'member', 'client'])('allows a %s to update their own avatar', async (role) => {
    mocks.getRequestUser.mockResolvedValue({ id: 'user-1', role });
    const avatar = `data:image/png;base64,${Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).toString('base64')}`;
    mocks.updateUser.mockResolvedValue({ avatarUrl: avatar });

    const response = await PATCH(patchRequest(avatar));

    expect(response.status).toBe(200);
    expect(mocks.updateUser).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { avatarUrl: avatar },
      select: { avatarUrl: true },
    });
  });

  it('validates image content before writing it', async () => {
    const response = await PATCH(patchRequest('data:image/png;base64,bm90LWEtcG5n'));

    expect(response.status).toBe(400);
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });

  it('returns a client error for malformed profile updates', async () => {
    const response = await PATCH(new Request('http://localhost:3000/api/user', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: '{',
    }));

    expect(response.status).toBe(400);
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });
});
