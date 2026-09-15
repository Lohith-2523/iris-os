import { describe, expect, it } from 'vitest';
import { COUNTRY_CALLING_OPTIONS, shouldOpenDropdownAbove } from './country-phone-input';

describe('international phone calling-code options', () => {
  it('uses the complete libphonenumber country metadata', () => {
    expect(COUNTRY_CALLING_OPTIONS.length).toBeGreaterThan(240);
  });

  it.each([
    ['India', '+91'],
    ['United Kingdom', '+44'],
    ['United States', '+1'],
    ['Canada', '+1'],
  ])('maps %s to %s', (countryName, callingCode) => {
    expect(COUNTRY_CALLING_OPTIONS).toContainEqual(expect.objectContaining({
      name: countryName,
      callingCode,
    }));
  });
});

describe('calling-code menu placement', () => {
  it('opens above when bottom space is constrained', () => {
    expect(shouldOpenDropdownAbove({ top: 620, bottom: 664 }, 720)).toBe(true);
  });

  it('stays below when enough bottom space remains', () => {
    expect(shouldOpenDropdownAbove({ top: 100, bottom: 144 }, 720)).toBe(false);
  });
});
