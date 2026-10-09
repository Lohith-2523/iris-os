import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getRequestSecurityContext } from '@/server/security/request-security-context';
import type { FinancialTimeframe } from '@/lib/finance/financial-history';
import { listWorkspaceClients, listWorkspaceTeam } from '@/server/domains/workspace-directory-service';
import { getDashboardMetrics, getFinanceOverview } from '@/server/domains/finance-read-service';

function validDate(value: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value ? value : null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const domain = searchParams.get('domain');
    const requestedTimeframe = searchParams.get('timeframe');
    const timeframe: FinancialTimeframe = requestedTimeframe === 'Monthly' || requestedTimeframe === 'Quarterly' || requestedTimeframe === 'Yearly' || requestedTimeframe === 'All Time'
      ? requestedTimeframe
      : 'Six Months';

    if (!domain) {
      return NextResponse.json({ error: 'Missing domain parameter' }, { status: 400 });
    }

    const ctx = await getRequestSecurityContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Oops! Please sign in to continue.' }, { status: 401 });
    }
    const user = ctx.user;

    const orgId = user.orgId;
    const projectScope = user.role.toLowerCase() === 'client' && user.clientId
      ? { clientId: user.clientId }
      : {};
    const memberScope = user.role.toLowerCase() === 'member'
      ? { members: { some: { userId: user.id } } }
      : {};


    switch (domain) {
      case 'dashboard': {
        const start = validDate(searchParams.get('start'));
        const end = validDate(searchParams.get('end'));
        const range = start && end
          ? (start <= end ? { start, end } : { start: end, end: start })
          : undefined;
        return NextResponse.json(await getDashboardMetrics(ctx, range, timeframe));
      }

      case 'finance': {
        const start = validDate(searchParams.get('start'));
        const end = validDate(searchParams.get('end'));
        const range = start && end
          ? (start <= end ? { start, end } : { start: end, end: start })
          : undefined;
        return NextResponse.json(await getFinanceOverview(ctx, timeframe, range));
      }

      case 'clients': {
        return NextResponse.json(await listWorkspaceClients(ctx));
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
        return NextResponse.json(await listWorkspaceTeam(ctx));
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
    return NextResponse.json({ error: 'Oops! Something went wrong. Please try again.' }, { status: 500 });
  }
}
