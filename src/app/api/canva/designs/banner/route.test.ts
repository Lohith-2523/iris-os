import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  createCanvaBannerDesign: vi.fn(),
  getRequestUser: vi.fn(),
  isOrganizationAdmin: vi.fn(),
}));

vi.mock('@/lib/canva', () => ({
  CanvaIntegrationError: class CanvaIntegrationError extends Error {
    code = 'canva_error';
  },
  createCanvaBannerDesign: mocks.createCanvaBannerDesign,
}));
vi.mock('@/lib/org', () => ({
  getRequestUser: mocks.getRequestUser,
  isOrganizationAdmin: mocks.isOrganizationAdmin,
}));

import { GET } from './route';

describe('GET /api/canva/designs/banner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getRequestUser.mockResolvedValue({
      clientId: 'client-1',
      id: 'user-1',
      orgId: 'org-1',
      role: 'client',
    });
  });

  it('creates a client-targeted Canva design and preserves the client return path', async () => {
    mocks.createCanvaBannerDesign.mockResolvedValue('https://www.canva.com/design/client-banner');

    const response = await GET(new NextRequest('http://localhost:3000/api/canva/designs/banner?target=client'));

    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe('https://www.canva.com/design/client-banner');
    expect(mocks.createCanvaBannerDesign).toHaveBeenCalledWith({
      bannerTarget: { clientId: 'client-1', kind: 'client' },
      orgId: 'org-1',
      returnOrigin: 'http://localhost:3000',
      returnPath: '/client-dashboard',
      userId: 'user-1',
    });
  });

  it('keeps client users in their workspace when Canva is not connected', async () => {
    mocks.createCanvaBannerDesign.mockResolvedValue(null);

    const response = await GET(new NextRequest('http://localhost:3000/api/canva/designs/banner?target=client'));

    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe('http://localhost:3000/client-dashboard?canva=connection_required');
  });
});
