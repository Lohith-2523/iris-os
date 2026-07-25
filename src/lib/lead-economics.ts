export interface LeadEconomics {
  marketingSpend: number;
  closedLeadCount: number;
  sourcedRetainerRevenue: number;
  averageCac: number | null;
  averageRoas: number | null;
}

const MARKETING_EXPENSE_PATTERN =
  /\b(?:ads?|adverts?|advertising|advertisements?|leads?|lead[\s-]?gen(?:eration)?)\b/i;

export function isLeadAcquisitionExpense(details: string) {
  return MARKETING_EXPENSE_PATTERN.test(details);
}

export function calculateLeadEconomics(input: {
  expenseTransactions: Array<{ details: string; amount: number }>;
  closedLeadCount: number;
  sourcedRetainerRevenue: number;
}): LeadEconomics {
  const marketingSpend = input.expenseTransactions
    .filter(({ details }) => isLeadAcquisitionExpense(details))
    .reduce((total, { amount }) => total + Math.abs(amount), 0);

  return {
    marketingSpend,
    closedLeadCount: input.closedLeadCount,
    sourcedRetainerRevenue: input.sourcedRetainerRevenue,
    averageCac: input.closedLeadCount > 0 ? marketingSpend / input.closedLeadCount : null,
    averageRoas: marketingSpend > 0 ? input.sourcedRetainerRevenue / marketingSpend : null,
  };
}
