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
