import { NextRequest, NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ updateSession: vi.fn() }));
vi.mock('@/lib/middleware', () => ({ updateSession: mocks.updateSession }));

import { proxy } from './proxy';
import { resetRequestRateLimitsForTesting } from '@/lib/request-rate-limit';

describe('host routing proxy', () => {
  beforeEach(() => {
    mocks.updateSession.mockReset();
    mocks.updateSession.mockResolvedValue(NextResponse.next());
    resetRequestRateLimitsForTesting();
  });

  it.each(['/', '/login'])(
    'redirects superadmin %s to the superadmin login',
    async (pathname) => {
      const response = await proxy(new NextRequest(`https://superadmin.irisos.app${pathname}`));

      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toBe('https://superadmin.irisos.app/admin/login');
      expect(mocks.updateSession).not.toHaveBeenCalled();
    },
  );

  it('serves public pages without invoking Supabase auth', async () => {
    const request = new NextRequest('https://irisos.app/login');
    const response = await proxy(request);

    expect(response.status).toBe(200);
    expect(mocks.updateSession).not.toHaveBeenCalled();
  });

  it('keeps regional pricing public without invoking Supabase auth', async () => {
    const response = await proxy(new NextRequest('https://irisos.app/api/pricing'));

    expect(response.status).toBe(200);
    expect(response.headers.get('x-ratelimit-category')).toBe('LIGHT_CRITICAL');
    expect(mocks.updateSession).not.toHaveBeenCalled();
  });

  it('lets API handlers own authentication without a duplicate Proxy lookup', async () => {
    const response = await proxy(new NextRequest('https://irisos.app/api/messaging'));

    expect(response.status).toBe(200);
    expect(response.headers.get('x-ratelimit-category')).toBeTruthy();
    expect(mocks.updateSession).not.toHaveBeenCalled();
  });

  it('continues authenticating protected application pages', async () => {
    const request = new NextRequest('https://irisos.app/dashboard');
    await proxy(request);
    expect(mocks.updateSession).toHaveBeenCalledWith(request);
  });
});
