export type LedgerRevenueEntry = {
  amount: number;
  category: string;
  date: Date;
};

export function ledgerRevenueEntries<T extends LedgerRevenueEntry>(entries: T[]) {
  return entries.filter((entry) => entry.category === 'Revenue' && entry.amount > 0);
}

export function sumLedgerRevenue(entries: LedgerRevenueEntry[]) {
  return ledgerRevenueEntries(entries)
    .reduce((sum, entry) => sum + entry.amount, 0);
}

export function ledgerExpenseEntries<T extends LedgerRevenueEntry>(entries: T[]) {
  return entries.filter((entry) =>
    entry.category === 'Expense' || entry.category === 'AI Subscription' || entry.amount < 0,
  );
}

export function sumLedgerExpenses(entries: LedgerRevenueEntry[]) {
  return ledgerExpenseEntries(entries)
    .reduce((sum, entry) => sum + Math.abs(entry.amount), 0);
}
