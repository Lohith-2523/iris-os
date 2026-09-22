// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({ redeemAuthAccessToken: vi.fn() }));

vi.mock('@/lib/auth-access', () => ({
  ACCOUNT_LOGIN_PURPOSE: 'ACCOUNT_LOGIN',
  ADMIN_DIRECT_ACCESS_PURPOSE: 'ADMIN_DIRECT_ACCESS',
  redeemAuthAccessToken: mocks.redeemAuthAccessToken,
}));

import { POST } from './route';
import { DEVICE_ACCESS_COOKIE } from '@/lib/auth-access-cookie';

function request(token = 'a'.repeat(32)) {
  const form = new FormData();
  form.set('token', token);
  return new NextRequest('https://irisos.app/api/auth/access-activate', { method: 'POST', body: form });
}

describe('POST /api/auth/access-activate', () => {
  beforeEach(() => vi.clearAllMocks());

  it('activates direct access and returns the approved browser to the landing page', async () => {
    mocks.redeemAuthAccessToken.mockResolvedValue({
      email: 'approved@example.com',
      purpose: 'ADMIN_DIRECT_ACCESS',
      cookieValue: 'signed-device-cookie',
    });

    const response = await POST(request());

    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe('https://irisos.app/');
    expect(response.cookies.get(DEVICE_ACCESS_COOKIE)?.value).toBe('signed-device-cookie');
  });

  it('rejects invalid or redeemed links', async () => {
    mocks.redeemAuthAccessToken.mockResolvedValue(null);
    const response = await POST(request());
    expect(response.headers.get('location')).toBe('https://irisos.app/access?error=invalid');
  });
});
