import { describe, expect, it } from 'vitest';
import {
  clientPortfolioValueForYear,
  projectPortfolioValueForYear,
} from './portfolio-value';

function date(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

describe('projectPortfolioValueForYear', () => {
  it('counts only the three contracted monthly retainer installments', () => {
    expect(projectPortfolioValueForYear({
      startDate: date('2026-01-01'),
      endDate: date('2026-03-31'),
      paymentType: 'RETAINER',
      paymentAmount: 100_000,
      paymentFrequency: 'monthly',
      paymentStartDate: date('2026-01-01'),
    }, 2026)).toBe(300_000);
  });

  it('counts a one-time project exactly once', () => {
    expect(projectPortfolioValueForYear({
      startDate: date('2026-04-01'),
      endDate: date('2026-05-31'),
      paymentType: 'ONE_TIME',
      paymentAmount: 200_000,
      paymentFrequency: null,
      paymentStartDate: date('2026-04-01'),
    }, 2026)).toBe(200_000);
  });

  it('does not forecast an open-ended retainer', () => {
    expect(projectPortfolioValueForYear({
      startDate: date('2026-06-01'),
      endDate: null,
      paymentType: 'RETAINER',
      paymentAmount: 50_000,
      paymentFrequency: 'monthly',
      paymentStartDate: null,
    }, 2026)).toBe(50_000);
  });

  it('aggregates actual contract face values for the year', () => {
    expect(clientPortfolioValueForYear([
      {
        startDate: date('2026-01-01'),
        endDate: date('2026-03-31'),
        paymentType: 'RETAINER',
        paymentAmount: 100_000,
        paymentFrequency: 'monthly',
        paymentStartDate: date('2026-01-01'),
      },
      {
        startDate: date('2026-04-01'),
        endDate: date('2026-05-31'),
        paymentType: 'ONE_TIME',
        paymentAmount: 200_000,
        paymentFrequency: null,
        paymentStartDate: date('2026-04-01'),
      },
    ], 2026)).toBe(500_000);
  });
});
