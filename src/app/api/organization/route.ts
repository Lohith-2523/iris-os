import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getOrganization, getRequestUser, isOrganizationAdmin } from '@/lib/org';
import {
  normalizeInvoiceBrandColor,
  validateInvoiceLogoDataUrl,
} from '@/lib/invoices/branding';
import { normalizePlan } from '@/lib/plan-entitlements';
import { purgeOrganizationData } from '@/server/domains/account-deletion-service';

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
      metaAccessConsent,
      atlasMetaAnalyticsConsent,
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

      const requestedPlan = plan !== undefined ? String(plan).toUpperCase() : org.plan;
      if (!['BASIC', 'PRO', 'ADVANCED'].includes(requestedPlan)) {
        return NextResponse.json({ error: 'Invalid plan specified' }, { status: 400 });
      }
      if (plan !== undefined && requestedPlan !== 'BASIC' && requestedPlan !== org.plan) {
        return NextResponse.json({ error: 'Complete Razorpay checkout to activate a paid plan.' }, { status: 402 });
      }
      const planToCheck = normalizePlan(requestedPlan);
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
          plan: plan !== undefined ? planToCheck : org.plan,
          hasAddon: hasAddon !== undefined ? hasAddon : org.hasAddon,
          agencyTypes: agencyTypes !== undefined ? agencyTypes : org.agencyTypes,
          bankNames: bankNames !== undefined ? bankNames : org.bankNames,
          currency: currency !== undefined ? currency : org.currency,
          aiSharingConsent: planToCheck === 'BASIC'
            ? false
            : aiSharingConsent !== undefined ? aiSharingConsent : org.aiSharingConsent,
          metaAccessConsent: typeof metaAccessConsent === 'boolean' ? metaAccessConsent : org.metaAccessConsent,
          metaAccessConsentAt: typeof metaAccessConsent === 'boolean'
            ? (metaAccessConsent ? new Date() : null)
            : org.metaAccessConsentAt,
          atlasMetaAnalyticsConsent: typeof atlasMetaAnalyticsConsent === 'boolean'
            ? atlasMetaAnalyticsConsent
            : org.atlasMetaAnalyticsConsent,
          atlasMetaAnalyticsConsentAt: typeof atlasMetaAnalyticsConsent === 'boolean'
            ? (atlasMetaAnalyticsConsent ? new Date() : null)
            : org.atlasMetaAnalyticsConsentAt,
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
  let wipeStage = 'authorizing the request';

  try {
    const user = await getRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isOrganizationAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const orgId = user.orgId;

    // Keep the organization, its users, user preferences, and completed
    // onboarding state. Everything else owned by the organization is purged
    // atomically so a failed request never leaves a partially wiped workspace.
    await prisma.$transaction(async (tx) => {
      await purgeOrganizationData(tx, orgId, (stage) => { wipeStage = stage; });

      wipeStage = 'resetting workspace selections';
      await tx.organization.update({
        where: { id: orgId },
        data: { agencyTypes: [], bankNames: [] },
      });
    }, {
      maxWait: 10_000,
      timeout: 60_000,
    });

    console.log(`Successfully wiped all agency data for organization ID: ${orgId}`);

    return NextResponse.json({
      success: true,
      message: 'All agency data wiped successfully. Active admin account and organization container preserved.'
    });
  } catch (error: unknown) {
    console.error(`Error wiping agency data while ${wipeStage}:`, error);
    return NextResponse.json({
      error: `Unable to wipe agency data while ${wipeStage}. No data was deleted.`,
    }, { status: 500 });
  }
}
