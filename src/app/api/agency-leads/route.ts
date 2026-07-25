import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getOrganization, getRequestUser } from '@/lib/org';
import { calculateLeadEconomics } from '@/lib/lead-economics';

export async function GET(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const [leads, expenseTransactions, closedLeadCount, sourcedRetainers] = await Promise.all([
      prisma.agencyLead.findMany({
        where: { orgId: user.orgId },
        orderBy: { createdTime: 'desc' },
        include: {
          convertedClient: {
            select: { id: true, name: true },
          },
        },
      }),
      prisma.transaction.findMany({
        where: {
          orgId: user.orgId,
          category: { equals: 'Expense', mode: 'insensitive' },
        },
        select: { details: true, amount: true },
      }),
      prisma.agencyLead.count({
        where: {
          orgId: user.orgId,
          status: { equals: 'closed', mode: 'insensitive' },
        },
      }),
      prisma.recurringRetainer.findMany({
        where: {
          orgId: user.orgId,
          client: {
            sourceLead: {
              is: {
                status: { equals: 'closed', mode: 'insensitive' },
              },
            },
          },
        },
        select: { amount: true },
      }),
    ]);

    const metrics = calculateLeadEconomics({
      expenseTransactions,
      closedLeadCount,
      sourcedRetainerRevenue: sourcedRetainers.reduce((total, retainer) => total + retainer.amount, 0),
    });

    return NextResponse.json({
      leads,
      metrics,
      role: user.role || 'admin'
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error fetching Agency Leads:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Agency Leads data', details: errorMessage },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    const org = await getOrganization(request);
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // 1. Drag and drop stage status update or inline state update
    if (action === 'update_status') {
      const { leadId, status } = body;
      if (!leadId || !status) {
        return NextResponse.json({ error: 'Missing leadId or status' }, { status: 400 });
      }

      const updatedLead = await prisma.agencyLead.update({
        where: { orgId_leadId: { orgId: org.id, leadId } },
        data: { status }
      });

      return NextResponse.json({ success: true, lead: updatedLead });
    }

    // 2. Single Manual Entry Creation
    if (action === 'create') {
      const { fullName, email, phone, funnelName, status, approachMethod } = body;
      if (!fullName || !email || !status) {
        return NextResponse.json({ error: 'Missing required parameters: fullName, email, status' }, { status: 400 });
      }

      const cleanStatus = status.toLowerCase();
      const newLead = await prisma.agencyLead.create({
        data: {
          fullName,
          email,
          phone: phone || null,
          status: cleanStatus,
          funnelName: funnelName || 'Manual Entry',
          approachMethod: approachMethod || 'Email',
          collectionMethod: 'Manual Entry',
          orgId: org.id
        }
      });

      return NextResponse.json({ success: true, lead: newLead });
    }

    // 3. Bulk Template Imports
    if (action === 'import') {
      const { leads } = body;
      if (!leads || !Array.isArray(leads)) {
        return NextResponse.json({ error: 'Missing array of leads to import' }, { status: 400 });
      }

      const importedLeads = [];
      for (const lead of leads) {
        const { fullName, email, phone, funnelName, status, approachMethod } = lead;
        if (!fullName || !email) continue; // Skip incomplete items

        const cleanStatus = (status || 'procured').toLowerCase();

        const existing = await prisma.agencyLead.findFirst({ where: { orgId: org.id, email } });
        const created = existing ? await prisma.agencyLead.update({
          where: { id: existing.id },
          data: {
            fullName,
            email,
            phone: phone || null,
            status: cleanStatus,
            funnelName: funnelName || 'Bulk Import',
            approachMethod: approachMethod || 'Email',
          }
        }) : await prisma.agencyLead.create({
          data: {
            fullName,
            email,
            phone: phone || null,
            status: cleanStatus,
            funnelName: funnelName || 'Bulk Import',
            approachMethod: approachMethod || 'Email',
            collectionMethod: 'Bulk Import',
            orgId: org.id
          }
        });
        importedLeads.push(created);
      }

      return NextResponse.json({ success: true, count: importedLeads.length, leads: importedLeads });
    }

    // 4. Delete Lead
    if (action === 'delete') {
      const { id } = body;
      if (!id) {
        return NextResponse.json({ error: 'Missing id parameter to delete' }, { status: 400 });
      }

      await prisma.agencyLead.delete({
        where: { id, orgId: org.id }
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error in Agency Leads API:', error);
    return NextResponse.json(
      { error: 'Failed to process request', details: errorMessage },
      { status: 500 }
    );
  }
}
