import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getOrganization, getRequestUser, isOrganizationAdmin } from '@/lib/org';

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
      where: { orgId: user.orgId },
      include: { ads: true },
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
      where: { orgId: user.orgId, campaignId: null },
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

    // Campaigns and ads must originate from Meta. Generating local identifiers makes
    // fictional provider records appear as live advertising data.
    if (action === 'create_campaign') {
      return NextResponse.json({ error: 'Create campaigns in Meta Ads Manager, then synchronize the connected account.' }, { status: 409 });
    }

    if (action === 'create_ad') {
      return NextResponse.json({ error: 'Create ads in Meta Ads Manager, then synchronize the connected account.' }, { status: 409 });
    }

    // 7. Edit Campaign
    if (action === 'edit_campaign') {
      const { id, name, status, dailyBudget } = body;
      if (!id || !name || !status) {
        return NextResponse.json({ error: 'Missing id, name, or status' }, { status: 400 });
      }

      const updatedCampaign = await prisma.metaCampaign.update({
        where: { id, orgId: org.id },
        data: {
          name,
          status,
          dailyBudget: dailyBudget ? parseFloat(dailyBudget) : null
        }
      });

      return NextResponse.json({ success: true, campaign: updatedCampaign });
    }

    // 8. Edit Ad
    if (action === 'edit_ad') {
      const { id, name, status, platform, spend, reach, clicks, impressions, leadsCount, imageUrl } = body;
      if (!id || !name || !status || !platform) {
        return NextResponse.json({ error: 'Missing id, name, status, or platform' }, { status: 400 });
      }

      const updatedAd = await prisma.metaAd.update({
        where: { id, orgId: org.id },
        data: {
          name,
          status,
          platform,
          spend: spend !== undefined ? parseFloat(spend) : undefined,
          reach: reach !== undefined ? parseInt(reach) : undefined,
          clicks: clicks !== undefined ? parseInt(clicks) : undefined,
          impressions: impressions !== undefined ? parseInt(impressions) : undefined,
          leadsCount: leadsCount !== undefined ? parseInt(leadsCount) : undefined,
          imageUrl: imageUrl !== undefined ? imageUrl : undefined
        }
      });

      return NextResponse.json({ success: true, ad: updatedAd });
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
