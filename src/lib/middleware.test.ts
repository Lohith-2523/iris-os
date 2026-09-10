import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const auth = vi.hoisted(() => ({
  getClaims: vi.fn(),
}));

vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({ auth }),
}));

import { updateSession } from './middleware';

describe('authentication proxy responses', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://project.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'publishable-key');
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
});
