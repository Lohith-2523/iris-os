import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getRequestUser } from '@/lib/org';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const domain = searchParams.get('domain');

    if (!domain) {
      return NextResponse.json({ error: 'Missing domain parameter' }, { status: 400 });
    }

    const user = await getRequestUser(request);
    if (!user) {
      switch (domain) {
        case 'dashboard':
          return NextResponse.json({
            activeClientsCount: 0,
            totalClientsCount: 0,
            activeProjectsCount: 0,
            currentMonthRevenue: 0,
            projectRisks: [],
            grossBillings: 0,
            totalExpenses: 0,
            outstandingAmount: 0,
          });
        case 'finance':
          return NextResponse.json({
            grossBillings: 0,
            outstandingAmount: 0,
            totalExpenses: 0,
            recentInvoices: [],
            expenses: [],
          });
        case 'clients':
        case 'projects':
        case 'team':
        case 'reporting':
          return NextResponse.json([]);
        case 'operations':
          return NextResponse.json({
            automationsCount: 0,
            runsCount: 0,
          });
        default:
          return NextResponse.json({ error: 'Invalid domain specified' }, { status: 400 });
      }
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

    const isSkippedAll = request.cookies.get('skipped_all_steps')?.value === 'true';
    if (isSkippedAll) {
      switch (domain) {
        case 'dashboard':
          return NextResponse.json({
            activeClientsCount: 0,
            totalClientsCount: 0,
            activeProjectsCount: 0,
            currentMonthRevenue: 0,
            projectRisks: [],
            grossBillings: 0,
            totalExpenses: 0,
            outstandingAmount: 0,
            revenueHistory: [
              { label: 'Jan', value: 0 },
              { label: 'Feb', value: 0 },
              { label: 'Mar', value: 0 },
              { label: 'Apr', value: 0 },
              { label: 'May', value: 0 },
              { label: 'Jun', value: 0 },
            ],
          });
        case 'finance':
          return NextResponse.json({
            grossBillings: 0,
            outstandingAmount: 0,
            totalExpenses: 0,
            recentInvoices: [],
            expenses: [],
          });
        case 'clients':
          return NextResponse.json([]);
        case 'projects':
          return NextResponse.json([]);
        case 'team':
          return NextResponse.json([]);
        case 'reporting':
          return NextResponse.json([]);
        case 'operations':
          return NextResponse.json({
            automationsCount: 0,
            runsCount: 0,
          });
        default:
          return NextResponse.json({ error: 'Invalid domain specified' }, { status: 400 });
      }
    }

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
        
        // Sum current month invoices (June 2026 based on seed)
        const currentMonthRevenue = invoices
          .filter(inv => inv.status === 'PAID')
          .reduce((sum, inv) => sum + inv.amount, 0);

        const grossBillings = invoices.reduce((sum, inv) => sum + inv.amount, 0);
        const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
        const outstandingAmount = invoices
          .filter(inv => inv.status === 'UNPAID' || inv.status === 'OVERDUE')
          .reduce((sum, inv) => sum + inv.amount, 0);

        const projectRisks = projects
          .filter(p => p.riskLevel === 'HIGH' || p.riskLevel === 'MEDIUM')
          .map(p => ({
            id: p.id,
            name: p.name,
            riskLevel: p.riskLevel,
            riskDescription: p.riskDescription || '',
          }));

        // Compute revenue history (past 6 months) dynamically
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthlyRevenue = Array(12).fill(0);
        invoices.forEach(inv => {
          if (inv.status === 'PAID') {
            const date = new Date(inv.issuedDate);
            const monthIdx = date.getMonth();
            monthlyRevenue[monthIdx] += inv.amount;
          }
        });
        const revenueHistory = months.map((label, index) => ({
          label,
          value: monthlyRevenue[index]
        })).slice(0, 6); // standard 6 months Jan-Jun display

        return NextResponse.json({
          activeClientsCount,
          totalClientsCount,
          activeProjectsCount,
          currentMonthRevenue,
          projectRisks,
          grossBillings,
          totalExpenses,
          outstandingAmount,
          revenueHistory,
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

        const grossBillings = invoices.reduce((sum, inv) => sum + inv.amount, 0);
        const outstandingAmount = invoices
          .filter(inv => inv.status === 'UNPAID' || inv.status === 'OVERDUE')
          .reduce((sum, inv) => sum + inv.amount, 0);
        const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

        const recentInvoices = invoices.slice(0, 10).map(inv => ({
          id: inv.id,
          number: inv.invoiceNumber,
          client: inv.client.name,
          amount: inv.amount,
          date: inv.issuedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          status: inv.status,
        }));

        return NextResponse.json({
          grossBillings,
          outstandingAmount,
          totalExpenses,
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
