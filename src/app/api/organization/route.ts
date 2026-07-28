import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getOrganization, getRequestUser, isOrganizationAdmin } from '@/lib/org';
import {
  normalizeInvoiceBrandColor,
  validateInvoiceLogoDataUrl,
} from '@/lib/invoices/branding';

export async function GET(request: NextRequest) {
  try {
    const org = await getOrganization(request);
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }
    
    // Check if any financial data exists
    const txCount = await prisma.transaction.count({ where: { orgId: org.id } });
    const invCount = await prisma.invoice.count({ where: { orgId: org.id } });
    const expCount = await prisma.expense.count({ where: { orgId: org.id } });
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
    const {
      name,
      legalEntityName,
      billingAddressLine1,
      billingAddressLine2,
      billingCity,
      billingState,
      billingPostalCode,
      billingCountry,
      gstNumber,
      invoiceLogoDataUrl,
      invoiceBrandColor,
      plan,
      hasAddon,
      agencyTypes,
      bankNames,
      currency,
      aiSharingConsent,
      username,
      billingEmail,
      preferences,
    } = body;
    const user = await getRequestUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isOrganizationAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const logoResult = invoiceLogoDataUrl !== undefined
      ? validateInvoiceLogoDataUrl(invoiceLogoDataUrl)
      : null;
    if (logoResult?.error) {
      return NextResponse.json({ error: logoResult.error }, { status: 400 });
    }
    if (
      invoiceBrandColor !== undefined
      && !/^#[0-9A-Fa-f]{6}$/.test(String(invoiceBrandColor).trim())
    ) {
      return NextResponse.json({ error: 'Invoice brand colour must be a six-digit hex colour.' }, { status: 400 });
    }

    let org: any = user.organization;
    {
      // Currency restriction check
      if (currency !== undefined && currency !== org.currency) {
        const txCount = await prisma.transaction.count({ where: { orgId: org.id } });
        const invCount = await prisma.invoice.count({ where: { orgId: org.id } });
        const expCount = await prisma.expense.count({ where: { orgId: org.id } });
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
          legalEntityName: typeof legalEntityName === 'string' ? legalEntityName.trim() || null : undefined,
          billingAddressLine1: typeof billingAddressLine1 === 'string' ? billingAddressLine1.trim() || null : undefined,
          billingAddressLine2: typeof billingAddressLine2 === 'string' ? billingAddressLine2.trim() || null : undefined,
          billingCity: typeof billingCity === 'string' ? billingCity.trim() || null : undefined,
          billingState: typeof billingState === 'string' ? billingState.trim() || null : undefined,
          billingPostalCode: typeof billingPostalCode === 'string' ? billingPostalCode.trim() || null : undefined,
          billingCountry: typeof billingCountry === 'string' ? billingCountry.trim() || null : undefined,
          gstNumber: typeof gstNumber === 'string' ? gstNumber.trim().toUpperCase() || null : undefined,
          invoiceLogoDataUrl: logoResult ? logoResult.value : undefined,
          invoiceBrandColor: invoiceBrandColor !== undefined
            ? normalizeInvoiceBrandColor(invoiceBrandColor)
            : undefined,
          plan: plan !== undefined ? plan : org.plan,
          hasAddon: hasAddon !== undefined ? hasAddon : org.hasAddon,
          agencyTypes: agencyTypes !== undefined ? agencyTypes : org.agencyTypes,
          bankNames: bankNames !== undefined ? bankNames : org.bankNames,
          currency: currency !== undefined ? currency : org.currency,
          aiSharingConsent: aiSharingConsent !== undefined ? aiSharingConsent : org.aiSharingConsent,
          billingEmail: billingEmail !== undefined ? billingEmail : org.billingEmail,
          preferences: preferences !== undefined ? preferences : org.preferences,
        },
      });
      if (username !== undefined) {
        await prisma.user.update({ where: { id: user.id }, data: { username } });
      }
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
    const user = await getRequestUser();
    if (!user || !isOrganizationAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
      prisma.report.deleteMany({ where: { orgId } }),
      prisma.askPrismMessage.deleteMany({ where: { orgId } }),
      prisma.prismChatSession.deleteMany({ where: { orgId } }),
      prisma.prismInsight.deleteMany({ where: { orgId } }),
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
      prisma.googleCalendarConnection.deleteMany({ where: { orgId } }),
      prisma.memberInvite.deleteMany({ where: { orgId } }),

      // 7. Delete financial forecasts (simulated global forecast data)
      prisma.financialForecast.deleteMany({ where: { orgId } }),

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
