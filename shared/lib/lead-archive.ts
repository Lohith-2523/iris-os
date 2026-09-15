import ExcelJS from 'exceljs';

export const KANBAN_LEAD_RETENTION_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1_000;

export function getKanbanLeadCutoff(now = new Date()) {
  return new Date(now.getTime() - KANBAN_LEAD_RETENTION_DAYS * DAY_MS);
}

function parseDateOnly(value: string, boundary: 'start' | 'end') {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day + (boundary === 'end' ? 1 : 0)));
  const validation = new Date(Date.UTC(year, month - 1, day));
  if (
    validation.getUTCFullYear() !== year
    || validation.getUTCMonth() !== month - 1
    || validation.getUTCDate() !== day
  ) return null;
  return parsed;
}

export function parseLeadExportRange(from: string | null, to: string | null) {
  if (!from || !to) return { error: 'Choose a start and end date.' } as const;
  const start = parseDateOnly(from, 'start');
  const endExclusive = parseDateOnly(to, 'end');
  if (!start || !endExclusive) return { error: 'Enter valid dates.' } as const;
  if (start >= endExclusive) return { error: 'The start date must be on or before the end date.' } as const;
  return { start, endExclusive, from, to } as const;
}

export function parseLeadExportRequest(from: string | null, to: string | null, allTime: boolean) {
  if (!allTime) return parseLeadExportRange(from, to);
  if (!to) return { error: 'Choose an end date.' } as const;
  const endExclusive = parseDateOnly(to, 'end');
  if (!endExclusive) return { error: 'Enter a valid end date.' } as const;
  return { start: null, endExclusive, from: 'all-time', to } as const;
}

export type ExportableAgencyLead = {
  leadId: string;
  fullName: string;
  email: string;
  phone: string | null;
  status: string;
  collectionMethod: string | null;
  approachMethod: string | null;
  funnelName: string | null;
  estimatedClientValue: number | null;
  sourceProvider: string | null;
  adId: string | null;
  adName: string | null;
  campaignId: string | null;
  adAccountId: string | null;
  pageId: string | null;
  formId: string | null;
  followUpAt: Date | null;
  lostReason: string | null;
  lostDetails: string | null;
  createdTime: Date;
  convertedClient: { name: string } | null;
};

export async function createLeadExportWorkbook(leads: ExportableAgencyLead[], now = new Date()) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'CrystalOS';
  workbook.created = now;
  workbook.modified = now;

  const sheet = workbook.addWorksheet('Leads', {
    properties: { defaultRowHeight: 20 },
    views: [{ state: 'frozen', ySplit: 1 }],
  });
  sheet.columns = [
    { header: 'Lead ID', key: 'leadId', width: 38 },
    { header: 'Full name', key: 'fullName', width: 28 },
    { header: 'Email', key: 'email', width: 34 },
    { header: 'Phone', key: 'phone', width: 20 },
    { header: 'Pipeline status', key: 'status', width: 18 },
    { header: 'Storage state', key: 'storageState', width: 16 },
    { header: 'Source', key: 'source', width: 18 },
    { header: 'Collection method', key: 'collectionMethod', width: 20 },
    { header: 'Approach method', key: 'approachMethod', width: 20 },
    { header: 'Funnel / details', key: 'funnelName', width: 30 },
    { header: 'Estimated client value', key: 'estimatedClientValue', width: 24 },
    { header: 'Lead acquired at', key: 'createdTime', width: 22 },
    { header: 'Follow-up at', key: 'followUpAt', width: 22 },
    { header: 'Lost reason', key: 'lostReason', width: 24 },
    { header: 'Lost details', key: 'lostDetails', width: 34 },
    { header: 'Converted client', key: 'convertedClient', width: 28 },
    { header: 'Meta ad', key: 'adName', width: 28 },
    { header: 'Meta ad ID', key: 'adId', width: 24 },
    { header: 'Meta campaign ID', key: 'campaignId', width: 24 },
    { header: 'Meta ad account ID', key: 'adAccountId', width: 24 },
    { header: 'Meta page ID', key: 'pageId', width: 24 },
    { header: 'Meta form ID', key: 'formId', width: 24 },
  ];

  const cutoff = getKanbanLeadCutoff(now);
  for (const lead of leads) {
    sheet.addRow({
      leadId: lead.leadId,
      fullName: lead.fullName,
      email: lead.email,
      phone: lead.phone || '',
      status: lead.status,
      storageState: lead.createdTime < cutoff ? 'Archived' : 'Active',
      source: lead.sourceProvider || '',
      collectionMethod: lead.collectionMethod || '',
      approachMethod: lead.approachMethod || '',
      funnelName: lead.funnelName || '',
      estimatedClientValue: lead.estimatedClientValue,
      createdTime: lead.createdTime,
      followUpAt: lead.followUpAt,
      lostReason: lead.lostReason || '',
      lostDetails: lead.lostDetails || '',
      convertedClient: lead.convertedClient?.name || '',
      adName: lead.adName || '',
      adId: lead.adId || '',
      campaignId: lead.campaignId || '',
      adAccountId: lead.adAccountId || '',
      pageId: lead.pageId || '',
      formId: lead.formId || '',
    });
  }

  const header = sheet.getRow(1);
  header.height = 28;
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF18181B' } };
  header.alignment = { vertical: 'middle' };
  header.eachCell((cell) => {
    cell.border = { bottom: { style: 'medium', color: { argb: 'FF71717A' } } };
  });

  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    row.alignment = { vertical: 'top' };
    if (rowNumber % 2 === 0) {
      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4F4F5' } };
    }
    row.getCell('K').numFmt = '#,##0.00';
    row.getCell('L').numFmt = 'yyyy-mm-dd hh:mm';
    row.getCell('M').numFmt = 'yyyy-mm-dd hh:mm';
  }
  sheet.autoFilter = { from: 'A1', to: 'V1' };

  return new Uint8Array(await workbook.xlsx.writeBuffer());
}
