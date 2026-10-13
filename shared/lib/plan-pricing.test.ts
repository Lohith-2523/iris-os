import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
import { formatPlanMoney, planDisplayName, planPrice, planPriceWithCoupon, pricingCatalog, pricingRegionForCountry } from './plan-pricing';
import { countryFromPublicIpHeaders, pricingLocation } from './request-country';

describe('regional plan pricing', () => {
  it('uses India pricing only for the IN public-IP country', () => {
    expect(pricingRegionForCountry('IN')).toBe('INDIA');
    expect(pricingRegionForCountry('US')).toBe('INTERNATIONAL');
    expect(pricingRegionForCountry(null)).toBe('INTERNATIONAL');
  });

  it('calculates the requested base prices and 18% GST in minor units', () => {
    expect(planPrice('BASIC', 'INDIA')).toMatchObject({ name: 'Free', listAmount: 0, baseAmount: 0, taxAmount: 0, totalAmount: 0, currency: 'INR' });
    expect(planPrice('PRO', 'INDIA')).toMatchObject({ listAmount: 99_900, baseAmount: 49_900, taxAmount: 8_982, totalAmount: 58_882, currency: 'INR' });
    expect(planPrice('ADVANCED', 'INDIA')).toMatchObject({ listAmount: 199_900, baseAmount: 99_900, taxAmount: 17_982, totalAmount: 117_882, currency: 'INR' });
    expect(planPrice('PRO', 'INTERNATIONAL')).toMatchObject({ listAmount: 2_199, baseAmount: 1_099, taxAmount: 198, totalAmount: 1_297, currency: 'USD' });
    expect(planPrice('ADVANCED', 'INTERNATIONAL')).toMatchObject({ listAmount: 4_999, baseAmount: 2_499, taxAmount: 450, totalAmount: 2_949, currency: 'USD' });
  });

  it('applies coupons to the original list price instead of the promotional price', () => {
    expect(planPriceWithCoupon('PRO', 'INDIA', 10)).toMatchObject({
      listAmount: 99_900,
      baseAmount: 89_910,
      discountAmount: 9_990,
      discountPercent: 10,
      taxAmount: 16_184,
      totalAmount: 106_094,
    });
    expect(planPriceWithCoupon('PRO', 'INDIA', 100)).toMatchObject({ baseAmount: 0, taxAmount: 0, totalAmount: 0 });
    expect(planPriceWithCoupon('PRO', 'INDIA', 50)).toMatchObject({ baseAmount: 49_900, taxAmount: 8_982, totalAmount: 58_882 });
    expect(planPriceWithCoupon('PRO', 'INTERNATIONAL', 50)).toMatchObject({ baseAmount: 1_099, taxAmount: 198, totalAmount: 1_297 });
  });

  it('renders the internal BASIC plan as Free', () => {
    expect(planDisplayName('BASIC')).toBe('Free');
    expect(formatPlanMoney(0, 'INR')).toBe('₹0');
    expect(formatPlanMoney(1_999, 'USD')).toBe('$19.99');
  });

  it('matches the complete pricing strategy feature matrix', () => {
    const [free, pro, advanced] = pricingCatalog('INDIA');
    expect([free.baseAmount, pro.baseAmount, advanced.baseAmount]).toEqual([0, 49_900, 99_900]);
    expect(pro.listAmount).toBe(99_900);
    expect(advanced.listAmount).toBe(199_900);
    expect(free.features.map((feature) => [feature.label, feature.value])).toEqual([
      ['Clients', '5'], ['Projects', '5'], ['Active leads', '20'], ['Team members', '0'],
      ['Core team members', '—'], ['Data Transfer', '300 MB'], ['Miles AI', '✓'],
      ['AI allowance', '20k'], ['Invoices', '3/mo'], ['Reports', 'Basic'], ['Client workspace', 'Limited'],
      ['Automations', 'Limited'], ['Business analytics', 'Basic'], ['Unlimited onboarding', '—'], ['Priority support', '—'],
    ]);
    expect(pro.features.map((feature) => feature.value)).toEqual(['25', '50', '150', '5', '2', '5 GB', '✓✓', '200k', 'Unlimited', 'Advanced', '✓', '✓', '✓', '—', '—']);
    expect(advanced.features.map((feature) => feature.value)).toEqual(['Unlimited', 'Unlimited', '500', '15', '5', '25 GB', '✓✓✓', '500k', 'Unlimited', 'Advanced', '✓', '✓✓', '✓✓', '✓', '✓']);
  });

  it('reads supported deployment country headers without exposing an IP', () => {
    expect(countryFromPublicIpHeaders(new Headers({ 'x-vercel-ip-country': 'in' }))).toBe('IN');
    expect(pricingLocation(new Headers({ 'cf-ipcountry': 'GB' }))).toEqual({ country: 'GB', region: 'INTERNATIONAL' });
    expect(pricingLocation(new Headers())).toEqual({ country: null, region: 'INTERNATIONAL' });
  });
});
