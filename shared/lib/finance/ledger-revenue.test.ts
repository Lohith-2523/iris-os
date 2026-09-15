import { describe, expect, it } from 'vitest';
import { sumLedgerRevenue } from './ledger-revenue';

describe('ledger revenue', () => {
  it('recognizes only positive Revenue ledger entries', () => {
    expect(sumLedgerRevenue([
      { category: 'Revenue', amount: 35_000, date: new Date('2026-07-28') },
      { category: 'Expense', amount: -6_883, date: new Date('2026-07-28') },
      { category: 'Revenue', amount: 0, date: new Date('2026-07-28') },
    ])).toBe(35_000);
  });
});
