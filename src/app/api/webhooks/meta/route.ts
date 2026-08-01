import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { decryptIntegrationCredentials } from '@/lib/integration-secrets';
import {
  type MetaCredentialPayload,
  retrieveMetaAdAttribution,
  retrieveMetaLead,
} from '@/lib/meta-business';
import {
  normalizeMetaAdAccountId,
  normalizeMetaLeadFields,
} from '@/lib/meta-leads-shared';

const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || process.env.META_WEBHOOK_VERIFY_TOKEN;

function verifySignature(rawBody: string, signatureHeader: string | null) {
  const appSecret = process.env.META_APP_SECRET;
  if (!appSecret || !signatureHeader?.startsWith('sha256=')) return false;

  const supplied = Buffer.from(signatureHeader.slice('sha256='.length), 'hex');
  const expected = Buffer.from(
    crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex'),
    'hex',
  );
  return supplied.length === expected.length && crypto.timingSafeEqual(supplied, expected);
}

function parseMetaDate(value: string | null) {
  if (!value) return new Date();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

async function appendConnectionLog(connectionId: string, message: string) {
  const connection = await prisma.integrationConnection.findUnique({
    where: { id: connectionId },
    select: { syncLogs: true },
  });
  const currentLogs: Array<{ timestamp: string; message: string }> = [];
  if (connection?.syncLogs) {
    try {
      const parsed = JSON.parse(connection.syncLogs);
      if (Array.isArray(parsed)) currentLogs.push(...parsed);
    } catch {
      currentLogs.push({
        timestamp: new Date().toISOString(),
        message: connection.syncLogs,
      });
    }
  }

  await prisma.integrationConnection.update({
    where: { id: connectionId },
    data: {
      status: 'CONNECTED',
      lastSync: new Date(),
      syncLogs: JSON.stringify([
        { timestamp: new Date().toISOString(), message },
        ...currentLogs,
      ].slice(0, 50)),
    },
  });
}

async function processLeadNotification(
  pageId: string,
  value: Record<string, unknown>,
) {
  const leadgenId =
    typeof value.leadgen_id === 'string' || typeof value.leadgen_id === 'number'
      ? String(value.leadgen_id)
      : '';
  if (!leadgenId) {
    return { type: 'leadgen_ignored', reason: 'missing_leadgen_id' };
  }

  const pageMapping = await prisma.metaPageConnection.findUnique({
    where: { pageId },
    include: { connection: true },
  });
  if (
    !pageMapping?.connection.credentialCiphertext ||
    pageMapping.connection.status !== 'CONNECTED'
  ) {
    return { type: 'leadgen_ignored', leadId: leadgenId, reason: 'unmapped_page' };
  }

  const credentials = decryptIntegrationCredentials<MetaCredentialPayload & Record<string, unknown>>(
    pageMapping.connection.credentialCiphertext,
  );
  const page = (credentials.pages || []).find((candidate) => candidate.id === pageId);
  if (!page?.accessToken) {
    return { type: 'leadgen_ignored', leadId: leadgenId, reason: 'missing_page_token' };
  }

  const lead = await retrieveMetaLead(leadgenId, page.accessToken);
  if (!lead.adId) {
    return { type: 'leadgen_ignored', leadId: leadgenId, reason: 'missing_ad_id' };
  }

  const ad = await retrieveMetaAdAttribution(lead.adId, credentials.accessToken);
  const adAccountId = normalizeMetaAdAccountId(ad.accountId);
  if (!adAccountId || !credentials.selectedAdAccountIds.includes(adAccountId)) {
    return {
      type: 'leadgen_ignored',
      leadId: leadgenId,
      reason: 'ad_account_not_connected',
    };
  }

  const [organization, agencyAccount] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: pageMapping.orgId },
      select: { metaAccessConsent: true },
    }),
    prisma.agencyMetaAdAccount.findUnique({
      where: { orgId_adAccountId: { orgId: pageMapping.orgId, adAccountId } },
    }),
  ]);
  if (!organization?.metaAccessConsent) {
    return { type: 'leadgen_ignored', leadId: leadgenId, reason: 'meta_access_consent_withdrawn' };
  }

  const contact = normalizeMetaLeadFields(lead.fieldData);
  if (agencyAccount) {
    const storedLead = await prisma.agencyLead.upsert({
      where: { orgId_leadId: { orgId: pageMapping.orgId, leadId: lead.id } },
      create: {
        leadId: lead.id,
        fullName: contact.fullName || 'Meta lead',
        email: contact.email || '',
        phone: contact.phone,
        status: 'procured',
        createdTime: parseMetaDate(lead.createdTime),
        collectionMethod: 'Meta Instant Form',
        approachMethod: 'Meta Lead Ad',
        funnelName: ad.name || agencyAccount.accountName,
        sourceProvider: 'META',
        adId: lead.adId,
        adName: ad.name,
        campaignId: lead.campaignId || ad.campaignId,
        adAccountId,
        pageId,
        formId: lead.formId,
        fieldData: contact.values,
        orgId: pageMapping.orgId,
      },
      update: {
        fullName: contact.fullName || 'Meta lead',
        email: contact.email || '',
        phone: contact.phone,
        createdTime: parseMetaDate(lead.createdTime),
        adId: lead.adId,
        adName: ad.name,
        campaignId: lead.campaignId || ad.campaignId,
        adAccountId,
        pageId,
        formId: lead.formId,
        fieldData: contact.values,
      },
    });
    const leadsCount = await prisma.agencyLead.count({
      where: { orgId: pageMapping.orgId, sourceProvider: 'META', adId: lead.adId },
    });
    await prisma.metaAd.updateMany({
      where: { orgId: pageMapping.orgId, adId: lead.adId },
      data: { leadsCount },
    });
    await appendConnectionLog(
      pageMapping.connectionId,
      `Retrieved agency Meta lead ${lead.id} from ${ad.name || lead.adId}.`,
    );
    return { type: 'agency_leadgen_captured', leadId: storedLead.leadId, adAccountId };
  }

  const client = await prisma.client.findFirst({
    where: {
      orgId: pageMapping.orgId,
      adAccountId,
    },
    select: { id: true, name: true },
  });
  if (!client) {
    return {
      type: 'leadgen_ignored',
      leadId: leadgenId,
      adAccountId,
      reason: 'ad_account_not_assigned_to_client',
    };
  }

  const storedLead = await prisma.metaLead.upsert({
    where: {
      orgId_leadId: {
        orgId: pageMapping.orgId,
        leadId: lead.id,
      },
    },
    create: {
      leadId: lead.id,
      adId: lead.adId,
      adName: ad.name,
      fullName: contact.fullName,
      email: contact.email,
      phone: contact.phone,
      status: 'new',
      createdTime: parseMetaDate(lead.createdTime),
      collectionMethod: 'Meta Instant Form',
      approachMethod: 'Meta Lead Ad',
      funnelName: ad.name,
      adAccountId,
      pageId,
      formId: lead.formId,
      campaignId: lead.campaignId || ad.campaignId,
      fieldData: contact.values,
      clientId: client.id,
      orgId: pageMapping.orgId,
    },
    update: {
      adId: lead.adId,
      adName: ad.name,
      fullName: contact.fullName,
      email: contact.email,
      phone: contact.phone,
      createdTime: parseMetaDate(lead.createdTime),
      adAccountId,
      pageId,
      formId: lead.formId,
      campaignId: lead.campaignId || ad.campaignId,
      fieldData: contact.values,
      clientId: client.id,
    },
  });

  const leadsCount = await prisma.metaLead.count({
    where: { orgId: pageMapping.orgId, adId: lead.adId },
  });
  await prisma.metaAd.updateMany({
    where: { orgId: pageMapping.orgId, adId: lead.adId },
    data: { leadsCount },
  });
  await appendConnectionLog(
    pageMapping.connectionId,
    `Retrieved Meta lead ${lead.id} for ${client.name} from ${ad.name || lead.adId}.`,
  );

  return {
    type: 'leadgen_captured',
    leadId: storedLead.leadId,
    clientId: client.id,
    adAccountId,
  };
}

