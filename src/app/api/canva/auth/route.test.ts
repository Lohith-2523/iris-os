import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  createCanvaAuthorization: vi.fn(),
  getRequestUser: vi.fn(),
  isOrganizationAdmin: vi.fn(),
}));

vi.mock('@/lib/canva', () => ({
  CANVA_OAUTH_COOKIE: 'canva_oauth',
  CanvaIntegrationError: class CanvaIntegrationError extends Error { code = 'canva_error'; },
  canvaRedirectUri: () => 'https://iris.example/api/canva/callback',
  createCanvaAuthorization: mocks.createCanvaAuthorization,
}));
vi.mock('@/lib/org', () => ({
  getRequestUser: mocks.getRequestUser,
  isOrganizationAdmin: mocks.isOrganizationAdmin,
}));

import { GET } from './route';

describe('GET /api/canva/auth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getRequestUser.mockResolvedValue({ id: 'user-1', orgId: 'org-1' });
    mocks.isOrganizationAdmin.mockReturnValue(true);
    mocks.createCanvaAuthorization.mockResolvedValue({
      authorizationUrl: 'https://www.canva.com/api/oauth/authorize?state=state-1',
      cookieValue: 'encrypted-attempt',
    });
  });

  it('uses a same-method-safe redirect without falling back to 307', async () => {
    const response = await GET(new NextRequest('https://iris.example/api/canva/auth'));

    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe('https://www.canva.com/api/oauth/authorize?state=state-1');
    expect(response.headers.get('set-cookie')).toContain('canva_oauth=encrypted-attempt');
  });
});
