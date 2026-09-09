import { describe, expect, it } from 'vitest';
import { MAJOR_CURRENCIES, MAJOR_CURRENCY_CODES, currencySymbol } from './currencies';

describe('major currencies', () => {
  it('offers 50 unique ISO currency codes', () => {
    expect(MAJOR_CURRENCIES).toHaveLength(50);
    expect(new Set(MAJOR_CURRENCY_CODES).size).toBe(50);
    expect(MAJOR_CURRENCY_CODES).toEqual(expect.arrayContaining(['USD', 'EUR', 'GBP', 'INR', 'JPY', 'CNY', 'AED']));
  });

  it('resolves display symbols without assuming dollars', () => {
    expect(currencySymbol('JPY')).toBe('¥');
    expect(currencySymbol('GBP')).toBe('£');
  });
});
