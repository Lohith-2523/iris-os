import { NextRequest, NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ updateSession: vi.fn() }));
vi.mock('@/lib/middleware', () => ({ updateSession: mocks.updateSession }));

import { proxy } from './proxy';

describe('host routing proxy', () => {
  beforeEach(() => {
    mocks.updateSession.mockReset();
    mocks.updateSession.mockResolvedValue(NextResponse.next());
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

  it('keeps the main Iris OS login route unchanged', async () => {
    const request = new NextRequest('https://irisos.app/login');
    const response = await proxy(request);

    expect(response.status).toBe(200);
    expect(mocks.updateSession).toHaveBeenCalledWith(request);
  });
});
