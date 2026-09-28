import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  getRequestUser: vi.fn(),
}));

vi.mock('@/lib/db', () => ({ prisma: { report: { findMany: mocks.findMany } } }));
vi.mock('@/lib/org', () => ({ getRequestUser: mocks.getRequestUser }));
vi.mock('server-only', () => ({}));

import { GET } from './route';

describe('GET /api/reports', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getRequestUser.mockResolvedValue({ orgId: 'org-1' });
  });

  it('makes historical reports available to view and download', async () => {
    mocks.findMany.mockResolvedValue([{
      createdAt: new Date('2025-03-02T00:00:00.000Z'),
      createdBy: { name: 'Asha' },
      id: 'historical-report',
      status: 'READY',
      summary: 'A plain-text report saved before structured report snapshots existed.',
      title: 'Historical report',
      type: 'FINANCE',
    }]);

    const response = await GET(new Request('http://localhost:3000/api/reports'));
    const reports = await response.json();

    expect(response.status).toBe(200);
    expect(reports[0]).toMatchObject({
      id: 'historical-report',
      pageCount: null,
      pdfUrl: '/api/reports/historical-report/pdf',
    });
  });
});
