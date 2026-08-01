import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { decryptIntegrationCredentials } from '@/lib/integration-secrets';
import {
  type MetaCredentialPayload,
  MetaIntegrationError,
  retrieveMetaAdAccountPerformance,
} from '@/lib/meta-business';
import { getOrganization, getRequestUser, isOrganizationAdmin } from '@/lib/org';

async function syncMetaPerformanceForClient(orgId: string, clientId: string, adAccountId: string) {
  const [client, connection, organization] = await Promise.all([
    prisma.client.findFirst({
      where: { id: clientId, orgId, adAccountId },
      select: { id: true },
    }),
    prisma.integrationConnection.findUnique({
      where: { orgId_provider: { orgId, provider: 'META' } },
      select: { credentialCiphertext: true },
    }),
    prisma.organization.findUnique({ where: { id: orgId }, select: { metaAccessConsent: true } }),
  ]);
  if (!organization?.metaAccessConsent) {
    throw new MetaIntegrationError('Consent to access Meta data is required before synchronizing.', 403);
  }
  if (!client) throw new MetaIntegrationError('Assign this Meta ad account to the client before syncing.', 409);
  if (!connection?.credentialCiphertext) throw new MetaIntegrationError('Connect Meta before syncing performance.', 409);

  const credentials = decryptIntegrationCredentials<MetaCredentialPayload & Record<string, unknown>>(
    connection.credentialCiphertext,
  );
  if (!credentials.selectedAdAccountIds.includes(adAccountId)) {
    throw new MetaIntegrationError('This ad account is not connected to the workspace.', 403);
  }

  const performance = await retrieveMetaAdAccountPerformance(adAccountId, credentials.accessToken);
  const syncedAt = new Date();
  const leadCounts = await prisma.metaLead.groupBy({
    by: ['adId'],
    where: { orgId, adAccountId, adId: { not: null } },
    _count: { _all: true },
  });
  const leadsByAdId = new Map(
    leadCounts.flatMap((entry) => entry.adId ? [[entry.adId, entry._count._all] as const] : []),
  );

  await prisma.$transaction(async (tx) => {
    const campaignRecords = new Map<string, { id: string }>();
    for (const campaign of performance.campaigns) {
      const saved = await tx.metaCampaign.upsert({
        where: { orgId_campaignId: { orgId, campaignId: campaign.id } },
        create: {
          campaignId: campaign.id,
          name: campaign.name,
          status: campaign.status,
          objective: campaign.objective,
          dailyBudget: campaign.dailyBudget,
          adAccountId,
          providerSyncedAt: syncedAt,
          orgId,
        },
        update: {
          name: campaign.name,
          status: campaign.status,
          objective: campaign.objective,
          dailyBudget: campaign.dailyBudget,
          adAccountId,
          providerSyncedAt: syncedAt,
        },
        select: { id: true },
      });
      campaignRecords.set(campaign.id, saved);
    }

    for (const ad of performance.ads) {
      const campaign = ad.campaignId ? campaignRecords.get(ad.campaignId) : null;
      if (!campaign) continue;
      await tx.metaAd.upsert({
        where: { orgId_adId: { orgId, adId: ad.id } },
        create: {
          adId: ad.id,
          name: ad.name,
          status: ad.status,
          spend: ad.spend,
          leadsCount: leadsByAdId.get(ad.id) || 0,
          reach: ad.reach,
          impressions: ad.impressions,
          clicks: ad.clicks,
          platform: 'META',
          campaignId: campaign.id,
          adAccountId,
          providerSyncedAt: syncedAt,
          orgId,
        },
        update: {
          name: ad.name,
          status: ad.status,
          spend: ad.spend,
          leadsCount: leadsByAdId.get(ad.id) || 0,
          reach: ad.reach,
          impressions: ad.impressions,
          clicks: ad.clicks,
          campaignId: campaign.id,
          adAccountId,
          providerSyncedAt: syncedAt,
        },
      });
    }
  });

  return { campaigns: performance.campaigns.length, ads: performance.ads.length, syncedAt };
}

