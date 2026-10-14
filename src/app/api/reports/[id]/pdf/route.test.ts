import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  getRequestUser: vi.fn(),
}));

vi.mock('@/lib/db', () => ({ prisma: { report: { findFirst: mocks.findFirst } } }));
vi.mock('@/lib/org', () => ({ getRequestUser: mocks.getRequestUser }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/documents/rendered-artifact', () => ({
  artifactSourceVersion: () => 'report-version',
  readRenderedArtifact: vi.fn().mockResolvedValue(null),
  writeRenderedArtifact: vi.fn().mockResolvedValue(undefined),
}));

import { GET } from './route';

describe('GET /api/reports/[id]/pdf', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getRequestUser.mockResolvedValue({ orgId: 'org-1', role: 'admin' });
  });

  it('opens historical plain-text Miles reports as PDFs', async () => {
    mocks.findFirst.mockResolvedValue({
      createdAt: new Date('2026-01-15T00:00:00.000Z'),
      id: 'report-1',
      orgId: 'org-1',
      organization: {
        invoiceBrandColor: '#4A435F',
        invoiceLogoDataUrl: null,
        legalEntityName: null,
        name: 'Studio North',
      },
      summary: '# Executive summary\n\nRevenue grew 12%.\n\n## Next actions\n\n- Protect margin.',
      title: 'Historical performance report',
      type: 'FINANCIAL',
    });

    const response = await GET(
      new NextRequest('http://localhost:3000/api/reports/report-1/pdf?view=1'),
      { params: Promise.resolve({ id: 'report-1' }) },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/pdf');
    expect(response.headers.get('content-disposition')).toContain('inline');
    expect((await response.arrayBuffer()).byteLength).toBeGreaterThan(3_000);
  });
});
