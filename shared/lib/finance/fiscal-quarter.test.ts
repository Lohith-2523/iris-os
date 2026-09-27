import { describe, expect, it } from 'vitest';
import { allTimeFinancialRange, currentFiscalQuarter, financialRangeLabel, isAllTimeFinancialRange } from './fiscal-quarter';

describe('fiscal quarter range', () => {
  it('uses the April-based fiscal quarter containing the current date', () => {
    const range = currentFiscalQuarter(new Date('2026-09-27T12:00:00.000Z'));
    expect(range).toEqual({ start: '2026-07-01', end: '2026-09-30' });
    expect(financialRangeLabel(range)).toBe('Q2 FY 2026');
  });

  it('crosses the calendar-year boundary for the final fiscal quarter', () => {
    const range = currentFiscalQuarter(new Date('2027-01-15T12:00:00.000Z'));
    expect(range).toEqual({ start: '2027-01-01', end: '2027-03-31' });
    expect(financialRangeLabel(range)).toBe('Q4 FY 2026');
  });

  it('represents all time without discarding the selected-date fallback', () => {
    const quarter = currentFiscalQuarter(new Date('2026-09-27T12:00:00.000Z'));
    const range = allTimeFinancialRange(quarter);

    expect(range).toEqual({ start: '2026-07-01', end: '2026-09-30', mode: 'all-time' });
    expect(isAllTimeFinancialRange(range)).toBe(true);
    expect(financialRangeLabel(range)).toBe('All time');
  });
});
