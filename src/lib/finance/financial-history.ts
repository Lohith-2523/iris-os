export type FinancialTimeframe = 'Monthly' | 'Quarterly' | 'Yearly' | 'All Time' | 'Six Months';

type HistoryInvoice = {
  id: string;
  documentType: string;
  amount: number;
  paidAmount: number;
  issuedDate: Date;
};

type HistoryTransaction = {
  date: Date;
  amount: number;
  category: string;
  invoiceId?: string | null;
};

type HistoryExpense = { date: Date; amount: number };

function subtractDays(date: Date, days: number) {
  return new Date(date.getTime() - days * 24 * 60 * 60 * 1_000);
}

function rangeStart(now: Date, timeframe: FinancialTimeframe, dates: Date[]) {
  if (timeframe === 'Monthly') return subtractDays(now, 30);
  if (timeframe === 'Quarterly') return subtractDays(now, 90);
  if (timeframe === 'Yearly') return subtractDays(now, 365);
  if (timeframe === 'Six Months') return subtractDays(now, 183);
  const earliest = dates.reduce<Date | null>((current, date) =>
    !current || date < current ? date : current, null);
  return earliest ? subtractDays(earliest, 1) : now;
}

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function buildFinancialHistory(input: {
  invoices: HistoryInvoice[];
  transactions: HistoryTransaction[];
  expenses: HistoryExpense[];
  timeframe: FinancialTimeframe;
  now?: Date;
}) {
  const now = input.now || new Date();
  const invoices = input.invoices.filter((invoice) => invoice.documentType === 'INVOICE');
  const relevantDates = [
    ...invoices.map((invoice) => invoice.issuedDate),
    ...input.transactions.map((transaction) => transaction.date),
    ...input.expenses.map((expense) => expense.date),
  ].filter((date) => date <= now);
  const start = rangeStart(now, input.timeframe, relevantDates);
  const pointDates = new Map<string, Date>();
  pointDates.set(dayKey(start), start);
  pointDates.set(dayKey(now), now);
  for (const date of relevantDates) {
    if (date >= start) pointDates.set(dayKey(date), date);
  }

  const dates = [...pointDates.values()].sort((left, right) => left.getTime() - right.getTime());
  const revenueTransactions = input.transactions.filter((transaction) =>
    transaction.category === 'Revenue' && transaction.amount > 0,
  );
  const expenseTransactions = input.transactions.filter((transaction) =>
    transaction.category === 'Expense' || transaction.amount < 0,
  );
  const linkedPaymentsByInvoice = new Map<string, HistoryTransaction[]>();
  for (const transaction of revenueTransactions) {
    if (!transaction.invoiceId) continue;
    const payments = linkedPaymentsByInvoice.get(transaction.invoiceId) || [];
    payments.push(transaction);
    linkedPaymentsByInvoice.set(transaction.invoiceId, payments);
  }

  const labelFormatter = new Intl.DateTimeFormat('en-US', input.timeframe === 'Monthly'
    ? { month: 'short', day: 'numeric' }
    : { month: 'short', day: 'numeric', year: '2-digit' });

  return dates.map((date, index) => {
    const revenue = revenueTransactions
      .filter((transaction) => transaction.date >= start && transaction.date <= date)
      .reduce((sum, transaction) => sum + transaction.amount, 0);
    const expenses = input.expenses
      .filter((expense) => expense.date >= start && expense.date <= date)
      .reduce((sum, expense) => sum + Math.abs(expense.amount), 0)
      + expenseTransactions
        .filter((transaction) => transaction.date >= start && transaction.date <= date)
        .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);
    const receivables = invoices
      .filter((invoice) => invoice.issuedDate <= date)
      .reduce((sum, invoice) => {
        const linkedPayments = linkedPaymentsByInvoice.get(invoice.id) || [];
        const paidByDate = linkedPayments
          .filter((transaction) => transaction.date <= date)
          .reduce((paid, transaction) => paid + transaction.amount, 0);
        const recordedPaymentGap = index === dates.length - 1
          ? Math.max(0, invoice.paidAmount - linkedPayments.reduce((paid, transaction) => paid + transaction.amount, 0))
          : 0;
        return sum + Math.max(0, invoice.amount - paidByDate - recordedPaymentGap);
      }, 0);

    return {
      label: labelFormatter.format(date),
      date: date.toISOString(),
      value: revenue,
      revenue,
      expenses,
      receivables,
    };
  });
}
