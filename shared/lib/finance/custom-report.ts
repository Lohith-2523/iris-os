export type FinancialReportXAxis = 'Client' | 'Category' | 'Ledger Type' | 'Time (Monthly)';
export type FinancialReportYAxis = 'Revenue' | 'Expenses' | 'Net Profit' | 'Profit Margin';
export type FinancialReportTimeframe = 'All Time' | 'Yearly' | 'Quarterly' | 'Monthly';

export type FinancialReportTransaction = {
  amountUSD: number;
  category?: unknown;
  rawStatus?: unknown;
  clientName?: unknown;
  date?: unknown;
  details?: unknown;
  source?: unknown;
};

export type FinancialReportRow = {
  label: string;
  value: number;
  revenue: number;
  expenses: number;
  profit: number;
  margin: number;
};

type TransactionKind = 'revenue' | 'expense';

function normalizedText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export function financialTransactionKind(transaction: FinancialReportTransaction): TransactionKind | null {
  const category = normalizedText(transaction.category).toLowerCase();
  const rawStatus = normalizedText(transaction.rawStatus).toLowerCase();
  const classification = category || rawStatus;

  if (classification.includes('expense') || classification.includes('cost')) return 'expense';
  if (classification.includes('revenue') || classification.includes('income')) return 'revenue';

  const amount = Number(transaction.amountUSD);
  if (!Number.isFinite(amount) || amount === 0) return null;
  return amount < 0 ? 'expense' : 'revenue';
}

function isWithinTimeframe(dateValue: unknown, timeframe: FinancialReportTimeframe, now: Date) {
  if (timeframe === 'All Time' || !dateValue) return true;

  const date = new Date(String(dateValue));
  if (Number.isNaN(date.getTime())) return true;

  const elapsedDays = (now.getTime() - date.getTime()) / 86_400_000;
  if (timeframe === 'Monthly') return elapsedDays <= 30;
  if (timeframe === 'Quarterly') return elapsedDays <= 90;
  return elapsedDays <= 365;
}

function groupLabel(transaction: FinancialReportTransaction, xAxis: FinancialReportXAxis) {
  const kind = financialTransactionKind(transaction);

  if (xAxis === 'Client') {
    // A ledger description is not a client. Only an explicit client relationship
    // belongs in a client report.
    return normalizedText(transaction.clientName) || null;
  }

  if (xAxis === 'Category') {
    return kind === 'expense'
      ? normalizedText(transaction.details) || 'General Expense'
      : 'Revenue';
  }

  if (xAxis === 'Ledger Type') {
    return normalizedText(transaction.source) || 'Manual Ledger';
  }

  const date = new Date(String(transaction.date));
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(date);
}

export function buildFinancialReportData(
  transactions: FinancialReportTransaction[],
  options: {
    xAxis: FinancialReportXAxis;
    yAxis: FinancialReportYAxis;
    timeframe: FinancialReportTimeframe;
    now?: Date;
    random?: () => number;
  },
): FinancialReportRow[] {
  const now = options.now ?? new Date();
  const groups = new Map<string, { revenue: number; expenses: number; sortTime?: number }>();

  transactions.forEach((transaction) => {
    if (!isWithinTimeframe(transaction.date, options.timeframe, now)) return;

    const kind = financialTransactionKind(transaction);
    const amount = Math.abs(Number(transaction.amountUSD));
    if (!kind || !Number.isFinite(amount)) return;

    const label = groupLabel(transaction, options.xAxis);
    if (!label) return;

    const current = groups.get(label) ?? { revenue: 0, expenses: 0 };
    if (kind === 'expense') current.expenses += amount;
    else current.revenue += amount;

    if (options.xAxis === 'Time (Monthly)') {
      const date = new Date(String(transaction.date));
      current.sortTime = new Date(date.getFullYear(), date.getMonth(), 1).getTime();
    }
    groups.set(label, current);
  });

  const rows = Array.from(groups.entries()).map(([label, totals]) => {
    const profit = totals.revenue - totals.expenses;
    const margin = totals.revenue > 0 ? (profit / totals.revenue) * 100 : 0;
    const value = options.yAxis === 'Revenue'
      ? totals.revenue
      : options.yAxis === 'Expenses'
        ? totals.expenses
        : options.yAxis === 'Net Profit'
          ? profit
          : margin;

    return {
      label,
      value,
      revenue: totals.revenue,
      expenses: totals.expenses,
      profit,
      margin,
      sortTime: totals.sortTime,
    };
  });

  if (options.xAxis === 'Time (Monthly)') {
    rows.sort((a, b) => (a.sortTime ?? 0) - (b.sortTime ?? 0));
  } else {
    const random = options.random ?? Math.random;
    for (let index = rows.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(random() * (index + 1));
      [rows[index], rows[swapIndex]] = [rows[swapIndex], rows[index]];
    }
  }

  return rows.map((row) => ({
    label: row.label,
    value: row.value,
    revenue: row.revenue,
    expenses: row.expenses,
    profit: row.profit,
    margin: row.margin,
  }));
}
