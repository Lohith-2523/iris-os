export type LeadExportTimeframe = '1_month' | '3_months' | '6_months' | '1_year' | 'all_time' | 'custom';

export const LEAD_EXPORT_TIMEFRAMES: Array<{ value: LeadExportTimeframe; label: string }> = [
  { value: '1_month', label: '1 month' },
  { value: '3_months', label: '3 months' },
  { value: '6_months', label: '6 months' },
  { value: '1_year', label: '1 year' },
  { value: 'all_time', label: 'All time' },
  { value: 'custom', label: 'Custom time range' },
];

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function subtractCalendarMonths(iso: string, months: number) {
  const [year, month, day] = iso.split('-').map(Number);
  const targetMonthIndex = month - 1 - months;
  const targetYear = year + Math.floor(targetMonthIndex / 12);
  const normalizedMonth = ((targetMonthIndex % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();
  return isoDate(new Date(Date.UTC(targetYear, normalizedMonth, Math.min(day, lastDay))));
}

export function resolveLeadExportTimeframe(timeframe: LeadExportTimeframe, today: string): Record<string, string> | null {
  if (timeframe === 'all_time') return { all: 'true', to: today };
  if (timeframe === 'custom') return null;
  const months = timeframe === '1_month' ? 1 : timeframe === '3_months' ? 3 : timeframe === '6_months' ? 6 : 12;
  return { from: subtractCalendarMonths(today, months), to: today };
}
