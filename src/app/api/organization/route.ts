import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getOrganization } from '@/lib/org';
import { deobfuscateEmail } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    const org = await getOrganization(request);
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }
    
    // Check if any financial data exists
    const txCount = await prisma.transaction.count();
    const invCount = await prisma.invoice.count();
    const expCount = await prisma.expense.count();
    const hasFinancialData = (txCount + invCount + expCount) > 0;

    return NextResponse.json({
      ...org,
      hasFinancialData
    });
  } catch (error: any) {
    console.error('Error fetching organization:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, plan, hasAddon, agencyTypes, bankNames, currency, aiSharingConsent, username, email } = body;

    const cookieEmail = request.cookies.get('currentUserEmail')?.value;
    const userEmail = deobfuscateEmail(cookieEmail || '') || email || '';

    if (!userEmail) {
      return NextResponse.json({ error: 'User email context is required' }, { status: 400 });
    }

    let user = await prisma.user.findUnique({
      where: { email: userEmail },
      include: { organization: true }
    });

    let org = user?.organization || null;

    if (!org) {
      // Create a brand new organization (agency) for the user
      org = await prisma.organization.create({
        data: {
          name: name || 'New Agency',
          plan: plan || 'BASIC',
          hasAddon: hasAddon || false,
          agencyTypes: agencyTypes || [],
          bankNames: bankNames || [],
          currency: currency || 'USD',
          aiSharingConsent: aiSharingConsent || false,
        }
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            email: userEmail,
            name: username || userEmail.split('@')[0],
            role: 'ADMIN',
            orgId: org.id,
          },
          include: { organization: true }
        });
      } else {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { orgId: org.id },
          include: { organization: true }
        });
      }
    } else {
      // Currency restriction check
      if (currency !== undefined && currency !== org.currency) {
        const txCount = await prisma.transaction.count();
        const invCount = await prisma.invoice.count();
        const expCount = await prisma.expense.count();
        const hasFinancialData = (txCount + invCount + expCount) > 0;
        if (hasFinancialData) {
          return NextResponse.json({
            error: "Billing currency cannot be changed once financial data (invoices, expenses, or transactions) has been entered into the workspace."
          }, { status: 400 });
        }
      }

      // Limit check
      let maxAllowed = 0;
      const planToCheck = plan !== undefined ? plan : org.plan;
      const hasAddonToCheck = hasAddon !== undefined ? hasAddon : org.hasAddon;
      if (planToCheck === 'BASIC') {
        maxAllowed = hasAddonToCheck ? 2 : 1;
      } else if (planToCheck === 'PRO') {
        maxAllowed = 5;
      } else if (planToCheck === 'ADVANCED') {
        maxAllowed = 1000; // unlimited
      } else {
        return NextResponse.json({ error: 'Invalid plan specified' }, { status: 400 });
      }

      if (agencyTypes && agencyTypes.length > maxAllowed) {
        return NextResponse.json({
          error: `Selected agency types exceed the limit for the ${planToCheck} plan${planToCheck === 'BASIC' && hasAddonToCheck ? ' with add-on' : ''}. Allowed max: ${maxAllowed}.`
        }, { status: 400 });
      }

      org = await prisma.organization.update({
        where: { id: org.id },
        data: {
          name: name !== undefined ? name : org.name,
          plan: plan !== undefined ? plan : org.plan,
          hasAddon: hasAddon !== undefined ? hasAddon : org.hasAddon,
          agencyTypes: agencyTypes !== undefined ? agencyTypes : org.agencyTypes,
          bankNames: bankNames !== undefined ? bankNames : org.bankNames,
          currency: currency !== undefined ? currency : org.currency,
          aiSharingConsent: aiSharingConsent !== undefined ? aiSharingConsent : org.aiSharingConsent,
        },
      });
    }

    return NextResponse.json(org);
  } catch (error: any) {
    console.error('Error updating organization:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const org = await getOrganization(request);
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const orgId = org.id;

    // Execute deletion of all organization scoped models in a transaction
    await prisma.$transaction([
      // 1. Delete direct org-scoped child models
      prisma.calendarEvent.deleteMany({ where: { orgId } }),
      prisma.recurringSubscription.deleteMany({ where: { orgId } }),
      prisma.transaction.deleteMany({ where: { orgId } }),
      prisma.expense.deleteMany({ where: { orgId } }),
      prisma.invoice.deleteMany({ where: { orgId } }),
      
      // 2. Delete tasks, reports, automations, prism messages
      prisma.clientTask.deleteMany({ where: { client: { orgId } } }),
      prisma.report.deleteMany({ where: { createdBy: { orgId } } }),
      prisma.askPrismMessage.deleteMany({ where: { user: { orgId } } }),
      prisma.automationRun.deleteMany({ where: { automation: { orgId } } }),
      prisma.automation.deleteMany({ where: { orgId } }),

      // 3. Delete projects & clients (cascades to Milestones, Allocations, ProjectMembers, ProjectStages, Contacts, ClientInvites, ScheduledPosts)
      prisma.project.deleteMany({ where: { orgId } }),
      prisma.client.deleteMany({ where: { orgId } }),

      // 4. Delete brands & creatives (cascades to DesignAssets, Campaigns)
      prisma.designAsset.deleteMany({ where: { brand: { orgId } } }),
      prisma.campaign.deleteMany({ where: { brand: { orgId } } }),
      prisma.brand.deleteMany({ where: { orgId } }),

      // 5. Delete Meta ads, leads, campaigns
      prisma.metaLead.deleteMany({ where: { orgId } }),
      prisma.metaAd.deleteMany({ where: { orgId } }),
      prisma.metaCampaign.deleteMany({ where: { orgId } }),

      // 6. Delete agency leads & integration connections
      prisma.agencyLead.deleteMany({ where: { orgId } }),
      prisma.integrationConnection.deleteMany({ where: { orgId } }),

      // 7. Delete financial forecasts (simulated global forecast data)
      prisma.financialForecast.deleteMany({}),

      // 8. Update organization to reset selection lists
      prisma.organization.update({
        where: { id: orgId },
        data: {
          agencyTypes: [],
          bankNames: [],
        }
      })
    ]);

    console.log(`Successfully wiped all agency data for organization ID: ${orgId}`);

    return NextResponse.json({
      success: true,
      message: 'All agency data wiped successfully. Active admin account and organization container preserved.'
    });
  } catch (error: any) {
    console.error('Error wiping agency data:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

