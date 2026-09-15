import 'server-only';

import { prisma } from '@/lib/db';
import { calculateAgencyMetaMetrics } from '@/lib/agency-meta-metrics';
import { decryptIntegrationCredentials } from '@/lib/integration-secrets';
import {
  type MetaAdAccount,
  type MetaCredentialPayload,
  MetaIntegrationError,
  retrieveMetaAdAccountPerformance,
  retrieveMetaAdAttribution,
  retrieveMetaPageLeads,
} from '@/lib/meta-business';
import { normalizeMetaAdAccountId, normalizeMetaLeadFields } from '@/lib/meta-leads-shared';

function parseMetaDate(value: string | null) {
  if (!value) return new Date();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

async function readAgencyMetaCredentials(orgId: string) {
  const connection = await prisma.integrationConnection.findUnique({
    where: { orgId_provider: { orgId, provider: 'META' } },
    select: { credentialCiphertext: true },
  });
  if (!connection?.credentialCiphertext) {
    throw new MetaIntegrationError('Connect Meta before selecting an agency-owned ad account.', 409);
  }
  return decryptIntegrationCredentials<MetaCredentialPayload & Record<string, unknown>>(
    connection.credentialCiphertext,
  );
}

function selectedAccount(credentials: MetaCredentialPayload, adAccountId: string): MetaAdAccount {
  const account = credentials.selectedAdAccounts.find((candidate) => candidate.id === adAccountId);
  if (!account || !credentials.selectedAdAccountIds.includes(adAccountId)) {
    throw new MetaIntegrationError('Select this Meta ad account in the workspace connection first.', 409);
  }
  return account;
}

export async function assignAgencyMetaAdAccount(orgId: string, adAccountId: string) {
  const [organization, credentials, assignedClient] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: orgId },
      select: { metaAccessConsent: true },
    }),
    readAgencyMetaCredentials(orgId),
    prisma.client.findFirst({
      where: { orgId, adAccountId },
      select: { name: true },
    }),
  ]);

  if (!organization?.metaAccessConsent) {
    throw new MetaIntegrationError('Consent to Meta access before assigning the agency ad account.', 403);
  }
  if (assignedClient) {
    throw new MetaIntegrationError(
      `This Meta ad account is already assigned to ${assignedClient.name}. Remove that client assignment first.`,
      409,
    );
  }

  const account = selectedAccount(credentials, adAccountId);
  return prisma.agencyMetaAdAccount.upsert({
    where: { orgId_adAccountId: { orgId, adAccountId } },
    create: {
      orgId,
      adAccountId,
      accountName: account.name,
      businessName: account.businessName,
      currency: account.currency,
      timezoneName: account.timezoneName,
      accountStatus: account.accountStatus,
    },
    update: {
      accountName: account.name,
      businessName: account.businessName,
      currency: account.currency,
      timezoneName: account.timezoneName,
      accountStatus: account.accountStatus,
    },
  });
}

export async function syncAgencyMetaAdAccount(orgId: string, adAccountId: string) {
  const [organization, account, credentials] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: orgId },
      select: { metaAccessConsent: true },
    }),
    prisma.agencyMetaAdAccount.findUnique({
      where: { orgId_adAccountId: { orgId, adAccountId } },
      select: { id: true },
    }),
    readAgencyMetaCredentials(orgId),
  ]);

  if (!organization?.metaAccessConsent) {
    throw new MetaIntegrationError('Meta access consent is required before synchronizing this account.', 403);
  }
  if (!account) {
    throw new MetaIntegrationError('Assign this ad account to the agency before synchronizing it.', 409);
  }
  selectedAccount(credentials, adAccountId);

  const [performance, pageLeads] = await Promise.all([
    retrieveMetaAdAccountPerformance(adAccountId, credentials.accessToken),
    retrieveMetaPageLeads(credentials.pages || []),
  ]);
  const syncedAt = new Date();
  const uniqueAdIds = Array.from(new Set(pageLeads.flatMap((lead) => lead.adId ? [lead.adId] : [])));
  const attributions = await Promise.all(uniqueAdIds.map(async (adId) => {
    try {
      return [adId, await retrieveMetaAdAttribution(adId, credentials.accessToken)] as const;
    } catch (error) {
      console.error(`Unable to attribute Meta lead ad ${adId}:`, error);
      return [adId, null] as const;
    }
  }));
  const attributionByAdId = new Map(attributions);
  const agencyLeads = pageLeads.filter((lead) => {
    if (!lead.adId) return false;
    const attribution = attributionByAdId.get(lead.adId);
    return normalizeMetaAdAccountId(attribution?.accountId) === adAccountId;
  });

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

    for (const lead of agencyLeads) {
      const attribution = lead.adId ? attributionByAdId.get(lead.adId) : null;
      const contact = normalizeMetaLeadFields(lead.fieldData);
      await tx.agencyLead.upsert({
        where: { orgId_leadId: { orgId, leadId: lead.id } },
        create: {
          orgId,
          leadId: lead.id,
          fullName: contact.fullName || contact.email || 'Meta lead',
          email: contact.email || '',
          phone: contact.phone,
          status: 'procured',
          collectionMethod: 'Meta Instant Form',
          approachMethod: 'Meta Lead Ad',
          funnelName: attribution?.name || lead.formName || 'Meta lead form',
          sourceProvider: 'META',
          adId: lead.adId,
          adName: attribution?.name || null,
          campaignId: lead.campaignId || attribution?.campaignId || null,
          adAccountId,
          pageId: lead.pageId,
          formId: lead.formId,
          fieldData: contact.values,
          createdTime: parseMetaDate(lead.createdTime),
        },
        update: {
          fullName: contact.fullName || contact.email || 'Meta lead',
          email: contact.email || '',
          phone: contact.phone,
          collectionMethod: 'Meta Instant Form',
          approachMethod: 'Meta Lead Ad',
          funnelName: attribution?.name || lead.formName || 'Meta lead form',
          sourceProvider: 'META',
          adId: lead.adId,
          adName: attribution?.name || null,
          campaignId: lead.campaignId || attribution?.campaignId || null,
          adAccountId,
          pageId: lead.pageId,
          formId: lead.formId,
          fieldData: contact.values,
          createdTime: parseMetaDate(lead.createdTime),
        },
      });
    }

    const leadCounts = await tx.agencyLead.groupBy({
      by: ['adId'],
      where: { orgId, adAccountId, sourceProvider: 'META', adId: { not: null } },
      _count: { _all: true },
    });
    const leadsByAdId = new Map(
      leadCounts.flatMap((entry) => entry.adId ? [[entry.adId, entry._count._all] as const] : []),
    );

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

    await tx.agencyMetaAdAccount.update({
      where: { orgId_adAccountId: { orgId, adAccountId } },
      data: { lastSync: syncedAt, providerSyncedAt: syncedAt },
    });
  });

  const savedAds = await prisma.metaAd.findMany({
    where: { orgId, adAccountId },
    select: { spend: true, reach: true, impressions: true, clicks: true, leadsCount: true },
  });

  return {
    campaigns: performance.campaigns.length,
    ads: performance.ads.length,
    leads: agencyLeads.length,
    syncedAt,
    metrics: calculateAgencyMetaMetrics(savedAds),
  };
}
