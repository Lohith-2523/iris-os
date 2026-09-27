import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  clientFindMany: vi.fn(),
  projectFindMany: vi.fn(),
  invoiceFindMany: vi.fn(),
  transactionFindMany: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    client: { findMany: mocks.clientFindMany },
    project: { findMany: mocks.projectFindMany },
    invoice: { findMany: mocks.invoiceFindMany },
    transaction: { findMany: mocks.transactionFindMany },
  },
}));

import { getDashboardMetrics, getFinanceOverview } from './finance-read-service';

describe('finance overview date range', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.clientFindMany.mockResolvedValue([]);
    mocks.projectFindMany.mockResolvedValue([]);
    mocks.invoiceFindMany.mockResolvedValue([]);
  });

  it('uses the same exact fiscal-quarter boundaries as the dashboard', async () => {
    mocks.transactionFindMany.mockResolvedValue([
      { invoiceId: null, amount: 1_000, category: 'Revenue', date: new Date('2026-07-05T00:00:00.000Z'), client: null },
      { invoiceId: null, amount: -250, category: 'Expense', date: new Date('2026-09-30T23:00:00.000Z'), client: null, id: 'expense-in-range', details: 'Quarter expense' },
      { invoiceId: null, amount: -750, category: 'Expense', date: new Date('2026-01-10T00:00:00.000Z'), client: null, id: 'expense-before-range', details: 'Older expense' },
    ]);

    const overview = await getFinanceOverview({ orgId: 'org-1', role: 'admin', clientId: null } as never, 'All Time', {
      start: '2026-07-01',
      end: '2026-09-30',
    });

    expect(overview.grossBillings).toBe(1_000);
    expect(overview.totalExpenses).toBe(250);
    expect(overview.expenses.map((expense) => expense.id)).toEqual(['expense-in-range']);
  });

  it('keeps the dashboard unbounded when all time is selected', async () => {
    mocks.transactionFindMany.mockResolvedValue([
      { invoiceId: null, amount: 450, category: 'Revenue', date: new Date('2020-01-10T00:00:00.000Z'), client: null },
      { invoiceId: null, amount: -125, category: 'Expense', date: new Date('2020-01-11T00:00:00.000Z'), client: null },
    ]);

    const metrics = await getDashboardMetrics(
      { orgId: 'org-1', role: 'admin', clientId: null } as never,
      undefined,
      'All Time',
    );

    expect(metrics.grossBillings).toBe(450);
    expect(metrics.totalExpenses).toBe(125);
    expect(mocks.transactionFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { orgId: 'org-1' },
    }));
  });
});
