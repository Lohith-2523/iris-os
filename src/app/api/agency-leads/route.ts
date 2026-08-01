import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getRequestUser, isOrganizationAdmin } from '@/lib/org';
import { calculateLeadEconomics } from '@/lib/lead-economics';
import { calculateAgencyMetaMetrics } from '@/lib/agency-meta-metrics';
import { assignAgencyMetaAdAccount, syncAgencyMetaAdAccount } from '@/lib/agency-meta-sync';
import { MetaIntegrationError } from '@/lib/meta-business';

function parseEstimatedClientValue(value: unknown) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(String(value).replace(/[,\s]/g, ''));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const canManageAgencyMeta = isOrganizationAdmin(user);
    const [leads, expenseTransactions, closedLeadCount, sourcedProjectPayments, agencyMetaAccounts] = await Promise.all([
      prisma.agencyLead.findMany({
        where: { orgId: user.orgId },
        orderBy: { createdTime: 'desc' },
        include: {
          convertedClient: {
            select: { id: true, name: true },
          },
        },
      }),
      prisma.transaction.findMany({
        where: {
          orgId: user.orgId,
          category: { equals: 'Expense', mode: 'insensitive' },
        },
        select: { details: true, amount: true },
      }),
      prisma.agencyLead.count({
        where: {
          orgId: user.orgId,
          status: { equals: 'closed', mode: 'insensitive' },
        },
      }),
      prisma.project.findMany({
        where: {
          orgId: user.orgId,
          paymentAmount: { gt: 0 },
          client: {
            sourceLead: {
              is: {
                status: { equals: 'closed', mode: 'insensitive' },
              },
            },
          },
        },
        select: { paymentAmount: true },
      }),
      canManageAgencyMeta
        ? prisma.agencyMetaAdAccount.findMany({
            where: { orgId: user.orgId },
            orderBy: { createdAt: 'asc' },
          })
        : Promise.resolve([]),
    ]);

    const agencyMetaAccountIds = agencyMetaAccounts.map((account) => account.adAccountId);
    const [agencyMetaAds, agencyMetaCampaignCount] = agencyMetaAccountIds.length > 0
      ? await Promise.all([
          prisma.metaAd.findMany({
            where: { orgId: user.orgId, adAccountId: { in: agencyMetaAccountIds } },
            orderBy: [{ spend: 'desc' }, { updatedAt: 'desc' }],
            select: {
              id: true,
              adId: true,
              name: true,
              status: true,
              spend: true,
              leadsCount: true,
              reach: true,
              impressions: true,
              clicks: true,
              adAccountId: true,
              providerSyncedAt: true,
              campaign: { select: { campaignId: true, name: true } },
            },
          }),
          prisma.metaCampaign.count({
            where: { orgId: user.orgId, adAccountId: { in: agencyMetaAccountIds } },
          }),
        ])
      : [[], 0] as const;

    const metrics = calculateLeadEconomics({
      expenseTransactions,
      closedLeadCount,
      sourcedRetainerRevenue: sourcedProjectPayments.reduce(
        (total, project) => total + (project.paymentAmount || 0),
        0,
      ),
    });

    return NextResponse.json({
      leads,
      metrics,
      role: user.role || 'admin',
      meta: canManageAgencyMeta ? {
        metaAccessConsent: user.organization.metaAccessConsent,
        metaAccessConsentAt: user.organization.metaAccessConsentAt,
        atlasMetaAnalyticsConsent: user.organization.atlasMetaAnalyticsConsent,
        atlasMetaAnalyticsConsentAt: user.organization.atlasMetaAnalyticsConsentAt,
        accounts: agencyMetaAccounts,
        campaignCount: agencyMetaCampaignCount,
        metrics: calculateAgencyMetaMetrics(agencyMetaAds),
        ads: agencyMetaAds.slice(0, 20),
      } : null,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error fetching Agency Leads:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Agency Leads data', details: errorMessage },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isOrganizationAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const { action } = body;
    const org = user.organization;

    if (action === 'update_atlas_meta_consent') {
      if (typeof body.consent !== 'boolean') {
        return NextResponse.json({ error: 'Consent must be a boolean.' }, { status: 400 });
      }
      const organization = await prisma.organization.update({
        where: { id: org.id },
        data: {
          atlasMetaAnalyticsConsent: body.consent,
          atlasMetaAnalyticsConsentAt: body.consent ? new Date() : null,
        },
        select: { atlasMetaAnalyticsConsent: true, atlasMetaAnalyticsConsentAt: true },
      });
      return NextResponse.json({ success: true, ...organization });
    }

    if (action === 'update_meta_access_consent') {
      if (typeof body.consent !== 'boolean') {
        return NextResponse.json({ error: 'Consent must be a boolean.' }, { status: 400 });
      }
      const organization = await prisma.organization.update({
        where: { id: org.id },
        data: {
          metaAccessConsent: body.consent,
          metaAccessConsentAt: body.consent ? new Date() : null,
        },
        select: { metaAccessConsent: true, metaAccessConsentAt: true },
      });
      return NextResponse.json({ success: true, ...organization });
    }

    if (action === 'assign_meta_account') {
      if (typeof body.adAccountId !== 'string' || !body.adAccountId.trim()) {
        return NextResponse.json({ error: 'Select a Meta ad account.' }, { status: 400 });
      }
      const account = await assignAgencyMetaAdAccount(org.id, body.adAccountId.trim());
      return NextResponse.json({ success: true, account });
    }

    if (action === 'remove_meta_account') {
      if (typeof body.adAccountId !== 'string' || !body.adAccountId.trim()) {
        return NextResponse.json({ error: 'Select a Meta ad account.' }, { status: 400 });
      }
      await prisma.agencyMetaAdAccount.deleteMany({
        where: { orgId: org.id, adAccountId: body.adAccountId.trim() },
      });
      return NextResponse.json({ success: true });
    }

    if (action === 'sync_meta_account') {
      if (typeof body.adAccountId !== 'string' || !body.adAccountId.trim()) {
        return NextResponse.json({ error: 'Select a Meta ad account.' }, { status: 400 });
      }
      const result = await syncAgencyMetaAdAccount(org.id, body.adAccountId.trim());
      return NextResponse.json({ success: true, ...result });
    }

    // 1. Drag and drop stage status update or inline state update
    if (action === 'update_status') {
      const { leadId, status } = body;
      if (!leadId || !status) {
        return NextResponse.json({ error: 'Missing leadId or status' }, { status: 400 });
      }

      const updatedLead = await prisma.agencyLead.update({
        where: { orgId_leadId: { orgId: org.id, leadId } },
        data: { status }
      });

      return NextResponse.json({ success: true, lead: updatedLead });
    }

    // 2. Single Manual Entry Creation
    if (action === 'create') {
      const { fullName, email, phone, funnelName, status, approachMethod } = body;
      if (!fullName || !email || !status) {
        return NextResponse.json({ error: 'Missing required parameters: fullName, email, status' }, { status: 400 });
      }

      const estimatedClientValue = parseEstimatedClientValue(body.estimatedClientValue);
      if (body.estimatedClientValue !== undefined && body.estimatedClientValue !== '' && estimatedClientValue === null) {
        return NextResponse.json({ error: 'Estimated client value must be a non-negative number' }, { status: 400 });
      }

      const cleanStatus = status.toLowerCase();
      const newLead = await prisma.agencyLead.create({
        data: {
          fullName,
          email,
          phone: phone || null,
          status: cleanStatus,
          funnelName: funnelName || 'Manual Entry',
          estimatedClientValue,
          approachMethod: approachMethod || 'Email',
          collectionMethod: 'Manual Entry',
          sourceProvider: 'MANUAL',
          orgId: org.id
        }
      });

      return NextResponse.json({ success: true, lead: newLead });
    }

    // 3. Bulk Template Imports
    if (action === 'import') {
      const { leads } = body;
      if (!leads || !Array.isArray(leads)) {
        return NextResponse.json({ error: 'Missing array of leads to import' }, { status: 400 });
      }

      const importedLeads = [];
      for (const lead of leads) {
        const { fullName, email, phone, funnelName, status, approachMethod } = lead;
        if (!fullName || !email) continue; // Skip incomplete items

        const cleanStatus = (status || 'procured').toLowerCase();
        const estimatedClientValue = parseEstimatedClientValue(lead.estimatedClientValue);
        if (lead.estimatedClientValue !== undefined && lead.estimatedClientValue !== '' && estimatedClientValue === null) continue;

        const existing = await prisma.agencyLead.findFirst({ where: { orgId: org.id, email } });
        const created = existing ? await prisma.agencyLead.update({
          where: { id: existing.id },
          data: {
            fullName,
            email,
            phone: phone || null,
            status: cleanStatus,
            funnelName: funnelName || 'Bulk Import',
            estimatedClientValue,
            approachMethod: approachMethod || 'Email',
          }
        }) : await prisma.agencyLead.create({
          data: {
            fullName,
            email,
            phone: phone || null,
            status: cleanStatus,
            funnelName: funnelName || 'Bulk Import',
            estimatedClientValue,
            approachMethod: approachMethod || 'Email',
            collectionMethod: 'Bulk Import',
            sourceProvider: 'IMPORT',
            orgId: org.id
          }
        });
        importedLeads.push(created);
      }

      return NextResponse.json({ success: true, count: importedLeads.length, leads: importedLeads });
    }

    // 4. Delete Lead
    if (action === 'delete') {
      const { id } = body;
      if (!id) {
        return NextResponse.json({ error: 'Missing id parameter to delete' }, { status: 400 });
      }

      await prisma.agencyLead.delete({
        where: { id, orgId: org.id }
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error in Agency Leads API:', error);
    if (error instanceof MetaIntegrationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: 'Failed to process request', details: errorMessage },
      { status: 500 }
    );
  }
}
