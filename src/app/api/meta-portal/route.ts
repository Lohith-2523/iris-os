import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getOrganization, getRequestUser, isOrganizationAdmin } from '@/lib/org';

export async function GET(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const isClient = user.role === 'client';
    const clientAdAccountId = user?.client?.adAccountId || '';

    let campaigns;
    let leads;

    if (isClient) {
      // Client view: filter campaigns and ads by the client's adAccountId
      campaigns = await prisma.metaCampaign.findMany({
        where: clientAdAccountId ? {
          orgId: user.orgId,
          campaignId: {
            startsWith: clientAdAccountId
          }
        } : { id: 'none' },
        include: { ads: true },
        orderBy: { createdAt: 'desc' },
      });

      leads = await prisma.metaLead.findMany({
        where: clientAdAccountId ? {
          orgId: user.orgId,
          adId: {
            startsWith: clientAdAccountId
          }
        } : { id: 'none' },
        orderBy: { createdTime: 'desc' },
      });
    } else {
      // Admin view: see everything
      campaigns = await prisma.metaCampaign.findMany({
        where: { orgId: user.orgId },
        include: { ads: true },
        orderBy: { createdAt: 'desc' },
      });

      leads = await prisma.metaLead.findMany({
        where: { orgId: user.orgId },
        orderBy: { createdTime: 'desc' },
      });
    }

    // Fetch any ads that don't have campaigns
    const orphanedAds = await prisma.metaAd.findMany({
      where: isClient && clientAdAccountId ? {
        orgId: user.orgId,
        campaignId: null,
        adId: { startsWith: clientAdAccountId }
      } : { orgId: user.orgId, campaignId: null },
      orderBy: { spend: 'desc' },
    });

    return NextResponse.json({
      campaigns,
      leads,
      orphanedAds,
      role: user.role,
      clientName: user?.client?.name || null
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
    if (!isOrganizationAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const org = await getOrganization(request);
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // 1. Check if this is the legacy update lead status action
    if (!action && body.leadId && body.status) {
      const updatedLead = await prisma.metaLead.update({
        where: { orgId_leadId: { orgId: org.id, leadId: body.leadId } },
        data: { status: body.status },
      });
      return NextResponse.json({ success: true, lead: updatedLead });
    }


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
