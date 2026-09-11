import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
import { formatPlanMoney, planDisplayName, planPrice, pricingRegionForCountry } from './plan-pricing';
import { countryFromPublicIpHeaders, pricingLocation } from './request-country';

describe('regional plan pricing', () => {
  it('uses India pricing only for the IN public-IP country', () => {
    expect(pricingRegionForCountry('IN')).toBe('INDIA');
    expect(pricingRegionForCountry('US')).toBe('INTERNATIONAL');
    expect(pricingRegionForCountry(null)).toBe('INTERNATIONAL');
  });

  it('calculates the requested base prices and 18% GST in minor units', () => {
    expect(planPrice('BASIC', 'INDIA')).toMatchObject({ name: 'Free', baseAmount: 0, taxAmount: 0, totalAmount: 0, currency: 'INR' });
    expect(planPrice('PRO', 'INDIA')).toMatchObject({ baseAmount: 79_900, taxAmount: 14_382, totalAmount: 94_282, currency: 'INR' });
    expect(planPrice('ADVANCED', 'INDIA')).toMatchObject({ baseAmount: 159_900, taxAmount: 28_782, totalAmount: 188_682, currency: 'INR' });
    expect(planPrice('PRO', 'INTERNATIONAL')).toMatchObject({ baseAmount: 1_599, taxAmount: 288, totalAmount: 1_887, currency: 'USD' });
    expect(planPrice('ADVANCED', 'INTERNATIONAL')).toMatchObject({ baseAmount: 3_199, taxAmount: 576, totalAmount: 3_775, currency: 'USD' });
  });

  it('renders the internal BASIC plan as Free', () => {
    expect(planDisplayName('BASIC')).toBe('Free');
    expect(formatPlanMoney(0, 'INR')).toBe('₹0');
    expect(formatPlanMoney(1_599, 'USD')).toBe('$15.99');
  });

  it('reads supported deployment country headers without exposing an IP', () => {
    expect(countryFromPublicIpHeaders(new Headers({ 'x-vercel-ip-country': 'in' }))).toBe('IN');
    expect(pricingLocation(new Headers({ 'cf-ipcountry': 'GB' }))).toEqual({ country: 'GB', region: 'INTERNATIONAL' });
    expect(pricingLocation(new Headers())).toEqual({ country: null, region: 'INTERNATIONAL' });
  });
});
