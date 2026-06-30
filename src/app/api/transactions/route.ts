import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const org = await prisma.organization.findFirst();
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

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
    const org = await prisma.organization.findFirst();
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const body = await request.json();

    if (body.bulk && Array.isArray(body.transactions)) {
      // Bulk import
      const createdTransactions = [];
      for (const t of body.transactions) {
        const amount = parseFloat(t.amount);
        if (isNaN(amount)) continue;

        const created = await prisma.transaction.create({
          data: {
            date: new Date(t.date || new Date()),
            details: t.details || 'Imported Transaction',
            type: t.type || 'Others',
            transactorAccount: t.transactorAccount || '',
            yourAccount: t.yourAccount || '',
            amount: amount,
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
      const { date, details, type, transactorAccount, yourAccount, amount, referenceNumber, comments } = body;

      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount)) {
        return NextResponse.json({ error: 'Invalid amount value' }, { status: 400 });
      }

      const newTx = await prisma.transaction.create({
        data: {
          date: new Date(date || new Date()),
          details: details || 'Manual Entry',
          type: type || 'Others',
          transactorAccount: transactorAccount || '',
          yourAccount: yourAccount || '',
          amount: parsedAmount,
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
