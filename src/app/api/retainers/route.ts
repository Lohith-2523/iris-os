import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getOrganization, getRequestUser, isOrganizationAdmin } from '@/lib/org';
import { parseProjectCommercials } from '@/lib/projects/commercial';

async function getAdminOrganization(request: NextRequest) {
  const [organization, user] = await Promise.all([
    getOrganization(request),
    getRequestUser(request),
  ]);
  if (!organization || !user || !isOrganizationAdmin(user)) return null;
  return organization;
}

function toProjectPayment(project: {
  id: string;
  name: string;
  paymentType: string;
  paymentAmount: number | null;
  paymentFrequency: string | null;
  paymentStartDate: Date | null;
  paymentTerms: string | null;
  startDate: Date;
  client: { id: string; name: string };
}) {
  return {
    id: project.id,
    projectId: project.id,
    name: project.name,
    paymentType: project.paymentType,
    amount: project.paymentAmount,
    frequency: project.paymentType === 'ONE_TIME' ? null : project.paymentFrequency,
    startDate: project.paymentStartDate || project.startDate,
    paymentTerms: project.paymentTerms,
    clientId: project.client.id,
    client: project.client,
    project: { id: project.id, name: project.name },
  };
}

export async function GET(request: NextRequest) {
  try {
    const organization = await getAdminOrganization(request);
    if (!organization) return NextResponse.json({ error: 'Oops! You do not have enough permissions.' }, { status: 403 });

    const projects = await prisma.project.findMany({
      where: { orgId: organization.id, paymentAmount: { gt: 0 } },
      include: { client: { select: { id: true, name: true } } },
      orderBy: [{ paymentStartDate: 'desc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json(projects.map(toProjectPayment));
  } catch (error) {
    console.error('Error fetching project payments:', error);
    return NextResponse.json({ error: 'Unable to load project payments' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const organization = await getAdminOrganization(request);
    if (!organization) return NextResponse.json({ error: 'Oops! You do not have enough permissions.' }, { status: 403 });

    const body = await request.json();
    const projectId = String(body.projectId || body.id || '');
    if (!projectId) return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });

    const existing = await prisma.project.findFirst({
      where: { id: projectId, orgId: organization.id },
      select: { id: true },
    });
    if (!existing) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    const commercials = parseProjectCommercials({
      paymentType: body.paymentType,
      paymentAmount: body.amount,
      paymentFrequency: body.frequency,
      paymentStartDate: body.startDate,
      paymentTerms: body.paymentTerms,
    }, { partial: true });
    if (commercials.error) {
      return NextResponse.json({ error: commercials.error }, { status: 400 });
    }

    const project = await prisma.project.update({
      where: { id: projectId },
      data: commercials.data ?? {},
      include: { client: { select: { id: true, name: true } } },
    });
    return NextResponse.json(toProjectPayment(project));
  } catch (error) {
    console.error('Error updating project payment:', error);
    return NextResponse.json({ error: 'Unable to update project payment' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const organization = await getAdminOrganization(request);
    if (!organization) return NextResponse.json({ error: 'Oops! You do not have enough permissions.' }, { status: 403 });

    const projectId = new URL(request.url).searchParams.get('id');
    if (!projectId) return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });

    const result = await prisma.project.updateMany({
      where: { id: projectId, orgId: organization.id },
      data: {
        paymentAmount: null,
        paymentFrequency: null,
        paymentStartDate: null,
        paymentTerms: null,
      },
    });
    if (result.count === 0) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error clearing project payment:', error);
    return NextResponse.json({ error: 'Unable to clear project payment' }, { status: 500 });
  }
}
