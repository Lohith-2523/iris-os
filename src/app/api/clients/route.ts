import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { deobfuscateEmail } from '@/lib/utils';
import { getOrganization } from '@/lib/org';

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
      currentUserEmail: rawUserEmail,
      adAccountId,
    } = body;

    if (!rawUserEmail) {
      return NextResponse.json({ error: 'Missing currentUserEmail authorization context' }, { status: 400 });
    }

    const currentUserEmail = deobfuscateEmail(rawUserEmail);

    // Verify admin role (case insensitive to support both 'admin' and 'ADMIN')
    const user = await prisma.user.findUnique({
      where: { email: currentUserEmail },
    });

    if (!user || user.role.toUpperCase() !== 'ADMIN') {
      return NextResponse.json({ error: 'Access Denied: Administrative clearance required.' }, { status: 403 });
    }

    const org = await getOrganization(request);
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
        adAccountId: adAccountId || null,
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

    // Generate Client Invite Link automatically
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    const inviteEmail = contact?.email || `contact@${domain || 'example.com'}`;
    const inviteName = contact?.name || `${name} Contact`;

    const invite = await prisma.clientInvite.create({
      data: {
        email: inviteEmail,
        name: inviteName,
        clientId: newClient.id,
        adAccountId: adAccountId || null,
        token,
        expiresAt,
      }
    });

    // Simulate sending welcome email in console logs
    console.log('\n==================================================');
    console.log(`✉️ WELCOME EMAIL SIMULATED FOR CLIENT: ${name}`);
    console.log(`TO: ${inviteEmail} (${inviteName})`);
    console.log('SUBJECT: Welcome to Iris OS - Set Up Your Client Account');
    console.log('BODY:');
    console.log(`Hello ${inviteName},\n`);
    console.log(`Welcome to Iris OS! You have been invited by the team at Apex Creative to connect.`);
    console.log(`You can register your account and access your Meta Portal dashboard using the link below:`);
    console.log(`http://localhost:3000/invite?token=${token}\n`);
    console.log('This invite token will expire in 7 days.');
    console.log('Best regards,\nIris OS Automation Engine');
    console.log('==================================================\n');

    return NextResponse.json({
      ...newClient,
      inviteUrl: `/invite?token=${token}`
    });
  } catch (error: any) {
    console.error('Error onboarding client:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
