import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';
import { createLeadExportWorkbook, getKanbanLeadCutoff, parseLeadExportRange, parseLeadExportRequest } from './lead-archive';

describe('lead archive helpers', () => {
  it('uses a rolling 30-day Kanban window', () => {
    expect(getKanbanLeadCutoff(new Date('2026-08-13T12:00:00.000Z')).toISOString())
      .toBe('2026-07-14T12:00:00.000Z');
  });

  it('creates an inclusive UTC date range', () => {
    const range = parseLeadExportRange('2026-07-01', '2026-07-31');
    expect('error' in range).toBe(false);
    if ('error' in range) return;
    expect(range.start.toISOString()).toBe('2026-07-01T00:00:00.000Z');
    expect(range.endExclusive.toISOString()).toBe('2026-08-01T00:00:00.000Z');
  });

  it('rejects reversed and invalid ranges', () => {
    expect(parseLeadExportRange('2026-08-02', '2026-08-01')).toEqual({ error: 'The start date must be on or before the end date.' });
    expect(parseLeadExportRange('2026-02-30', '2026-03-01')).toEqual({ error: 'Enter valid dates.' });
  });

  it('supports all stored leads through the selected end date', () => {
    const range = parseLeadExportRequest(null, '2026-08-13', true);
    expect('error' in range).toBe(false);
    if ('error' in range) return;
    expect(range.start).toBeNull();
    expect(range.endExclusive.toISOString()).toBe('2026-08-14T00:00:00.000Z');
  });

  it('exports active and archived leads into a readable worksheet', async () => {
    const workbookBytes = await createLeadExportWorkbook([
      {
        leadId: 'lead-1', fullName: 'Avery Stone', email: 'avery@example.com', phone: '+15551234567', status: 'warm',
        collectionMethod: 'Manual Entry', approachMethod: 'Email', funnelName: 'Referral', estimatedClientValue: 42000,
        sourceProvider: 'MANUAL', adId: null, adName: null, campaignId: null, adAccountId: null, pageId: null, formId: null,
        followUpAt: null, lostReason: null, lostDetails: null, createdTime: new Date('2026-06-01T12:00:00.000Z'), convertedClient: null,
      },
    ], new Date('2026-08-13T12:00:00.000Z'));
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(workbookBytes.buffer);
    const sheet = workbook.getWorksheet('Leads');
    expect(sheet?.getCell('B2').value).toBe('Avery Stone');
    expect(sheet?.getCell('F2').value).toBe('Archived');
    expect(sheet?.autoFilter).toBeTruthy();
  });
});