export async function GET(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const isClient = user.role === 'client';
    const clientAdAccountId = user?.client?.adAccountId || '';
    const clientId = user?.client?.id || '';

    // Provider leads are attributed to a client at ingestion time. Never infer
    // tenancy from provider IDs or expose organization-wide Meta records.
    const campaigns = isClient ? [] : await prisma.metaCampaign.findMany({
      where: { orgId: user.orgId, providerSyncedAt: { not: null } },
      include: { ads: { where: { providerSyncedAt: { not: null } } } },
      orderBy: { createdAt: 'desc' },
    });
    const leads = isClient
      ? await prisma.metaLead.findMany({
        where: clientAdAccountId && clientId ? {
          orgId: user.orgId,
          clientId,
          adAccountId: clientAdAccountId,
        } : { id: 'none' },
        orderBy: { createdTime: 'desc' },
      })
      : await prisma.metaLead.findMany({
          where: { orgId: user.orgId },
          orderBy: { createdTime: 'desc' },
        });

    // Fetch any ads that don't have campaigns
    const orphanedAds = isClient ? [] : await prisma.metaAd.findMany({
      where: { orgId: user.orgId, campaignId: null, providerSyncedAt: { not: null } },
      orderBy: { spend: 'desc' },
    });

    return NextResponse.json({
      campaigns,
      leads,
      orphanedAds,
      role: user.role,
      clientName: user?.client?.name || null,
      hasMetaAccount: Boolean(clientAdAccountId),
      adAccountId: isClient ? clientAdAccountId || null : null,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error fetching Meta Portal data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Meta Portal data', details: errorMessage },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const org = await getOrganization(request);
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // 1. Check if this is the legacy update lead status action
    if (!action && body.leadId && body.status) {
      const allowedStatuses = new Set([
        'new',
        'cold-call in progress',
        'call back required',
        'closed',
        'unqualified',
      ]);
      if (!allowedStatuses.has(body.status)) {
        return NextResponse.json({ error: 'Invalid lead status' }, { status: 400 });
      }

      const clientScope = user.role === 'client'
        ? {
            clientId: user.client?.id || '__none__',
            adAccountId: user.client?.adAccountId || '__none__',
          }
        : {};
      const result = await prisma.metaLead.updateMany({
        where: {
          orgId: org.id,
          leadId: body.leadId,
          ...clientScope,
        },
        data: { status: body.status },
      });
      if (result.count === 0) {
        return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
      }
      const updatedLead = await prisma.metaLead.findUnique({
        where: { orgId_leadId: { orgId: org.id, leadId: body.leadId } },
      });
      return NextResponse.json({ success: true, lead: updatedLead });
    }

    if (!isOrganizationAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    if (action === 'sync_performance') {
      const clientId = typeof body.clientId === 'string' ? body.clientId : '';
      const adAccountId = typeof body.adAccountId === 'string' ? body.adAccountId : '';
      if (!clientId || !adAccountId) {
        return NextResponse.json({ error: 'A client and Meta ad account are required.' }, { status: 400 });
      }
      const result = await syncMetaPerformanceForClient(org.id, clientId, adAccountId);
      return NextResponse.json({ success: true, ...result });
    }

    // Campaigns and ads must originate from Meta. Generating local identifiers makes
    // fictional provider records appear as live advertising data.
    if (action === 'create_campaign') {
      return NextResponse.json({ error: 'Create campaigns in Meta Ads Manager, then synchronize the connected account.' }, { status: 409 });
    }

    if (action === 'create_ad') {
      return NextResponse.json({ error: 'Create ads in Meta Ads Manager, then synchronize the connected account.' }, { status: 409 });
    }

    // Advertising data is provider-owned. Local edits would make the dashboard
    // differ from Meta, so changes must happen in Meta Ads Manager and be synced.
    if (action === 'edit_campaign') {
      return NextResponse.json({ error: 'Edit campaigns in Meta Ads Manager, then synchronize the connected account.' }, { status: 409 });
    }

    if (action === 'edit_ad') {
      return NextResponse.json({ error: 'Edit ads in Meta Ads Manager, then synchronize the connected account.' }, { status: 409 });
    }


    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error in Meta Portal API:', error);
    return NextResponse.json(
      { error: 'Failed to process request', details: errorMessage },
      { status: 500 }
    );
  }
}
