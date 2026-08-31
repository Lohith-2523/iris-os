import { describe, expect, it } from 'vitest';
import { formatCurrencyFor } from './utils';

describe('formatCurrencyFor', () => {
  it('formats identical server and client snapshots from explicit currency', () => {
    expect(formatCurrencyFor(25_000, 'USD')).toBe('$25,000');
    expect(formatCurrencyFor(25_000, 'INR')).toBe('₹25,000');
  });

  it('preserves requested decimal precision', () => {
    expect(formatCurrencyFor(12.5, 'INR', 2)).toBe('₹12.50');
  });
});
