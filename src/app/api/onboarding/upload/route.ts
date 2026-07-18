import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getOrganization } from '@/lib/org';

export async function POST(request: NextRequest) {
  try {
    const org = await getOrganization(request);
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const body = await request.json();
    const { type, data } = body;

    if (!type || !Array.isArray(data)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    if (type === 'financial') {
      // 1. Wipe existing Invoices, Expenses, Clients, Projects, Tasks, and Transactions for this org
      await prisma.invoice.deleteMany({ where: { orgId: org.id } });
      await prisma.expense.deleteMany({ where: { orgId: org.id } });
      await prisma.projectMember.deleteMany({ where: { project: { orgId: org.id } } });
      await prisma.clientTask.deleteMany({ where: { client: { orgId: org.id } } });
      await prisma.projectStage.deleteMany({ where: { project: { orgId: org.id } } });
      await prisma.project.deleteMany({ where: { orgId: org.id } });
      await prisma.client.deleteMany({ where: { orgId: org.id } });
      await prisma.transaction.deleteMany({ where: { orgId: org.id } });
      await prisma.recurringSubscription.deleteMany({ where: { orgId: org.id } });

      let invoiceCount = 0;
      let expenseCount = 0;

      // 2. Loop through uploaded financial rows
      for (const row of data) {
        const rowType = String(row.type).toUpperCase().trim();
        const identifier = String(row.identifier || '').trim();
        const name = String(row.name || '').trim();
        const amount = parseFloat(row.amount);
        const dateStr = String(row.date || '').trim();
        const status = String(row.status || '').toUpperCase().trim();

        if (isNaN(amount) || !name) continue;

        const date = dateStr ? new Date(dateStr) : new Date();

        if (rowType === 'INVOICE') {
          // Find or create Client
          let client = await prisma.client.findFirst({
            where: { orgId: org.id, name: name }
          });

          if (!client) {
            client = await prisma.client.create({
              data: {
                orgId: org.id,
                name: name,
                status: 'ACTIVE',
                healthScore: 90,
                healthStatus: 'EXCELLENT',
                churnRiskScore: 10,
                roiMetric: 4.2,
                upsellOpportunityValue: 12000,
              }
            });
          }

          // Create Invoice
          await prisma.invoice.create({
            data: {
              orgId: org.id,
              clientId: client.id,
              invoiceNumber: identifier || `INV-${Math.floor(Math.random() * 100000)}`,
              amount: amount,
              dueDate: new Date(date.getTime() + 30 * 24 * 60 * 60 * 1000), // Due in 30 days
              issuedDate: date,
              status: status || 'PAID',
            }
          });

          // Create Transaction
          await prisma.transaction.create({
            data: {
              orgId: org.id,
              date: date,
              details: `Invoice Payment: ${identifier}`,
              category: 'Revenue',
              type: 'Others',
              transactorAccount: name,
              yourAccount: 'Main Account',
              amount: Math.abs(amount),
              referenceNumber: identifier || null,
            }
          });

          invoiceCount++;
        } else if (rowType === 'EXPENSE') {
          // Create Expense
          await prisma.expense.create({
            data: {
              orgId: org.id,
              category: identifier || 'General Overhead',
              amount: amount,
              date: date,
              merchant: name,
              status: status || 'APPROVED',
            }
          });

          // Create Transaction
          await prisma.transaction.create({
            data: {
              orgId: org.id,
              date: date,
              details: `${name} (${identifier || 'General Overhead'})`,
              category: 'Expense',
              type: 'Others',
              transactorAccount: name,
              yourAccount: 'Main Account',
              amount: -Math.abs(amount),
              referenceNumber: null,
            }
          });

          expenseCount++;
        }
      }

      return NextResponse.json({ success: true, invoices: invoiceCount, expenses: expenseCount });
    } else if (type === 'leads') {
      // 1. Wipe existing AgencyLeads for this org
      await prisma.agencyLead.deleteMany({ where: { orgId: org.id } });

      let leadCount = 0;

      // 2. Loop through uploaded leads rows
      for (const row of data) {
        const fullName = String(row.fullname || row['full name'] || '').trim();
        const email = String(row.email || '').trim();
        const phone = String(row.phone || '').trim();
        const status = String(row.status || 'procured').toLowerCase().trim();
        const funnelName = String(row.funnelname || row['funnel name'] || 'Inbound').trim();
        const collectionMethod = String(row.collectionmethod || row['collection method'] || 'Bulk Import').trim();
        const approachMethod = String(row.approachmethod || row['approach method'] || 'Email').trim();

        if (!fullName || !email) continue;

        await prisma.agencyLead.create({
          data: {
            orgId: org.id,
            leadId: `LEAD-${Math.floor(Math.random() * 1000000)}`,
            fullName,
            email,
            phone: phone || null,
            status,
            funnelName,
            collectionMethod,
            approachMethod,
          }
        });

        leadCount++;
      }

      return NextResponse.json({ success: true, count: leadCount });
    }

    return NextResponse.json({ error: 'Invalid upload type' }, { status: 400 });
  } catch (error: any) {
    console.error('Error handling upload:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
