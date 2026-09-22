import { describe, expect, it } from 'vitest';
import { resolveLeadExportTimeframe } from './lead-export-timeframe';

describe('lead export timeframe presets', () => {
  it.each([
    ['1_month', '2026-07-13'],
    ['3_months', '2026-05-13'],
    ['6_months', '2026-02-13'],
    ['1_year', '2025-08-13'],
  ] as const)('resolves %s through today', (timeframe, expectedFrom) => {
    expect(resolveLeadExportTimeframe(timeframe, '2026-08-13')).toEqual({ from: expectedFrom, to: '2026-08-13' });
  });

  it('clamps calendar month presets at month end', () => {
    expect(resolveLeadExportTimeframe('1_month', '2026-03-31')).toEqual({ from: '2026-02-28', to: '2026-03-31' });
  });

  it('uses an open start for all time and leaves custom dates to the user', () => {
    expect(resolveLeadExportTimeframe('all_time', '2026-08-13')).toEqual({ all: 'true', to: '2026-08-13' });
    expect(resolveLeadExportTimeframe('custom', '2026-08-13')).toBeNull();
  });
});

