import 'server-only';

import { prisma } from '@/lib/db';
import { ledgerExpenseEntries, ledgerRevenueEntries, sumLedgerExpenses, sumLedgerRevenue } from '@/lib/finance/ledger-revenue';
import { buildFinancialHistory, type FinancialTimeframe } from '@/lib/finance/financial-history';
import type { RequestSecurityContext } from '@/server/security/request-security-context';

type RevenueTransaction = {
  invoiceId: string | null;
  amount: number;
  category: string;
  date: Date;
  client: { id: string; name: string; domain: string | null } | null;
};

function financeMetrics(
  invoices: Array<{ id: string; invoiceNumber: string; amount: number; paidAmount: number; status: string; documentType: string; issuedDate: Date; client: { id: string; name: string; domain: string | null } | null }>,
  transactions: RevenueTransaction[] = [],
  timeframe: FinancialTimeframe = 'Six Months',
  range?: { start: Date; end: Date },
) {
  const now = range?.end || new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const timeframeStart = range?.start || (() => {
    const start = new Date(now);
    if (timeframe === 'Monthly') start.setDate(start.getDate() - 30);
    else if (timeframe === 'Quarterly') start.setDate(start.getDate() - 90);
    else if (timeframe === 'Yearly') start.setDate(start.getDate() - 365);
    else if (timeframe === 'Six Months') start.setDate(start.getDate() - 183);
    else return null;
    return start;
  })();
  const ledgerTransactions = timeframeStart
    ? transactions.filter((transaction) => transaction.date >= timeframeStart && transaction.date <= now)
    : transactions;
  const transactionRevenue = ledgerRevenueEntries(ledgerTransactions);
  const revenueForMonth = (year: number, month: number) => transactionRevenue
    .filter((transaction) => transaction.date.getFullYear() === year && transaction.date.getMonth() === month)
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const previousDate = new Date(currentYear, currentMonth - 1, 1);
  const currentMonthRevenue = revenueForMonth(currentYear, currentMonth);
  const previousMonthRevenue = revenueForMonth(previousDate.getFullYear(), previousDate.getMonth());
  const monthlyChangePercent = previousMonthRevenue > 0
    ? ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100
    : null;

  const byClient = new Map<string, { id: string; name: string; domain: string; revenue: number }>();
  for (const transaction of transactionRevenue) {
    if (!transaction.client) continue;
    const current = byClient.get(transaction.client.id) || {
      id: transaction.client.id,
      name: transaction.client.name,
      domain: transaction.client.domain || '',
      revenue: 0,
    };
    current.revenue += transaction.amount;
    byClient.set(transaction.client.id, current);
  }
  const totalClientRevenue = [...byClient.values()].reduce((sum, client) => sum + client.revenue, 0);
  const revenueByClient = [...byClient.values()]
    .sort((left, right) => right.revenue - left.revenue)
    .map((client) => ({ ...client, share: totalClientRevenue > 0 ? (client.revenue / totalClientRevenue) * 100 : 0 }));

  const invoiceBalance = (invoice: typeof invoices[number]) => Math.max(0, invoice.amount - invoice.paidAmount);
  const isOutstandingInvoice = (invoice: typeof invoices[number]) => invoice.documentType === 'INVOICE' && invoiceBalance(invoice) > 0;
  const isPartiallyPaidInvoice = (invoice: typeof invoices[number]) => isOutstandingInvoice(invoice) && invoice.paidAmount > 0;
  const revenueHistory = buildFinancialHistory({
    invoices,
    transactions: ledgerTransactions,
    timeframe: range ? 'All Time' : timeframe,
    now,
    startDate: range?.start,
  });
  const outstandingInvoices = invoices
    .filter(isOutstandingInvoice)
    .map((invoice) => ({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      clientName: invoice.client?.name || 'Manual customer',
      amount: invoice.amount,
      paidAmount: invoice.paidAmount,
      pendingAmount: invoiceBalance(invoice),
      issuedDate: invoice.issuedDate.toISOString(),
    }))
    .sort((left, right) => right.pendingAmount - left.pendingAmount);

  return {
    grossBillings: sumLedgerRevenue(transactionRevenue),
    outstandingAmount: invoices.filter(isOutstandingInvoice).reduce((sum, invoice) => sum + invoiceBalance(invoice), 0),
    pendingReceivablesAmount: invoices.filter(isPartiallyPaidInvoice).reduce((sum, invoice) => sum + invoiceBalance(invoice), 0),
    outstandingInvoices,
    totalExpenses: sumLedgerExpenses(ledgerTransactions),
    currentMonthRevenue,
    previousMonthRevenue,
    monthlyChangePercent,
    revenueHistory,
    revenueByClient,
  };
}

