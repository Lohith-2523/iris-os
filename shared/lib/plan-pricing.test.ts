import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
import { formatPlanMoney, planDisplayName, planPrice, pricingCatalog, pricingRegionForCountry } from './plan-pricing';
import { countryFromPublicIpHeaders, pricingLocation } from './request-country';

describe('regional plan pricing', () => {
  it('uses India pricing only for the IN public-IP country', () => {
    expect(pricingRegionForCountry('IN')).toBe('INDIA');
    expect(pricingRegionForCountry('US')).toBe('INTERNATIONAL');
    expect(pricingRegionForCountry(null)).toBe('INTERNATIONAL');
  });

  it('calculates the requested base prices and 18% GST in minor units', () => {
    expect(planPrice('BASIC', 'INDIA')).toMatchObject({ name: 'Free', listAmount: 0, baseAmount: 0, taxAmount: 0, totalAmount: 0, currency: 'INR' });
    expect(planPrice('PRO', 'INDIA')).toMatchObject({ listAmount: 159_900, baseAmount: 79_900, taxAmount: 14_382, totalAmount: 94_282, currency: 'INR' });
    expect(planPrice('ADVANCED', 'INDIA')).toMatchObject({ listAmount: 319_900, baseAmount: 159_900, taxAmount: 28_782, totalAmount: 188_682, currency: 'INR' });
    expect(planPrice('PRO', 'INTERNATIONAL')).toMatchObject({ listAmount: 3_999, baseAmount: 1_999, taxAmount: 360, totalAmount: 2_359, currency: 'USD' });
    expect(planPrice('ADVANCED', 'INTERNATIONAL')).toMatchObject({ listAmount: 7_999, baseAmount: 3_999, taxAmount: 720, totalAmount: 4_719, currency: 'USD' });
  });

  it('renders the internal BASIC plan as Free', () => {
    expect(planDisplayName('BASIC')).toBe('Free');
    expect(formatPlanMoney(0, 'INR')).toBe('₹0');
    expect(formatPlanMoney(1_999, 'USD')).toBe('$19.99');
  });

  it('matches the complete pricing strategy feature matrix', () => {
    const [free, pro, advanced] = pricingCatalog('INDIA');
    expect([free.baseAmount, pro.baseAmount, advanced.baseAmount]).toEqual([0, 79_900, 159_900]);
    expect(pro.listAmount).toBe(159_900);
    expect(advanced.listAmount).toBe(319_900);
    expect(free.features.map((feature) => [feature.label, feature.value])).toEqual([
      ['Clients', '5'], ['Projects', '5'], ['Active leads', '20'], ['Team members', '0'],
      ['Core team members', '—'], ['Data Transfer', '300 MB'], ['Atlas AI', '✓'],
      ['AI allowance', '20k'], ['Invoices', '3/mo'], ['Reports', 'Basic'], ['Client workspace', 'Limited'],
      ['Automations', 'Limited'], ['Business analytics', 'Basic'], ['Unlimited onboarding', '—'], ['Priority support', '—'],
    ]);
    expect(pro.features.map((feature) => feature.value)).toEqual(['25', '50', '150', '5', '2', '5 GB', '✓✓', '500k', 'Unlimited', 'Advanced', '✓', '✓', '✓', '—', '—']);
    expect(advanced.features.map((feature) => feature.value)).toEqual(['Unlimited', 'Unlimited', '500', '15', '5', '25 GB', '✓✓✓', '1M', 'Unlimited', 'Advanced', '✓', '✓✓', '✓✓', '✓', '✓']);
  });

  it('reads supported deployment country headers without exposing an IP', () => {
    expect(countryFromPublicIpHeaders(new Headers({ 'x-vercel-ip-country': 'in' }))).toBe('IN');
    expect(pricingLocation(new Headers({ 'cf-ipcountry': 'GB' }))).toEqual({ country: 'GB', region: 'INTERNATIONAL' });
    expect(pricingLocation(new Headers())).toEqual({ country: null, region: 'INTERNATIONAL' });
  });
});
