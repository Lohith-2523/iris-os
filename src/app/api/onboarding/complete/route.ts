import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getOrganization } from '@/lib/org';
import { deobfuscateEmail } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const org = await getOrganization(request);
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const rawEmail = request.cookies.get('currentUserEmail')?.value;
    if (!rawEmail) {
      return NextResponse.json({ error: 'User context required' }, { status: 401 });
    }
    const userEmail = deobfuscateEmail(rawEmail);

    const body = await request.json();
    const { google, meta, financial, leads, skippedAll } = body;

    if (skippedAll) {
      // Wipe EVERYTHING for this organization
      await prisma.invoice.deleteMany({ where: { orgId: org.id } });
      await prisma.expense.deleteMany({ where: { orgId: org.id } });
      await prisma.projectMember.deleteMany({ where: { project: { orgId: org.id } } });
      await prisma.clientTask.deleteMany({ where: { client: { orgId: org.id } } });
      await prisma.projectStage.deleteMany({ where: { project: { orgId: org.id } } });
      await prisma.project.deleteMany({ where: { orgId: org.id } });
      await prisma.client.deleteMany({ where: { orgId: org.id } });
      await prisma.transaction.deleteMany({ where: { orgId: org.id } });
      await prisma.agencyLead.deleteMany({ where: { orgId: org.id } });
      await prisma.metaAd.deleteMany({ where: { orgId: org.id } });
      await prisma.metaLead.deleteMany({ where: { orgId: org.id } });
      await prisma.metaCampaign.deleteMany({ where: { orgId: org.id } });
      await prisma.calendarEvent.deleteMany({ where: { orgId: org.id } });
      await prisma.integrationConnection.deleteMany({ where: { orgId: org.id } });
      await prisma.recurringSubscription.deleteMany({ where: { orgId: org.id } });
      
    } else {
      if (google === 'skipped') {
        await prisma.calendarEvent.deleteMany({ where: { orgId: org.id, isGoogleEvent: true } });
      }
      if (meta === 'skipped') {
        await prisma.metaAd.deleteMany({ where: { orgId: org.id } });
        await prisma.metaLead.deleteMany({ where: { orgId: org.id } });
        await prisma.metaCampaign.deleteMany({ where: { orgId: org.id } });
      }
      if (financial === 'skipped') {
        await prisma.invoice.deleteMany({ where: { orgId: org.id } });
        await prisma.expense.deleteMany({ where: { orgId: org.id } });
        await prisma.projectMember.deleteMany({ where: { project: { orgId: org.id } } });
        await prisma.clientTask.deleteMany({ where: { client: { orgId: org.id } } });
        await prisma.projectStage.deleteMany({ where: { project: { orgId: org.id } } });
        await prisma.project.deleteMany({ where: { orgId: org.id } });
        await prisma.client.deleteMany({ where: { orgId: org.id } });
        await prisma.transaction.deleteMany({ where: { orgId: org.id } });
        await prisma.recurringSubscription.deleteMany({ where: { orgId: org.id } });
      }
      if (leads === 'skipped') {
        await prisma.agencyLead.deleteMany({ where: { orgId: org.id } });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error completing onboarding:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
