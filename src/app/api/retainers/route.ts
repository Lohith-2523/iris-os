import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getOrganization, getRequestUser, isOrganizationAdmin } from '@/lib/org';

const ALLOWED_FREQUENCIES = new Set(['monthly', 'quarterly', 'yearly']);

async function getAdminOrganization(request: NextRequest) {
  const [organization, user] = await Promise.all([
    getOrganization(request),
    getRequestUser(request),
  ]);
  if (!organization || !user || !isOrganizationAdmin(user)) return null;
  return organization;
}

function parsePositiveAmount(value: unknown) {
  const amount = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

function parseDate(value: unknown) {
  const date = new Date(String(value || ''));
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function GET(request: NextRequest) {
  try {
    const organization = await getAdminOrganization(request);
    if (!organization) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const retainers = await prisma.recurringRetainer.findMany({
      where: { orgId: organization.id },
      include: { client: { select: { id: true, name: true } } },
      orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json(retainers);
  } catch (error) {
    console.error('Error fetching retainers:', error);
    return NextResponse.json({ error: 'Unable to load retainers' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const organization = await getAdminOrganization(request);
    if (!organization) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const amount = parsePositiveAmount(body.amount);
    const startDate = parseDate(body.startDate);
    const frequency = String(body.frequency || '').toLowerCase();
    const name = String(body.name || '').trim();
    const clientId = String(body.clientId || '');

    if (!name || !clientId || amount === null || !startDate || !ALLOWED_FREQUENCIES.has(frequency)) {
      return NextResponse.json({ error: 'Client, name, positive amount, frequency, and start date are required' }, { status: 400 });
    }

    const client = await prisma.client.findFirst({
      where: { id: clientId, orgId: organization.id },
      select: { id: true },
    });
    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

    const retainer = await prisma.recurringRetainer.create({
      data: { name, amount, frequency, startDate, clientId, orgId: organization.id },
      include: { client: { select: { id: true, name: true } } },
    });
    return NextResponse.json(retainer, { status: 201 });
  } catch (error) {
    console.error('Error creating retainer:', error);
    return NextResponse.json({ error: 'Unable to create retainer' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const organization = await getAdminOrganization(request);
    if (!organization) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const id = String(body.id || '');
    if (!id) return NextResponse.json({ error: 'Retainer ID is required' }, { status: 400 });

    const existing = await prisma.recurringRetainer.findFirst({
      where: { id, orgId: organization.id },
      select: { id: true },
    });
    if (!existing) return NextResponse.json({ error: 'Retainer not found' }, { status: 404 });

    const data: { amount?: number; frequency?: string; startDate?: Date } = {};
    if (body.amount !== undefined) {
      const amount = parsePositiveAmount(body.amount);
      if (amount === null) return NextResponse.json({ error: 'Amount must be positive' }, { status: 400 });
      data.amount = amount;
    }
    if (body.frequency !== undefined) {
      const frequency = String(body.frequency).toLowerCase();
      if (!ALLOWED_FREQUENCIES.has(frequency)) {
        return NextResponse.json({ error: 'Invalid frequency' }, { status: 400 });
      }
      data.frequency = frequency;
    }
    if (body.startDate !== undefined) {
      const startDate = parseDate(body.startDate);
      if (!startDate) return NextResponse.json({ error: 'Invalid start date' }, { status: 400 });
      data.startDate = startDate;
    }

    const retainer = await prisma.recurringRetainer.update({
      where: { id },
      data,
      include: { client: { select: { id: true, name: true } } },
    });
    return NextResponse.json(retainer);
  } catch (error) {
    console.error('Error updating retainer:', error);
    return NextResponse.json({ error: 'Unable to update retainer' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const organization = await getAdminOrganization(request);
    if (!organization) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Retainer ID is required' }, { status: 400 });

    const result = await prisma.recurringRetainer.deleteMany({
      where: { id, orgId: organization.id },
    });
    if (result.count === 0) return NextResponse.json({ error: 'Retainer not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting retainer:', error);
    return NextResponse.json({ error: 'Unable to delete retainer' }, { status: 500 });
  }
}
