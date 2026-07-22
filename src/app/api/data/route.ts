import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getRequestUser } from '@/lib/org';

function getFinanceMetrics(invoices: Array<{ amount: number; status: string; issuedDate: Date; client: { id: string; name: string; domain: string | null } }>, expenses: Array<{ amount: number }>) {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const paidInvoices = invoices.filter((invoice) => invoice.status === 'PAID');
  const revenueForMonth = (year: number, month: number) => paidInvoices
    .filter((invoice) => {
      const issued = new Date(invoice.issuedDate);
      return issued.getFullYear() === year && issued.getMonth() === month;
    })
    .reduce((sum, invoice) => sum + invoice.amount, 0);
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
  const revenueByClient = [...byClient.values()]
    .sort((a, b) => b.revenue - a.revenue)
    .map((client) => ({
      ...client,
      share: paidInvoices.length > 0
        ? (client.revenue / paidInvoices.reduce((sum, invoice) => sum + invoice.amount, 0)) * 100
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
    grossBillings: invoices.reduce((sum, invoice) => sum + invoice.amount, 0),
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
        const clients = await prisma.client.findMany({ where: { orgId, status: 'ACTIVE', ...clientScope } });
        const allClients = await prisma.client.findMany({ where: { orgId, ...clientScope } });
        const projects = await prisma.project.findMany({ where: { orgId, ...projectScope } });
        const invoices = await prisma.invoice.findMany({ where: { orgId, ...(user.role.toLowerCase() === 'client' && user.clientId ? { clientId: user.clientId } : {}) } });
        const expenses = user.role.toLowerCase() === 'client' ? [] : await prisma.expense.findMany({ where: { orgId } });

        const activeClientsCount = clients.length;
        const totalClientsCount = allClients.length;
        const activeProjectsCount = projects.filter(p => p.status === 'IN_PROGRESS' || p.status === 'OVERDUE').length;
        
        const invoiceData = invoices.map((invoice) => ({ ...invoice, client: { id: invoice.clientId, name: '', domain: null } }));
        const financeMetrics = getFinanceMetrics(invoiceData, expenses);

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
          projectRisks,
          ...financeMetrics,
        });
      }

      case 'finance': {
        const invoices = await prisma.invoice.findMany({
          where: { orgId, ...(user.role.toLowerCase() === 'client' && user.clientId ? { clientId: user.clientId } : {}) },
          orderBy: { issuedDate: 'desc' },
          include: { client: true }
        });
        const expenses = user.role.toLowerCase() === 'client'
          ? []
          : await prisma.expense.findMany({
              where: { orgId },
              orderBy: { date: 'desc' }
            });

        const financeMetrics = getFinanceMetrics(invoices, expenses);

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
          include: { invoices: true },
          orderBy: { name: 'asc' }
        });

        const formattedClients = clients.map(c => {
          const revenue = c.invoices
            .filter(inv => inv.status === 'PAID')
            .reduce((sum, inv) => sum + inv.amount, 0);

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
          where: { orgId },
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
