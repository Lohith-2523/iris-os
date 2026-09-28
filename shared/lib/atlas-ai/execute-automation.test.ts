import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  buildAtlasReportDocument: vi.fn(),
  createReport: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  prisma: { report: { create: mocks.createReport } },
}));
vi.mock('@/lib/reports/data', () => ({
  buildAtlasReportDocument: mocks.buildAtlasReportDocument,
}));
vi.mock('@/lib/invoices/service', () => ({
  createAndSendProformaInvoice: vi.fn(),
  createAndSendProjectInvoice: vi.fn(),
}));
vi.mock('@/lib/projects/commercial', () => ({ parseProjectCommercials: vi.fn() }));
vi.mock('@/lib/projects/stages', () => ({ normalizeProjectStageColor: vi.fn() }));

import { executeAtlasAutomation, reportKindForAutomation } from './execute-automation';

describe('Miles report automation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.buildAtlasReportDocument.mockResolvedValue({
      version: 1,
      kind: 'EXECUTIVE',
      title: 'Q3 agency performance',
      generatedAt: '2026-09-28T00:00:00.000Z',
      periodLabel: 'Current workspace snapshot',
      requestedFocus: 'Revenue, delivery risk, and next actions',
      atlasNarrative: 'Detailed narrative',
      metrics: [],
      highlights: [],
      sections: [
        { title: 'Clients', description: '', columns: [], rows: [] },
        { title: 'Projects', description: '', columns: [], rows: [] },
      ],
      recommendations: [],
      methodology: 'Workspace data',
    });
    mocks.createReport.mockResolvedValue({ id: 'report-1', title: 'Q3 agency performance' });
  });

  it('maps conversational report requests to Reporting page datasets', () => {
    expect(reportKindForAutomation('financial', 'Agency overview')).toBe('EXECUTIVE');
    expect(reportKindForAutomation('operations', 'Project delivery risks')).toBe('PROJECTS');
    expect(reportKindForAutomation('performance', 'Lead pipeline conversion')).toBe('LEADS');
    expect(reportKindForAutomation('creative', 'Campaign and ad performance')).toBe('MARKETING');
    expect(reportKindForAutomation('capacity', 'Team workload')).toBe('TEAM');
  });

  it('uses the structured Reporting document and PDF flow for a Miles report', async () => {
    const result = await executeAtlasAutomation({
      state: {
        kind: 'REPORT',
        awaitingConfirmation: false,
        decisionMode: false,
        decisionRationale: '',
        decisionEvidence: [],
        draft: {
          title: 'Q3 agency performance',
          reportType: 'FINANCIAL',
          reportFocus: 'Revenue, delivery risk, and next actions',
        },
      } as never,
      orgId: 'org-1',
      userId: 'user-1',
      baseUrl: 'https://iris.example',
      workspaceContext: 'legacy chat context',
      tokenBudget: {
        orgId: 'org-1',
        userId: 'user-1',
        userRole: 'admin',
        plan: 'ADVANCED',
      },
    });

    expect(mocks.buildAtlasReportDocument).toHaveBeenCalledWith(
      'org-1',
      'user-1',
      'admin',
      'EXECUTIVE',
      undefined,
      {
        title: 'Q3 agency performance',
        focus: 'Revenue, delivery risk, and next actions',
      },
    );
    expect(mocks.createReport).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: 'Q3 agency performance',
        type: 'EXECUTIVE',
        filePath: 'DYNAMIC_PDF_V1',
        summary: expect.stringContaining('"version":1'),
      }),
    });
    expect(result.message).toContain('/api/reports/report-1/pdf');
  });
});
