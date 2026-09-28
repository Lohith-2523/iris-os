export const REPORT_KINDS = [
  'EXECUTIVE',
  'LEADS',
  'MARKETING',
  'CLIENTS',
  'PROJECTS',
  'TEAM',
] as const;

export type ReportKind = typeof REPORT_KINDS[number];

export type ReportMetric = {
  label: string;
  value: string;
  detail?: string;
};

export type ReportSection = {
  title: string;
  description: string;
  columns: string[];
  rows: string[][];
};

export type AtlasReportDocument = {
  version: 1;
  kind: ReportKind;
  title: string;
  generatedAt: string;
  periodLabel: string;
  clientId?: string;
  clientName?: string;
  requestedFocus?: string;
  atlasNarrative: string;
  metrics: ReportMetric[];
  highlights: string[];
  sections: [ReportSection, ReportSection];
  recommendations: string[];
  methodology: string;
};

export function parseAtlasReportDocument(value: string | null): AtlasReportDocument | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as AtlasReportDocument;
    return parsed?.version === 1 && REPORT_KINDS.includes(parsed.kind) ? parsed : null;
  } catch {
    return null;
  }
}
