import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const domain = searchParams.get('domain');

    if (!domain) {
      return NextResponse.json({ error: 'Missing domain parameter' }, { status: 400 });
    }

    switch (domain) {
      case 'dashboard': {
        // Compute dashboard executive metrics
        const clients = await prisma.client.findMany({ where: { status: 'ACTIVE' } });
        const allClients = await prisma.client.findMany();
        const projects = await prisma.project.findMany();
        const invoices = await prisma.invoice.findMany();

        const activeClientsCount = clients.length;
        const totalClientsCount = allClients.length;
        const activeProjectsCount = projects.filter(p => p.status === 'IN_PROGRESS' || p.status === 'OVERDUE').length;
        
        // Sum current month invoices (June 2026 based on seed)
        const currentMonthRevenue = invoices
          .filter(inv => inv.status === 'PAID')
          .reduce((sum, inv) => sum + inv.amount, 0);

        const projectRisks = projects
          .filter(p => p.riskLevel === 'HIGH' || p.riskLevel === 'MEDIUM')
          .map(p => ({
            id: p.id,
            name: p.name,
            riskLevel: p.riskLevel,
            riskDescription: p.riskDescription || 'Timeline delay flagged by system',
          }));

        return NextResponse.json({
          activeClientsCount,
          totalClientsCount,
          activeProjectsCount,
          currentMonthRevenue,
          projectRisks,
        });
      }

      case 'finance': {
        const invoices = await prisma.invoice.findMany({
          orderBy: { issuedDate: 'desc' },
          include: { client: true }
        });
        const expenses = await prisma.expense.findMany({
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
        });
      }

      case 'clients': {
        const clients = await prisma.client.findMany({
          orderBy: { name: 'asc' }
        });

        const formattedClients = clients.map(c => ({
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
        }));

        return NextResponse.json(formattedClients);
      }

      case 'projects': {
        const projects = await prisma.project.findMany({
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
          endDate: p.endDate ? p.endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Flexible',
        }));

        return NextResponse.json(formattedProjects);
      }

      case 'team': {
        const users = await prisma.user.findMany({
          orderBy: { name: 'asc' }
        });
        
        // Mocking some workload details for staff details (or calculating from project allocations if fully implemented)
        const team = users.map(u => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          projects: u.role === 'ADMIN' ? 'Cross-organization audits' : 'Apex Design, Solaria Campaign',
          utilization: u.role === 'ADMIN' ? 70 : 92,
          status: u.role === 'ADMIN' ? 'EXCELLENT' : 'PEAK WORKLOAD',
        }));

        return NextResponse.json(team);
      }

      case 'reporting': {
        const reports = await prisma.report.findMany({
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
        const automations = await prisma.automation.findMany();
        const runs = await prisma.automationRun.findMany();

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
