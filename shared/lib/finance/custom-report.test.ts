import { describe, expect, it } from 'vitest';
import { buildFinancialReportData, financialTransactionKind } from './custom-report';

describe('financial custom reports', () => {
  it('uses the ledger category instead of the amount sign', () => {
    expect(financialTransactionKind({ amountUSD: -500, category: 'Revenue' })).toBe('revenue');
    expect(financialTransactionKind({ amountUSD: 200, category: 'Expense' })).toBe('expense');
  });

  it('does not treat expense descriptions or unassigned revenue as clients', () => {
    const rows = buildFinancialReportData([
      { amountUSD: -5997, category: 'Expense', details: 'ChatGPT Plus', clientName: null },
      { amountUSD: 5000, category: 'Revenue', details: 'Website Maintenance Revenue', clientName: null },
      { amountUSD: 30000, category: 'Revenue', clientName: 'Nova Hospitality' },
      { amountUSD: 2500, category: 'Expense', clientName: 'Nova Hospitality', details: 'Production' },
    ], { xAxis: 'Client', yAxis: 'Profit Margin', timeframe: 'All Time' });

    expect(rows).toEqual([{
      label: 'Nova Hospitality',
      value: (27500 / 30000) * 100,
      revenue: 30000,
      expenses: 2500,
      profit: 27500,
      margin: (27500 / 30000) * 100,
    }]);
  });

  it('counts category-labeled values by absolute magnitude', () => {
    const rows = buildFinancialReportData([
      { amountUSD: -1000, category: 'Revenue', clientName: 'CrystalOS' },
      { amountUSD: 125, category: 'Expense', clientName: 'CrystalOS' },
    ], { xAxis: 'Client', yAxis: 'Net Profit', timeframe: 'All Time' });

    expect(rows[0]).toMatchObject({ revenue: 1000, expenses: 125, profit: 875, value: 875 });
  });

  it('shuffles non-time groups instead of sorting them by value', () => {
    const rows = buildFinancialReportData([
      { amountUSD: 300, category: 'Revenue', clientName: 'Largest' },
      { amountUSD: 200, category: 'Revenue', clientName: 'Middle' },
      { amountUSD: 100, category: 'Revenue', clientName: 'Smallest' },
    ], {
      xAxis: 'Client',
      yAxis: 'Revenue',
      timeframe: 'All Time',
      random: () => 0,
    });

    expect(rows.map((row) => row.label)).toEqual(['Middle', 'Smallest', 'Largest']);
  });
});
