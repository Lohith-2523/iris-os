import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const auth = vi.hoisted(() => ({
  getClaims: vi.fn(),
}));

vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({ auth }),
}));

import { updateSession } from './middleware';
import { createDeviceAccessCookieValue, DEVICE_ACCESS_COOKIE } from './auth-access-cookie';

describe('authentication proxy responses', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://project.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'publishable-key');
    vi.stubEnv('AUTH_ACCESS_SECRET', 'test-auth-access-secret-that-is-long-enough');
    auth.getClaims.mockResolvedValue({ data: null, error: null });
  });

  it('returns JSON 401 for an unauthenticated protected API request', async () => {
    const response = await updateSession(new NextRequest('http://localhost:3000/api/messaging'));

    expect(response.status).toBe(401);
    expect(response.headers.get('content-type')).toContain('application/json');
    await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' });
  });

  it('continues redirecting unauthenticated page requests to login', async () => {
    const response = await updateSession(new NextRequest('http://localhost:3000/messages'));

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost:3000/login');
  });

  it('allows direct login and signup visits without a device grant', async () => {
    for (const path of ['/login', '/signup']) {
      const response = await updateSession(new NextRequest(`http://localhost:3000${path}`));
      expect(response.status).toBe(200);
      expect(response.headers.get('location')).toBeNull();
    }
  });

  it('allows an unexpired signed device grant to open the login page', async () => {
    const request = new NextRequest('http://localhost:3000/login');
    request.cookies.set(DEVICE_ACCESS_COOKIE, createDeviceAccessCookieValue('grant-1', 'device-token', new Date(Date.now() + 60_000)));
    const response = await updateSession(request);
    expect(response.status).toBe(200);
  });

  it('redirects old waitlist links to signup', async () => {
    const response = await updateSession(new NextRequest('https://irisos.app/waitlist?access=required'));
    expect(response.headers.get('location')).toBe('https://irisos.app/signup');
  });

  it('disables public waitlist registration', async () => {
    const response = await updateSession(new NextRequest('https://irisos.app/api/waitlist', { method: 'POST' }));
    expect(response.status).toBe(410);
  });

  it('keeps superadmin sign-in and recovery request pages public', async () => {
    for (const path of ['/admin/login', '/admin/forgot-password']) {
      const response = await updateSession(new NextRequest(`http://localhost:3000${path}`));
      expect(response.status).toBe(200);
    }
  });
});
