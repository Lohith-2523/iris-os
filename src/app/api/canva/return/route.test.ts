import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  exportCanvaBannerToWorkspace: vi.fn(),
}));

vi.mock('@/lib/canva', () => ({
  CanvaIntegrationError: class CanvaIntegrationError extends Error {
    code = 'canva_error';
  },
  exportCanvaBannerToWorkspace: mocks.exportCanvaBannerToWorkspace,
}));

import { GET } from './route';

describe('GET /api/canva/return', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns to the target workspace after automatically exporting the Canva design', async () => {
    mocks.exportCanvaBannerToWorkspace.mockResolvedValue({
      returnOrigin: 'https://iris.example',
      returnPath: '/client-dashboard',
    });

    const response = await GET(new NextRequest('http://localhost:3000/api/canva/return?correlation_jwt=signed-return'));

    expect(mocks.exportCanvaBannerToWorkspace).toHaveBeenCalledWith('signed-return');
    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe('https://iris.example/client-dashboard?canva=banner_exported');
  });
});
