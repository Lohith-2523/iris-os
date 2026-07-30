import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getRequestUser } from '@/lib/org';
import { ledgerRevenueEntries, sumLedgerRevenue } from '@/lib/finance/ledger-revenue';
import { clientPortfolioValueForYear } from '@/lib/clients/portfolio-value';

type RevenueTransaction = {
  amount: number;
  category: string;
  date: Date;
  client: { id: string; name: string; domain: string | null } | null;
};

function getFinanceMetrics(
  invoices: Array<{ amount: number; paidAmount: number; status: string; issuedDate: Date; client: { id: string; name: string; domain: string | null } | null }>,
  expenses: Array<{ amount: number }>,
  transactions: RevenueTransaction[] = [],
) {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const transactionRevenue = ledgerRevenueEntries(transactions);
  const revenueForMonth = (year: number, month: number) => {
    return transactionRevenue
      .filter((transaction) => transaction.date.getFullYear() === year && transaction.date.getMonth() === month)
      .reduce((sum, transaction) => sum + transaction.amount, 0);
  };
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
    // Ledger entries are the sole source of recognized revenue. Invoices only
    // represent receivables and therefore contribute to outstanding balances.
    grossBillings: sumLedgerRevenue(transactionRevenue),
    outstandingAmount: invoices
      .filter((invoice) => invoice.status === 'UNPAID' || invoice.status === 'PARTIALLY_PAID')
      .reduce((sum, invoice) => sum + Math.max(0, invoice.amount - invoice.paidAmount), 0),
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
        const [clients, allClients, projects, invoices, expenses, transactions] = await Promise.all([
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
        
        const financeMetrics = getFinanceMetrics(invoices, expenses, transactions);

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
        const [invoices, expenses, transactions] = await Promise.all([
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
        ]);

        const financeMetrics = getFinanceMetrics(invoices, expenses, transactions);

        const recentInvoices = invoices.slice(0, 10).map((inv) => {
          const buyer = inv.buyerSnapshot as { name?: string; legalEntityName?: string } | null;
          return {
            id: inv.id,
            number: inv.invoiceNumber,
            client: inv.client?.name || buyer?.legalEntityName || buyer?.name || 'Manual customer',
            amount: inv.amount,
            date: inv.issuedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            status: inv.status,
          };
        });

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
            projects: {
              select: {
                startDate: true,
                endDate: true,
                paymentType: true,
                paymentAmount: true,
                paymentFrequency: true,
                paymentStartDate: true,
              },
            },
            invoices: {
              include: {
                project: { select: { id: true, name: true } },
              },
              orderBy: { issuedDate: 'desc' },
            },
          },
          orderBy: { name: 'asc' }
        });

        const portfolioYear = new Date().getUTCFullYear();
        const formattedClients = clients.map(c => {
          const contractValue = clientPortfolioValueForYear(c.projects, portfolioYear);

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
            legalEntityName: c.legalEntityName,
            billingAddressLine1: c.billingAddressLine1,
            billingAddressLine2: c.billingAddressLine2,
            billingCity: c.billingCity,
            billingState: c.billingState,
            billingPostalCode: c.billingPostalCode,
            billingCountry: c.billingCountry,
            gstNumber: c.gstNumber,
            adAccountId: c.adAccountId,
            metadata: c.metadata || null,
            invoices: c.invoices.map((invoice) => ({
              id: invoice.id,
              invoiceNumber: invoice.invoiceNumber,
              amount: invoice.amount,
              paidAmount: invoice.paidAmount,
              balanceDue: Math.max(0, invoice.amount - invoice.paidAmount),
              status: invoice.status,
              dueDate: invoice.dueDate,
              issuedDate: invoice.issuedDate,
              deliveryStatus: invoice.deliveryStatus,
              project: invoice.project,
              downloadUrl: `/api/invoices/${invoice.id}/pdf`,
            })),
            contractValue,
            portfolioYear,
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
