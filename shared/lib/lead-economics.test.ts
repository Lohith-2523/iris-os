import { describe, expect, it } from 'vitest';
import { calculateLeadEconomics, isLeadAcquisitionExpense } from './lead-economics';

describe('lead economics', () => {
  it.each([
    'Google Ads campaign',
    'Lead generation vendor',
    'Facebook ad spend',
    'Monthly leads platform',
    'Advertising expense',
  ])('recognizes acquisition expense variation: %s', (details) => {
    expect(isLeadAcquisitionExpense(details)).toBe(true);
  });

  it.each(['Admin charge', 'Paid contractor invoice', 'Software subscription'])(
    'does not match unrelated text: %s',
    (details) => {
      expect(isLeadAcquisitionExpense(details)).toBe(false);
    },
  );

  it('calculates CAC and ROAS from absolute acquisition spend', () => {
    expect(calculateLeadEconomics({
      expenseTransactions: [
        { details: 'Google Ads', amount: -1_000 },
        { details: 'Lead generation', amount: 500 },
        { details: 'Office rent', amount: -2_000 },
      ],
      closedLeadCount: 3,
      sourcedRetainerRevenue: 6_000,
    })).toEqual({
      marketingSpend: 1_500,
      closedLeadCount: 3,
      sourcedRetainerRevenue: 6_000,
      averageCac: 500,
      averageRoas: 4,
    });
  });

  it('returns unavailable ratios when their denominator is zero', () => {
    const result = calculateLeadEconomics({
      expenseTransactions: [],
      closedLeadCount: 0,
      sourcedRetainerRevenue: 0,
    });

    expect(result.averageCac).toBeNull();
    expect(result.averageRoas).toBeNull();
  });
});
