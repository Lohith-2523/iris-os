import { NextRequest } from 'next/server';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const auth = vi.hoisted(() => ({
  getClaims: vi.fn(),
}));

vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({ auth }),
}));

import { updateSession } from './middleware';

describe('authentication proxy responses', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-01T00:00:00.000Z'));
    vi.clearAllMocks();
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://project.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'publishable-key');
    vi.stubEnv('AUTH_ACCESS_SECRET', 'test-auth-access-secret-that-is-long-enough');
    auth.getClaims.mockResolvedValue({ data: null, error: null });
  });

  afterAll(() => vi.useRealTimers());

  it('returns JSON 401 for an unauthenticated protected API request', async () => {
    const response = await updateSession(new NextRequest('http://localhost:3000/api/messaging'));

    expect(response.status).toBe(401);
    expect(response.headers.get('content-type')).toContain('application/json');
    await expect(response.json()).resolves.toEqual({ error: 'Oops! Please sign in to continue.' });
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

  it('redirects the retired waitlist page to signup', async () => {
    const response = await updateSession(new NextRequest('https://irisos.app/waitlist'));
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://irisos.app/signup');
  });

  it('rejects retired waitlist registrations', async () => {
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
