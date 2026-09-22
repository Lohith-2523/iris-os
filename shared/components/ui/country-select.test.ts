import { describe, expect, it } from 'vitest';
import { COUNTRY_OPTIONS, filterCountryOptions } from './country-select';

describe('country selection options', () => {
  it('uses the complete ISO country list', () => {
    expect(COUNTRY_OPTIONS.length).toBeGreaterThan(240);
  });

  it('filters by country name or ISO code', () => {
    expect(filterCountryOptions('united king')).toContainEqual({ code: 'GB', name: 'United Kingdom' });
    expect(filterCountryOptions('IN')).toContainEqual({ code: 'IN', name: 'India' });
  });
});
