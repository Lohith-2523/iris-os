import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getRequestUser, isOrganizationAdmin } from '@/lib/org';
import { calculateLeadEconomics } from '@/lib/lead-economics';
import { calculateAgencyMetaMetrics } from '@/lib/agency-meta-metrics';
import { assignAgencyMetaAdAccount, syncAgencyMetaAdAccount } from '@/lib/agency-meta-sync';
import { MetaIntegrationError } from '@/lib/meta-business';
import { normalizeRequiredPhone } from '@/lib/phone';
import { createNotification } from '@/lib/notifications';
import { getKanbanLeadCutoff } from '@/lib/lead-archive';
import { cursorHeaders, descendingCursorWhere, finishCursorPage, readCursorPage } from '@/lib/cursor-pagination';

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
    const kanbanOnly = request.nextUrl.searchParams.get('view') === 'kanban';
    const kanbanCutoff = getKanbanLeadCutoff();
    const pageRequest = readCursorPage(request);
    const [leads, archivedLeadCount, expenseTransactions, closedLeadCount, sourcedProjectPayments, agencyMetaAccounts] = await Promise.all([
      prisma.agencyLead.findMany({
        where: {
          orgId: user.orgId,
          ...descendingCursorWhere(pageRequest.cursor, 'createdTime'),
          ...(kanbanOnly ? { createdTime: { gte: kanbanCutoff } } : {}),
        },
        orderBy: [{ createdTime: 'desc' }, { id: 'desc' }],
        take: pageRequest.take,
        include: {
          convertedClient: {
            select: { id: true, name: true },
          },
        },
      }),
      kanbanOnly
        ? prisma.agencyLead.count({ where: { orgId: user.orgId, createdTime: { lt: kanbanCutoff } } })
        : Promise.resolve(0),
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
            take: 20,
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

    const page = finishCursorPage(leads, pageRequest.limit, (lead) => lead.createdTime);
    return NextResponse.json({
      leads: page.items,
      archive: kanbanOnly ? {
        archivedLeadCount,
        retentionDays: 30,
        cutoff: kanbanCutoff,
      } : null,
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
        ads: agencyMetaAds,
      } : null,
      pagination: { nextCursor: page.nextCursor, hasMore: page.hasMore, limit: pageRequest.limit },
    }, { headers: cursorHeaders(page, pageRequest.limit) });
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

    // Keep leads attached to a visible pipeline stage when a configured stage is removed.
    if (action === 'migrate_stage_leads') {
      const sourceStatuses: string[] = Array.isArray(body.sourceStatuses)
        ? Array.from(new Set((body.sourceStatuses as unknown[]).filter((status): status is string => typeof status === 'string' && status.trim().length > 0).map((status) => status.trim().toLowerCase())))
        : [];
      const destinationStatus = typeof body.destinationStatus === 'string' ? body.destinationStatus.trim().toLowerCase() : '';
      if (!sourceStatuses.length || !destinationStatus) {
        return NextResponse.json({ error: 'Source and destination stages are required.' }, { status: 400 });
      }
      if (sourceStatuses.includes(destinationStatus)) {
        return NextResponse.json({ error: 'Choose a different destination stage.' }, { status: 400 });
      }
      const migrated = await prisma.agencyLead.updateMany({
        where: { orgId: org.id, status: { in: sourceStatuses, mode: 'insensitive' } },
        data: { status: destinationStatus, lostReason: destinationStatus === 'lost' ? 'Pipeline stage update' : null, lostDetails: null },
      });
      return NextResponse.json({ success: true, migratedCount: migrated.count });
    }

    // 1. Drag and drop stage status update or inline state update
    if (action === 'update_status') {
      const { leadId, status, lostReason, lostDetails } = body;
      if (!leadId || !status) {
        return NextResponse.json({ error: 'Missing leadId or status' }, { status: 400 });
      }

      if (String(status).toLowerCase() === 'lost' && !String(lostReason || '').trim()) {
        return NextResponse.json({ error: 'Select why the lead was lost.' }, { status: 400 });
      }
      const existingLead = await prisma.agencyLead.findUnique({ where: { orgId_leadId: { orgId: org.id, leadId } } });
      const activity = Array.isArray(existingLead?.activity) ? existingLead.activity : [];
      const updatedLead = await prisma.agencyLead.update({
        where: { orgId_leadId: { orgId: org.id, leadId } },
        data: { status, lostReason: String(status).toLowerCase() === 'lost' ? String(lostReason).trim() : null, lostDetails: String(status).toLowerCase() === 'lost' ? String(lostDetails || '').trim() || null : null, activity: [...activity, { type: 'STATUS_CHANGED', status, at: new Date().toISOString(), by: user.name }] }
      });

      return NextResponse.json({ success: true, lead: updatedLead });
    }

    if (action === 'update') {
      const existing = await prisma.agencyLead.findFirst({ where: { id: body.id, orgId: org.id } });
      if (!existing) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
      const normalizedPhone = normalizeRequiredPhone(body.phone);
      if (!body.fullName || !body.email || !normalizedPhone) return NextResponse.json({ error: 'Name, email, and phone with country code are required.' }, { status: 400 });
      const followUpAt = body.followUpAt ? new Date(body.followUpAt) : null;
      if (followUpAt && Number.isNaN(followUpAt.getTime())) return NextResponse.json({ error: 'Follow-up date is invalid.' }, { status: 400 });
      const activity = Array.isArray(existing.activity) ? existing.activity : [];
      const lead = await prisma.agencyLead.update({ where: { id: existing.id }, data: { fullName: String(body.fullName).trim(), email: String(body.email).trim().toLowerCase(), phone: normalizedPhone, approachMethod: String(body.approachMethod || '').trim() || null, funnelName: String(body.funnelName || '').trim() || null, estimatedClientValue: parseEstimatedClientValue(body.estimatedClientValue), followUpAt, activity: [...activity, { type: 'DETAILS_UPDATED', at: new Date().toISOString(), by: user.name }] } });
      if (followUpAt) await createNotification({ orgId: org.id, userId: user.id, type: 'REMINDER', title: `Follow up with ${lead.fullName}`, body: `The scheduled lead follow-up is due.`, href: `/agency-leads?lead=${lead.id}`, actionLabel: 'Open lead', scheduledAt: followUpAt });
      return NextResponse.json({ success: true, lead });
    }

    // 2. Single Manual Entry Creation
    if (action === 'create') {
      const { fullName, email, phone, funnelName, status, approachMethod } = body;
      const normalizedPhone = normalizeRequiredPhone(phone);
      if (!fullName || !email || !status || !normalizedPhone) {
        return NextResponse.json({ error: 'Name, email, status, and a phone number with country code are required.' }, { status: 400 });
      }

      const estimatedClientValue = parseEstimatedClientValue(body.estimatedClientValue);
      if (body.estimatedClientValue !== undefined && body.estimatedClientValue !== '' && estimatedClientValue === null) {
        return NextResponse.json({ error: 'Estimated client value must be a non-negative number' }, { status: 400 });
      }

      const cleanStatus = status.toLowerCase();
      if (cleanStatus === 'lost' && !String(body.lostReason || '').trim()) return NextResponse.json({ error: 'Select why the lead was lost.' }, { status: 400 });
      const followUpAt = body.followUpAt ? new Date(body.followUpAt) : null;
      if (followUpAt && Number.isNaN(followUpAt.getTime())) return NextResponse.json({ error: 'Follow-up date is invalid.' }, { status: 400 });
      const newLead = await prisma.agencyLead.create({
        data: {
          fullName,
          email,
          phone: normalizedPhone,
          status: cleanStatus,
          funnelName: funnelName || 'Manual Entry',
          estimatedClientValue,
          approachMethod: approachMethod || 'Email',
          collectionMethod: 'Manual Entry',
          sourceProvider: 'MANUAL',
          followUpAt,
          lostReason: cleanStatus === 'lost' ? String(body.lostReason).trim() : null,
          lostDetails: cleanStatus === 'lost' ? String(body.lostDetails || '').trim() || null : null,
          activity: [{ type: 'CREATED', at: new Date().toISOString(), by: user.name }],
          orgId: org.id
        }
      });

      if (followUpAt) await createNotification({ orgId: org.id, userId: user.id, type: 'REMINDER', title: `Follow up with ${newLead.fullName}`, body: 'The scheduled lead follow-up is due.', href: `/agency-leads?lead=${newLead.id}`, actionLabel: 'Open lead', scheduledAt: followUpAt });

      return NextResponse.json({ success: true, lead: newLead });
    }

    // 3. Bulk Template Imports
    if (action === 'import') {
      const { leads } = body;
      if (!leads || !Array.isArray(leads)) {
        return NextResponse.json({ error: 'Missing array of leads to import' }, { status: 400 });
      }
      if (leads.length > 1_000) {
        return NextResponse.json({ error: 'Import at most 1,000 leads per request.' }, { status: 413 });
      }

      const normalizedByEmail = new Map<string, {
        fullName: string;
        email: string;
        phone: string;
        status: string;
        funnelName: string;
        estimatedClientValue: number | null;
        approachMethod: string;
        followUpAt: Date | null;
      }>();
      for (const lead of leads) {
        const { fullName, email, phone, funnelName, status, approachMethod } = lead;
        const normalizedPhone = normalizeRequiredPhone(phone);
        if (!fullName || !email || !normalizedPhone) continue; // Skip incomplete items

        const cleanStatus = (status || 'procured').toLowerCase();
        const followUpAt = lead.followUpAt ? new Date(lead.followUpAt) : null;
        const estimatedClientValue = parseEstimatedClientValue(lead.estimatedClientValue);
        if (lead.estimatedClientValue !== undefined && lead.estimatedClientValue !== '' && estimatedClientValue === null) continue;
        const normalizedEmail = String(email).trim().toLowerCase();
        normalizedByEmail.set(normalizedEmail, {
          fullName: String(fullName).trim(),
          email: normalizedEmail,
          phone: normalizedPhone,
          status: cleanStatus,
          funnelName: funnelName || 'Bulk Import',
          estimatedClientValue,
          approachMethod: approachMethod || 'Email',
          followUpAt: followUpAt && !Number.isNaN(followUpAt.getTime()) ? followUpAt : null,
        });
      }

      const normalizedLeads = [...normalizedByEmail.values()];
      const existingLeads = await prisma.agencyLead.findMany({
        where: { orgId: org.id, email: { in: normalizedLeads.map((lead) => lead.email), mode: 'insensitive' } },
        select: { id: true, email: true },
      });
      const existingByEmail = new Map(existingLeads.map((lead) => [lead.email.toLowerCase(), lead]));
      const updates = normalizedLeads.flatMap((lead) => {
        const existing = existingByEmail.get(lead.email);
        return existing ? [prisma.agencyLead.update({ where: { id: existing.id }, data: lead })] : [];
      });
      const newLeads = normalizedLeads.filter((lead) => !existingByEmail.has(lead.email));
      await prisma.$transaction([
        ...updates,
        prisma.agencyLead.createMany({
          data: newLeads.map((lead) => ({
            ...lead,
            collectionMethod: 'Bulk Import',
            sourceProvider: 'IMPORT',
            activity: [{ type: 'IMPORTED', at: new Date().toISOString(), by: user.name }],
            orgId: org.id,
          })),
        }),
      ]);
      const importedLeads = await prisma.agencyLead.findMany({
        where: { orgId: org.id, email: { in: normalizedLeads.map((lead) => lead.email), mode: 'insensitive' } },
        orderBy: [{ createdTime: 'desc' }, { id: 'desc' }],
        take: 1_000,
      });

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
