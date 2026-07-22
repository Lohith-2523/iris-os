import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getOrganization, getRequestUser, isOrganizationAdmin } from '@/lib/org';

export async function GET(request: NextRequest) {
  try {
    const org = await getOrganization(request);
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }
    const user = await getRequestUser(request);
    if (!user || !isOrganizationAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const transactions = await prisma.transaction.findMany({
      where: { orgId: org.id },
      orderBy: { date: 'desc' },
    });

    return NextResponse.json(transactions);
  } catch (error: any) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const org = await getOrganization(request);
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }
    const user = await getRequestUser(request);
    if (!user || !isOrganizationAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();

    if (body.bulk && Array.isArray(body.transactions)) {
      // Bulk import
      const createdTransactions = [];
      for (const t of body.transactions) {
        const amount = parseFloat(t.amount);
        if (isNaN(amount)) continue;

        // Handle category from file upload (which will now have category)
        const category = t.category || (amount >= 0 ? 'Revenue' : 'Expense');
        let finalAmount = amount;
        if (category === 'Expense' || category === 'AI Subscription') {
          finalAmount = -Math.abs(amount);
        } else if (category === 'Revenue') {
          finalAmount = Math.abs(amount);
        }

        const created = await prisma.transaction.create({
          data: {
            date: new Date(t.date || new Date()),
            details: t.details || 'Imported Transaction',
            category: category,
            type: t.type || 'Others',
            transactorAccount: t.transactorAccount || '',
            yourAccount: t.yourAccount || '',
            amount: finalAmount,
            referenceNumber: t.referenceNumber || null,
            comments: t.comments || null,
            orgId: org.id,
          },
        });
        createdTransactions.push(created);
      }
      return NextResponse.json({ success: true, count: createdTransactions.length });
    } else {
      // Single transaction
      const { date, details, category, type, transactorAccount, yourAccount, amount, referenceNumber, comments } = body;

      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount)) {
        return NextResponse.json({ error: 'Invalid amount value' }, { status: 400 });
      }

      const targetCategory = category || (parsedAmount >= 0 ? 'Revenue' : 'Expense');
      let finalAmount = parsedAmount;
      if (targetCategory === 'Expense' || targetCategory === 'AI Subscription') {
        finalAmount = -Math.abs(parsedAmount);
      } else if (targetCategory === 'Revenue') {
        finalAmount = Math.abs(parsedAmount);
      }

      const newTx = await prisma.transaction.create({
        data: {
          date: new Date(date || new Date()),
          details: details || 'Manual Entry',
          category: targetCategory,
          type: type || 'Others',
          transactorAccount: transactorAccount || '',
          yourAccount: yourAccount || '',
          amount: finalAmount,
          referenceNumber: referenceNumber || null,
          comments: comments || null,
          orgId: org.id,
        },
      });

      return NextResponse.json(newTx);
    }
  } catch (error: any) {
    console.error('Error creating transaction:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const org = await getOrganization(request);
    const user = await getRequestUser(request);
    if (!org || !user || !isOrganizationAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Transaction id is required' }, { status: 400 });

    const result = await prisma.transaction.deleteMany({ where: { id, orgId: org.id } });
    if (result.count === 0) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting transaction:', error);
    return NextResponse.json({ error: 'Unable to delete transaction' }, { status: 500 });
  }
}
