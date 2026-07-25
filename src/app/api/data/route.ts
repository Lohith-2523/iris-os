import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getRequestUser } from '@/lib/org';
import { generateRecurringOccurrences } from '@/lib/finance/recurrence';

type RevenueTransaction = {
  amount: number;
  category: string;
  date: Date;
  client: { id: string; name: string; domain: string | null } | null;
};

type Retainer = {
  amount: number;
  frequency: string;
  startDate: Date;
  client: { id: string; name: string; domain: string | null };
};

function getFinanceMetrics(
  invoices: Array<{ amount: number; status: string; issuedDate: Date; client: { id: string; name: string; domain: string | null } }>,
  expenses: Array<{ amount: number }>,
  transactions: RevenueTransaction[] = [],
  retainers: Retainer[] = [],
) {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const paidInvoices = invoices.filter((invoice) => invoice.status === 'PAID');
  const transactionRevenue = transactions.filter((transaction) =>
    transaction.category === 'Revenue' && transaction.amount > 0
  );
  const retainerRevenue = retainers.flatMap((retainer) =>
    generateRecurringOccurrences(retainer.startDate, retainer.amount, retainer.frequency)
      .map((occurrence) => ({ ...occurrence, client: retainer.client }))
  );
  const revenueForMonth = (year: number, month: number) => {
    const invoiceRevenue = paidInvoices
      .filter((invoice) => {
        const issued = new Date(invoice.issuedDate);
        return issued.getFullYear() === year && issued.getMonth() === month;
      })
      .reduce((sum, invoice) => sum + invoice.amount, 0);
    const oneTimeRevenue = transactionRevenue
      .filter((transaction) => transaction.date.getFullYear() === year && transaction.date.getMonth() === month)
      .reduce((sum, transaction) => sum + transaction.amount, 0);
    const recurringRevenue = retainerRevenue
      .filter((occurrence) => occurrence.date.getFullYear() === year && occurrence.date.getMonth() === month)
      .reduce((sum, occurrence) => sum + occurrence.amount, 0);
    return invoiceRevenue + oneTimeRevenue + recurringRevenue;
  };
  const previousDate = new Date(currentYear, currentMonth - 1, 1);
  const currentMonthRevenue = revenueForMonth(currentYear, currentMonth);
  const previousMonthRevenue = revenueForMonth(previousDate.getFullYear(), previousDate.getMonth());
  const monthlyChangePercent = previousMonthRevenue > 0
    ? ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100
    : null;

  const byClient = new Map<string, { id: string; name: string; domain: string; revenue: number }>();
  for (const invoice of paidInvoices) {
    const current = byClient.get(invoice.client.id) || {
      id: invoice.client.id,
      name: invoice.client.name,
      domain: invoice.client.domain || '',
      revenue: 0,
    };
    current.revenue += invoice.amount;
    byClient.set(invoice.client.id, current);
  }
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
  for (const occurrence of retainerRevenue) {
    const current = byClient.get(occurrence.client.id) || {
      id: occurrence.client.id,
      name: occurrence.client.name,
      domain: occurrence.client.domain || '',
      revenue: 0,
    };
    current.revenue += occurrence.amount;
    byClient.set(occurrence.client.id, current);
  }
  const totalClientRevenue = [...byClient.values()].reduce((sum, client) => sum + client.revenue, 0);
  const revenueByClient = [...byClient.values()]
    .sort((a, b) => b.revenue - a.revenue)
    .map((client) => ({
      ...client,
      share: totalClientRevenue > 0
        ? (client.revenue / totalClientRevenue) * 100
        : 0,
    }));

  const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'short' });
  const revenueHistory = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(currentYear, currentMonth - (5 - index), 1);
    return {
      label: monthFormatter.format(date),
      value: revenueForMonth(date.getFullYear(), date.getMonth()),
    };
  });

  return {
    invoiceGrossBillings: invoices.reduce((sum, invoice) => sum + invoice.amount, 0),
    grossBillings: invoices.reduce((sum, invoice) => sum + invoice.amount, 0)
      + transactionRevenue.reduce((sum, transaction) => sum + transaction.amount, 0)
      + retainerRevenue.reduce((sum, occurrence) => sum + occurrence.amount, 0),
    outstandingAmount: invoices.filter((invoice) => invoice.status === 'UNPAID' || invoice.status === 'OVERDUE').reduce((sum, invoice) => sum + invoice.amount, 0),
    totalExpenses: expenses.reduce((sum, expense) => sum + expense.amount, 0),
    currentMonthRevenue,
    previousMonthRevenue,
    monthlyChangePercent,
    revenueHistory,
    revenueByClient,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const domain = searchParams.get('domain');

    if (!domain) {
      return NextResponse.json({ error: 'Missing domain parameter' }, { status: 400 });
    }

    const user = await getRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = user.orgId;
    const clientScope = user.role.toLowerCase() === 'client' && user.clientId
      ? { id: user.clientId }
      : {};
    const projectScope = user.role.toLowerCase() === 'client' && user.clientId
      ? { clientId: user.clientId }
      : {};
    const memberScope = user.role.toLowerCase() === 'member'
      ? { members: { some: { userId: user.id } } }
      : {};


    switch (domain) {
      case 'dashboard': {
        // Compute dashboard executive metrics
        const revenueClientScope = user.role.toLowerCase() === 'client' && user.clientId ? { clientId: user.clientId } : {};
        const [clients, allClients, projects, invoices, expenses, transactions, retainers] = await Promise.all([
          prisma.client.findMany({ where: { orgId, status: 'ACTIVE', ...clientScope } }),
          prisma.client.findMany({ where: { orgId, ...clientScope } }),
          prisma.project.findMany({
            where: { orgId, ...projectScope },
            include: { client: { select: { name: true } } },
          }),
          prisma.invoice.findMany({ where: { orgId, ...revenueClientScope }, include: { client: true } }),
          user.role.toLowerCase() === 'client' ? Promise.resolve([]) : prisma.expense.findMany({ where: { orgId } }),
          prisma.transaction.findMany({
            where: { orgId, category: 'Revenue', amount: { gt: 0 }, ...revenueClientScope },
            include: { client: true },
          }),
          prisma.recurringRetainer.findMany({
            where: { orgId, ...revenueClientScope },
            include: { client: true },
          }),
        ]);

        const activeClientsCount = clients.length;
        const totalClientsCount = allClients.length;
        const activeProjects = projects
          .filter((project) => project.status === 'IN_PROGRESS' || project.status === 'OVERDUE')
          .sort((left, right) => left.name.localeCompare(right.name))
          .map((project) => ({
            id: project.id,
            name: project.name,
            clientName: project.client.name,
            status: project.status,
            progress: project.progress,
          }));
        const activeProjectsCount = activeProjects.length;
        
        const financeMetrics = getFinanceMetrics(invoices, expenses, transactions, retainers);

        const projectRisks = projects
          .filter(p => p.riskLevel === 'HIGH' || p.riskLevel === 'MEDIUM')
          .map(p => ({
            id: p.id,
            name: p.name,
            riskLevel: p.riskLevel,
            riskDescription: p.riskDescription || '',
          }));

        return NextResponse.json({
          activeClientsCount,
          totalClientsCount,
          activeProjectsCount,
          activeProjects,
          projectRisks,
          ...financeMetrics,
        });
      }

      case 'finance': {
        const revenueClientScope = user.role.toLowerCase() === 'client' && user.clientId ? { clientId: user.clientId } : {};
        const [invoices, expenses, transactions, retainers] = await Promise.all([
          prisma.invoice.findMany({
            where: { orgId, ...revenueClientScope },
            orderBy: { issuedDate: 'desc' },
            include: { client: true }
          }),
          user.role.toLowerCase() === 'client'
            ? Promise.resolve([])
            : prisma.expense.findMany({
              where: { orgId },
              orderBy: { date: 'desc' }
            }),
          prisma.transaction.findMany({
            where: { orgId, category: 'Revenue', amount: { gt: 0 }, ...revenueClientScope },
            include: { client: true },
          }),
          prisma.recurringRetainer.findMany({
            where: { orgId, ...revenueClientScope },
            include: { client: true },
          }),
        ]);

        const financeMetrics = getFinanceMetrics(invoices, expenses, transactions, retainers);

        const recentInvoices = invoices.slice(0, 10).map(inv => ({
          id: inv.id,
          number: inv.invoiceNumber,
          client: inv.client.name,
          amount: inv.amount,
          date: inv.issuedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          status: inv.status,
        }));

        return NextResponse.json({
          ...financeMetrics,
          recentInvoices,
          expenses: expenses.map(exp => ({
            id: exp.id,
            category: exp.category,
            amount: exp.amount,
            date: exp.date.toISOString(),
            merchant: exp.merchant,
          })),
        });
      }

      case 'clients': {
        const clients = await prisma.client.findMany({
          where: {
            orgId,
            ...clientScope,
            ...(user.role.toLowerCase() === 'member'
              ? { projects: { some: { members: { some: { userId: user.id } } } } }
              : {})
          },
          include: {
            invoices: true,
          },
          orderBy: { name: 'asc' }
        });

        // Query financial records from their owning models instead of relying on
        // generated reverse relations on Client. This keeps the endpoint safe
        // across Prisma client refreshes and scopes every record to this org.
        const clientIds = clients.map((client) => client.id);
        const [revenueTransactions, retainers] = clientIds.length > 0
          ? await Promise.all([
              prisma.transaction.findMany({
                where: {
                  orgId,
                  clientId: { in: clientIds },
                  category: 'Revenue',
                  amount: { gt: 0 },
                },
                select: { clientId: true, amount: true },
              }),
              prisma.recurringRetainer.findMany({
                where: { orgId, clientId: { in: clientIds } },
                select: { clientId: true, amount: true, frequency: true, startDate: true },
              }),
            ])
          : [[], []] as const;

        const revenueByClientId = new Map<string, number>();
        for (const transaction of revenueTransactions) {
          if (!transaction.clientId) continue;
          revenueByClientId.set(
            transaction.clientId,
            (revenueByClientId.get(transaction.clientId) ?? 0) + transaction.amount,
          );
        }
        for (const retainer of retainers) {
          const recurringRevenue = generateRecurringOccurrences(
            retainer.startDate,
            retainer.amount,
            retainer.frequency,
          ).reduce((sum, occurrence) => sum + occurrence.amount, 0);
          revenueByClientId.set(
            retainer.clientId,
            (revenueByClientId.get(retainer.clientId) ?? 0) + recurringRevenue,
          );
        }

        const formattedClients = clients.map(c => {
          const revenue = c.invoices
            .filter(inv => inv.status === 'PAID')
            .reduce((sum, inv) => sum + inv.amount, 0)
            + (revenueByClientId.get(c.id) ?? 0);

          return {
            id: c.id,
            name: c.name,
            domain: c.domain || '',
            status: c.status,
            healthScore: c.healthScore,
            healthStatus: c.healthStatus,
            churnRiskScore: c.churnRiskScore,
            roiMetric: c.roiMetric,
            renewalDate: c.renewalDate ? c.renewalDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null,
            upsellOpportunityValue: c.upsellOpportunityValue,
            agencyType: c.agencyType,
            businessModel: c.businessModel,
            adAccountId: c.adAccountId,
            metadata: c.metadata || null,
            revenue
          };
        });

        return NextResponse.json(formattedClients);
      }

      case 'projects': {
        const projects = await prisma.project.findMany({
          where: { orgId, ...projectScope, ...memberScope },
          include: { client: true },
          orderBy: { startDate: 'desc' }
        });

        const formattedProjects = projects.map(p => ({
          id: p.id,
          name: p.name,
          client: p.client.name,
          status: p.status,
          progress: p.progress,
          risk: p.riskLevel,
          riskDescription: p.riskDescription || '',
          endDate: p.endDate ? p.endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null,
        }));

        return NextResponse.json(formattedProjects);
      }

      case 'team': {
        const users = await prisma.user.findMany({
          where: {
            orgId,
            role: { in: ['admin', 'member'] },
          },
          orderBy: { name: 'asc' }
        });

        const team = users.map(u => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          phone: u.phone || null,
          projects: '',
          utilization: 0,
          status: '',
        }));

        return NextResponse.json(team);
      }

      case 'reporting': {
        const reports = await prisma.report.findMany({
          where: {
            createdBy: {
              orgId,
            },
          },
          orderBy: { createdAt: 'desc' },
          include: { createdBy: true }
        });

        const formattedReports = reports.map(r => ({
          id: r.id,
          title: r.title,
          client: r.createdBy.name, // Display author name or link
          type: r.type,
          status: r.status,
          date: r.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        }));

        return NextResponse.json(formattedReports);
      }

      case 'operations': {
        // Return compliance data & approvals queue
        const automations = await prisma.automation.findMany({ where: { orgId } });
        const runs = await prisma.automationRun.findMany({
          where: {
            automation: {
              orgId,
            },
          },
        });

        return NextResponse.json({
          automationsCount: automations.length,
          runsCount: runs.length,
        });
      }

      default:
        return NextResponse.json({ error: 'Invalid domain specified' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Error fetching database data:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
