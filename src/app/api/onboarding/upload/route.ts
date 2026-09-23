import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getOrganization, getRequestUser, isOrganizationAdmin } from '@/lib/org';
import { entitlementsFor, planLimitMessage } from '@/lib/plan-entitlements';

export async function POST(request: NextRequest) {
  try {
    const org = await getOrganization(request);
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }
    const user = await getRequestUser(request);
    if (!user || !isOrganizationAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const { type, data } = body;

    if (!type || !Array.isArray(data) || data.length > 5000) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    if (type === 'financial') {
      const invoiceClientNames = [...new Set(data
        .filter((row) => String(row.type || '').toUpperCase().trim() === 'INVOICE')
        .map((row) => String(row.name || '').trim())
        .filter(Boolean))];
      const [currentClientCount, matchingClients] = await Promise.all([
        prisma.client.count({ where: { orgId: org.id } }),
        prisma.client.findMany({
          where: { orgId: org.id, name: { in: invoiceClientNames } },
          select: { name: true },
        }),
      ]);
      const existingNames = new Set(matchingClients.map((client) => client.name));
      const clientsToCreate = invoiceClientNames.filter((name) => !existingNames.has(name)).length;
      const clientLimit = entitlementsFor(org.plan).clientLimit;
      if (clientLimit !== null && currentClientCount + clientsToCreate > clientLimit) {
        return NextResponse.json({
          error: planLimitMessage('clients', clientLimit, org.plan),
          current: currentClientCount,
          requestedNewClients: clientsToCreate,
        }, { status: 409 });
      }
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

        if (isNaN(amount) || !name || !dateStr) continue;

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
                churnRiskScore: 0,
                roiMetric: 0,
                upsellOpportunityValue: 0,
              }
            });
          }

          let project = await prisma.project.findFirst({
            where: { orgId: org.id, clientId: client.id },
            orderBy: { createdAt: 'asc' },
          });
          if (!project) {
            project = await prisma.project.create({
              data: {
                orgId: org.id,
                clientId: client.id,
                name: `${client.name} — Imported billing`,
                status: 'COMPLETED',
                riskLevel: 'LOW',
                startDate: date,
                endDate: date,
                paymentType: 'ONE_TIME',
                paymentAmount: Math.abs(amount),
                paymentTerms: 'NET_30',
              },
            });
          }

          const normalizedStatus = status === 'UNPAID'
            ? 'UNPAID'
            : status === 'PARTIALLY_PAID'
              ? 'PARTIALLY_PAID'
              : 'FULLY_PAID';
          const paidAmount = normalizedStatus === 'FULLY_PAID' ? Math.abs(amount) : 0;

          // Historical imports remain project-bound and can use the same PDF/download flow.
          const invoice = await prisma.invoice.create({
            data: {
              orgId: org.id,
              clientId: client.id,
              projectId: project.id,
              invoiceNumber: identifier || `IMPORT-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
              description: project.name,
              subtotal: Math.abs(amount),
              amount: Math.abs(amount),
              paidAmount,
              dueDate: new Date(date.getTime() + 14 * 24 * 60 * 60 * 1000),
              issuedDate: date,
              status: normalizedStatus,
              source: 'IMPORTED',
              deliveryStatus: 'SENT',
              sentAt: date,
              sellerSnapshot: {
                name: org.name,
                legalEntityName: org.legalEntityName || org.name,
                email: org.billingEmail || '',
                addressLine1: org.billingAddressLine1 || '',
                addressLine2: org.billingAddressLine2 || '',
                city: org.billingCity || '',
                state: org.billingState || '',
                postalCode: org.billingPostalCode || '',
                country: org.billingCountry || '',
                gstNumber: org.gstNumber || '',
              },
              buyerSnapshot: {
                name: client.name,
                legalEntityName: client.legalEntityName || client.name,
                email: '',
                addressLine1: client.billingAddressLine1 || '',
                addressLine2: client.billingAddressLine2 || '',
                city: client.billingCity || '',
                state: client.billingState || '',
                postalCode: client.billingPostalCode || '',
                country: client.billingCountry || '',
                gstNumber: client.gstNumber || '',
              },
              lineItems: [{
                description: project.name,
                quantity: 1,
                unitPrice: Math.abs(amount),
                amount: Math.abs(amount),
              }],
            }
          });

          if (paidAmount > 0) {
            await prisma.transaction.create({
              data: {
                orgId: org.id,
                clientId: client.id,
                invoiceId: invoice.id,
                date: date,
                details: `Invoice Payment: ${invoice.invoiceNumber}`,
                category: 'Revenue',
                type: 'Others',
                transactorAccount: name,
                yourAccount: 'Main Account',
                amount: paidAmount,
                referenceNumber: identifier || null,
              }
            });
          }

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
