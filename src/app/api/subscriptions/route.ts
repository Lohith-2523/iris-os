import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getOrganization, getRequestUser, isOrganizationAdmin } from '@/lib/org';
import { cursorHeaders, descendingCursorWhere, finishCursorPage, readCursorPage } from '@/lib/cursor-pagination';

async function canManageSubscriptions(request: NextRequest) {
  const user = await getRequestUser(request);
  return Boolean(user && isOrganizationAdmin(user));
}

export async function GET(request: NextRequest) {
  try {
    const org = await getOrganization(request);
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }
    if (!(await canManageSubscriptions(request))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const pageRequest = readCursorPage(request);
    const subscriptions = await prisma.recurringSubscription.findMany({
      where: { orgId: org.id, ...descendingCursorWhere(pageRequest.cursor, 'createdAt') },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: pageRequest.take,
    });

    const page = finishCursorPage(subscriptions, pageRequest.limit, (subscription) => subscription.createdAt);
    return NextResponse.json(page.items, { headers: cursorHeaders(page, pageRequest.limit) });
  } catch (error: any) {
    console.error('Error fetching subscriptions:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const org = await getOrganization(request);
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }
    if (!(await canManageSubscriptions(request))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const { name, amount, category, frequency, startDate } = body;

    if (!name || !amount || !category || !frequency || !startDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ error: 'Amount must be a positive number' }, { status: 400 });
    }

    const allowedCategories = ['AI subscriptions', 'Software subscriptions', 'Other subscriptions', 'Expense'];
    if (!allowedCategories.includes(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }

    const allowedFrequencies = ['monthly', 'quarterly', 'yearly'];
    if (!allowedFrequencies.includes(frequency)) {
      return NextResponse.json({ error: 'Invalid frequency' }, { status: 400 });
    }

    const newSub = await prisma.recurringSubscription.create({
      data: {
        name,
        amount: parsedAmount,
        category,
        frequency,
        startDate: new Date(startDate),
        orgId: org.id,
      },
    });

    return NextResponse.json(newSub);
  } catch (error: any) {
    console.error('Error creating subscription:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const org = await getOrganization(request);
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }
    if (!(await canManageSubscriptions(request))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const { id, amount, frequency } = body;

    if (!id) {
      return NextResponse.json({ error: 'Subscription ID is required' }, { status: 400 });
    }

    const existingSub = await prisma.recurringSubscription.findFirst({
      where: { id, orgId: org.id },
    });

    if (!existingSub) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    // Only allow updating amount and frequency
    const updateData: any = {};

    if (amount !== undefined) {
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return NextResponse.json({ error: 'Amount must be a positive number' }, { status: 400 });
      }
      updateData.amount = parsedAmount;
    }

    if (frequency !== undefined) {
      const allowedFrequencies = ['monthly', 'quarterly', 'yearly'];
      if (!allowedFrequencies.includes(frequency)) {
        return NextResponse.json({ error: 'Invalid frequency' }, { status: 400 });
      }
      updateData.frequency = frequency;
    }

    const updatedSub = await prisma.recurringSubscription.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updatedSub);
  } catch (error: any) {
    console.error('Error updating subscription:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const org = await getOrganization(request);
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }
    if (!(await canManageSubscriptions(request))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Subscription ID is required' }, { status: 400 });
    }

    const existingSub = await prisma.recurringSubscription.findFirst({
      where: { id, orgId: org.id },
    });

    if (!existingSub) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    await prisma.recurringSubscription.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting subscription:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
