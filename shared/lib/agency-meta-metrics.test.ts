import { describe, expect, it } from 'vitest';
import { calculateAgencyMetaMetrics } from './agency-meta-metrics';

describe('calculateAgencyMetaMetrics', () => {
  it('aggregates provider delivery metrics and derives rates', () => {
    expect(calculateAgencyMetaMetrics([
      { spend: 120, reach: 900, impressions: 1200, clicks: 60, leadsCount: 12 },
      { spend: 80, reach: 600, impressions: 800, clicks: 40, leadsCount: 8 },
    ])).toEqual({
      spend: 200,
      reach: 1500,
      impressions: 2000,
      clicks: 100,
      leadsCount: 20,
      ctr: 5,
      cpc: 2,
      cpm: 100,
      costPerLead: 10,
    });
  });

  it('returns null rates when a denominator is unavailable', () => {
    expect(calculateAgencyMetaMetrics([])).toEqual({
      spend: 0,
      reach: 0,
      impressions: 0,
      clicks: 0,
      leadsCount: 0,
      ctr: null,
      cpc: null,
      cpm: null,
      costPerLead: null,
    });
  });
});