export async function getDashboardMetrics(
  ctx: RequestSecurityContext,
  requestedRange?: { start: string; end: string },
  timeframe: FinancialTimeframe = 'Six Months',
) {
  const role = ctx.role.toLowerCase();
  const range = requestedRange ? {
    start: new Date(`${requestedRange.start}T00:00:00.000Z`),
    end: new Date(`${requestedRange.end}T23:59:59.999Z`),
  } : undefined;
  const dateFilter = range ? { gte: range.start, lte: range.end } : undefined;
  const clientScope = role === 'client' && ctx.clientId ? { id: ctx.clientId } : {};
  const projectScope = role === 'client' && ctx.clientId ? { clientId: ctx.clientId } : {};
  const revenueClientScope = role === 'client' && ctx.clientId ? { clientId: ctx.clientId } : {};
  const [allClients, projects] = await Promise.all([
    prisma.client.findMany({ where: { orgId: ctx.orgId, ...clientScope } }),
    prisma.project.findMany({ where: { orgId: ctx.orgId, ...projectScope }, include: { client: { select: { name: true } } } }),
  ]);
  const [invoices, transactions] = await Promise.all([
    prisma.invoice.findMany({ where: { orgId: ctx.orgId, ...revenueClientScope, ...(dateFilter ? { issuedDate: dateFilter } : {}) }, include: { client: true } }),
    prisma.transaction.findMany({
      where: { orgId: ctx.orgId, ...revenueClientScope, ...(dateFilter ? { date: dateFilter } : {}) },
      include: { client: true },
    }),
  ]);

  const allProjects = projects
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((project) => ({ id: project.id, name: project.name, clientName: project.client.name, status: project.status, progress: project.progress }));
  const activeProjects = allProjects
    .filter((project) => project.status === 'IN_PROGRESS' || project.status === 'OVERDUE')

  return {
    activeClientsCount: allClients.filter((client) => client.status === 'ACTIVE').length,
    totalClientsCount: allClients.length,
    activeProjectsCount: activeProjects.length,
    activeProjects,
    allProjects,
    projectRisks: projects
      .filter((project) => project.riskLevel === 'HIGH' || project.riskLevel === 'MEDIUM')
      .map((project) => ({ id: project.id, name: project.name, riskLevel: project.riskLevel, riskDescription: project.riskDescription || '' })),
    ...financeMetrics(invoices, transactions, timeframe, range),
  };
}

export async function getFinanceOverview(
  ctx: RequestSecurityContext,
  timeframe: FinancialTimeframe,
  requestedRange?: { start: string; end: string },
) {
  const role = ctx.role.toLowerCase();
  const revenueClientScope = role === 'client' && ctx.clientId ? { clientId: ctx.clientId } : {};
  const range = requestedRange ? {
    start: new Date(`${requestedRange.start}T00:00:00.000Z`),
    end: new Date(`${requestedRange.end}T23:59:59.999Z`),
  } : undefined;
  const [invoices, transactions] = await Promise.all([
    prisma.invoice.findMany({ where: { orgId: ctx.orgId, ...revenueClientScope }, orderBy: { issuedDate: 'desc' }, include: { client: true } }),
    prisma.transaction.findMany({
      where: { orgId: ctx.orgId, ...revenueClientScope },
      include: { client: true },
    }),
  ]);
  const metrics = financeMetrics(invoices, transactions, timeframe, range);
  const visibleExpenseTransactions = ledgerExpenseEntries(transactions).filter((transaction) => {
    if (range) return transaction.date >= range.start && transaction.date <= range.end;
    if (timeframe === 'All Time') return true;
    const cutoff = new Date();
    if (timeframe === 'Monthly') cutoff.setDate(cutoff.getDate() - 30);
    else if (timeframe === 'Quarterly') cutoff.setDate(cutoff.getDate() - 90);
    else if (timeframe === 'Yearly') cutoff.setDate(cutoff.getDate() - 365);
    else cutoff.setDate(cutoff.getDate() - 183);
    return transaction.date >= cutoff;
  });
  return {
    ...metrics,
    recentInvoices: invoices.slice(0, 10).map((invoice) => {
      const buyer = invoice.buyerSnapshot as { name?: string; legalEntityName?: string } | null;
      return {
        id: invoice.id,
        number: invoice.invoiceNumber,
        client: invoice.client?.name || buyer?.legalEntityName || buyer?.name || 'Manual customer',
        amount: invoice.amount,
        date: invoice.issuedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        status: invoice.status,
      };
    }),
    expenses: visibleExpenseTransactions.map((expense) => ({
      id: expense.id,
      category: expense.category,
      amount: Math.abs(expense.amount),
      date: expense.date.toISOString(),
      merchant: expense.details,
    })),
  };
}
