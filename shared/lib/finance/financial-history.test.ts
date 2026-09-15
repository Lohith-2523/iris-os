import { describe, expect, it } from 'vitest';
import { buildFinancialHistory } from './financial-history';

describe('financial history', () => {
  it('anchors custom dashboard ranges even when the first transaction occurs later', () => {
    const history = buildFinancialHistory({
      timeframe: 'All Time',
      startDate: new Date('2026-07-01T00:00:00.000Z'),
      now: new Date('2026-09-30T23:59:59.999Z'),
      invoices: [],
      transactions: [{ date: new Date('2026-08-12T00:00:00.000Z'), amount: 2_500, category: 'Revenue' }],
      expenses: [],
    });

    expect(history[0]?.date.startsWith('2026-07-01')).toBe(true);
    expect(history.at(-1)?.date.startsWith('2026-09-30')).toBe(true);
  });

  it('reduces invoice receivables on each linked revenue date', () => {
    const history = buildFinancialHistory({
      timeframe: 'All Time',
      now: new Date('2026-08-02T12:00:00.000Z'),
      invoices: [{
        id: 'invoice-1', documentType: 'INVOICE', amount: 50_000, paidAmount: 30_000,
        issuedDate: new Date('2026-07-01T00:00:00.000Z'),
      }],
      transactions: [
        { date: new Date('2026-07-28T00:00:00.000Z'), amount: 20_000, category: 'Revenue', invoiceId: 'invoice-1' },
        { date: new Date('2026-08-02T00:00:00.000Z'), amount: 10_000, category: 'Revenue', invoiceId: 'invoice-1' },
      ],
      expenses: [],
    });

    expect(history.find((point) => point.date.startsWith('2026-07-28'))?.receivables).toBe(30_000);
    expect(history.at(-1)?.receivables).toBe(20_000);
  });
});
