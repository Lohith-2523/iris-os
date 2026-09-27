export type FinancialDateRange = { start: string; end: string; mode?: 'all-time' };

export function currentFiscalQuarter(now = new Date()): FinancialDateRange {
  const month = now.getUTCMonth();
  const fiscalMonth = (month + 9) % 12;
  const quarterStartMonth = (month - (fiscalMonth % 3) + 12) % 12;
  const startYear = quarterStartMonth > month ? now.getUTCFullYear() - 1 : now.getUTCFullYear();
  const start = new Date(Date.UTC(startYear, quarterStartMonth, 1));
  const end = new Date(Date.UTC(startYear, quarterStartMonth + 3, 0));
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

export function allTimeFinancialRange(fallback = currentFiscalQuarter()): FinancialDateRange {
  return { ...fallback, mode: 'all-time' };
}

export function isAllTimeFinancialRange(range: FinancialDateRange) {
  return range.mode === 'all-time';
}

export function financialRangeLabel(range: FinancialDateRange) {
  if (isAllTimeFinancialRange(range)) return 'All time';
  const { start, end } = range;
  const startDate = new Date(`${start}T00:00:00.000Z`);
  const endDate = new Date(`${end}T00:00:00.000Z`);
  const months = Math.max(1, (endDate.getUTCFullYear() - startDate.getUTCFullYear()) * 12 + endDate.getUTCMonth() - startDate.getUTCMonth() + 1);
  const fiscalYear = startDate.getUTCMonth() >= 3 ? startDate.getUTCFullYear() : startDate.getUTCFullYear() - 1;
  if (months === 1) return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(startDate);
  if (months <= 3) {
    const quarter = Math.floor(((startDate.getUTCMonth() + 9) % 12) / 3) + 1;
    return `Q${quarter} FY ${fiscalYear}`;
  }
  return `${startDate.getUTCMonth() >= 3 && startDate.getUTCMonth() <= 8 ? 'Start' : 'End'} of FY ${fiscalYear}`;
}