export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get('hub.mode');
  const token = request.nextUrl.searchParams.get('hub.verify_token');
  const challenge = request.nextUrl.searchParams.get('hub.challenge');

  if (VERIFY_TOKEN && mode === 'subscribe' && token === VERIFY_TOKEN && challenge) {
    return new Response(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
  return new Response('Verification failed', { status: 403 });
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    if (!verifySignature(rawBody, request.headers.get('X-Hub-Signature-256'))) {
      return NextResponse.json({ error: 'Signature verification failed' }, { status: 401 });
    }

    const body = JSON.parse(rawBody) as {
      object?: string;
      entry?: Array<{
        id?: string;
        changes?: Array<{ field?: string; value?: Record<string, unknown> }>;
      }>;
    };
    if (body.object !== 'page') {
      return NextResponse.json({ success: true, processedCount: 0, events: [] });
    }

    const events: Record<string, unknown>[] = [];
    for (const entry of body.entry || []) {
      const pageId = String(entry.id || '');
      for (const change of entry.changes || []) {
        if (change.field !== 'leadgen' || !change.value) continue;
        try {
          events.push(await processLeadNotification(pageId, change.value));
        } catch (error) {
          console.error('Unable to retrieve Meta lead:', error);
          events.push({
            type: 'leadgen_failed',
            leadId: change.value.leadgen_id || null,
            reason: error instanceof Error ? error.message : 'Unknown lead retrieval error',
          });
        }
      }
    }

    const failed = events.some((event) => event.type === 'leadgen_failed');
    return NextResponse.json({
      success: !failed,
      processedCount: events.length,
      events,
    }, { status: failed ? 500 : 200 });
  } catch (error) {
    console.error('Error handling Meta webhook:', error);
    return NextResponse.json({ error: 'Unable to process Meta webhook' }, { status: 500 });
  }
}
