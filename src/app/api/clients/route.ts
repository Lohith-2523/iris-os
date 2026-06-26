import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      domain,
      status,
      healthScore,
      healthStatus,
      churnRiskScore,
      roiMetric,
      upsellOpportunityValue,
      agencyType,
      businessModel,
      metadata,
      contact,
      currentUserEmail,
    } = body;

    if (!currentUserEmail) {
      return NextResponse.json({ error: 'Missing currentUserEmail authorization context' }, { status: 400 });
    }

    // Verify admin role
    const user = await prisma.user.findUnique({
      where: { email: currentUserEmail },
    });

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Access Denied: Administrative clearance required.' }, { status: 403 });
    }

    const org = await prisma.organization.findFirst();
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    if (!name) {
      return NextResponse.json({ error: 'Missing client name parameter' }, { status: 400 });
    }

    const newClient = await prisma.client.create({
      data: {
        name,
        domain: domain || null,
        status: status || 'ACTIVE',
        healthScore: healthScore !== undefined ? healthScore : 100,
        healthStatus: healthStatus || 'EXCELLENT',
        churnRiskScore: churnRiskScore !== undefined ? churnRiskScore : 0,
        roiMetric: roiMetric !== undefined ? roiMetric : 0.0,
        upsellOpportunityValue: upsellOpportunityValue !== undefined ? upsellOpportunityValue : 0.0,
        agencyType: agencyType || null,
        businessModel: businessModel || null,
        metadata: metadata || {},
        orgId: org.id,
        contacts: contact ? {
          create: {
            name: contact.name || 'Primary Point of Contact',
            email: contact.email || 'contact@example.com',
            phone: contact.phone || null,
            role: contact.role || 'Primary Contact',
          }
        } : undefined
      },
      include: {
        contacts: true,
      }
    });

    return NextResponse.json(newClient);
  } catch (error: any) {
    console.error('Error onboarding client:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
