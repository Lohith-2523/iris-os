import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  connectCanva: vi.fn(),
  exportCanvaBannerToWorkspace: vi.fn(),
  readCanvaOAuthAttempt: vi.fn(),
  readCanvaOAuthState: vi.fn(),
}));

vi.mock('@/lib/canva', () => ({
  CANVA_OAUTH_COOKIE: 'canva_oauth',
  CanvaIntegrationError: class CanvaIntegrationError extends Error { code = 'canva_error'; },
  canvaRedirectUri: () => 'https://iris.example/api/canva/callback',
  connectCanva: mocks.connectCanva,
  exportCanvaBannerToWorkspace: mocks.exportCanvaBannerToWorkspace,
  readCanvaOAuthAttempt: mocks.readCanvaOAuthAttempt,
  readCanvaOAuthState: mocks.readCanvaOAuthState,
}));

import { GET } from './route';

describe('GET /api/canva/callback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.readCanvaOAuthState.mockReturnValue({
      orgId: 'org-1',
      returnOrigin: 'https://iris.example',
      returnTo: '/api/canva/designs/banner',
    });
    mocks.readCanvaOAuthAttempt.mockResolvedValue({ verifier: 'pkce-verifier' });
    mocks.connectCanva.mockResolvedValue(undefined);
  });

  it('continues the banner flow with a 303 after Canva OAuth', async () => {
    const request = new NextRequest('https://iris.example/api/canva/callback?state=state-1&code=code-1', {
      headers: { cookie: 'canva_oauth=encrypted-attempt' },
    });

    const response = await GET(request);

    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe('https://iris.example/api/canva/designs/banner');
    expect(response.headers.get('set-cookie')).toContain('canva_oauth=;');
  });

  it('exports a returned banner when Canva sends correlation_jwt to the OAuth callback URL', async () => {
    mocks.exportCanvaBannerToWorkspace.mockResolvedValue({
      returnOrigin: 'https://iris.example',
      returnPath: '/client-dashboard',
    });

    const response = await GET(new NextRequest(
      'https://iris.example/api/canva/callback?correlation_jwt=signed-return',
    ));

    expect(mocks.exportCanvaBannerToWorkspace).toHaveBeenCalledWith('signed-return');
    expect(mocks.readCanvaOAuthState).not.toHaveBeenCalled();
    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe(
      'https://iris.example/client-dashboard?canva=banner_exported',
    );
  });
});
