import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { deobfuscateEmail } from '@/lib/utils';
import { getOrganization } from '@/lib/org';

export async function GET(request: NextRequest) {
  try {
    const isSkippedAll = request.cookies.get('skipped_all_steps')?.value === 'true';
    if (isSkippedAll) {
      return NextResponse.json({ campaigns: [], leads: [], orphanedAds: [] });
    }

    const { searchParams } = new URL(request.url);
    const rawEmail = searchParams.get('email') || request.cookies.get('currentUserEmail')?.value;
    if (!rawEmail) {
      return NextResponse.json({ campaigns: [], leads: [], orphanedAds: [] });
    }
    const email = deobfuscateEmail(rawEmail);

    // 1. Fetch user to check role and ad account authorization
    const user = await prisma.user.findUnique({
      where: { email },
      include: { client: true }
    });

    if (!user) {
      return NextResponse.json({ campaigns: [], leads: [], orphanedAds: [] });
    }

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

    const org = await getOrganization(request);
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // 1. Check if this is the legacy update lead status action
    if (!action && body.leadId && body.status) {
      const updatedLead = await prisma.metaLead.update({
        where: { leadId: body.leadId, orgId: org.id },
        data: { status: body.status },
      });
      return NextResponse.json({ success: true, lead: updatedLead });
    }


    // 5. Create New Campaign
    if (action === 'create_campaign') {
      const { name, status, objective, dailyBudget } = body;
      if (!name || !status) {
        return NextResponse.json({ error: 'Missing name or status' }, { status: 400 });
      }

      const campaign = await prisma.metaCampaign.create({
        data: {
          campaignId: `act_109283741_camp_${Date.now().toString().slice(-6)}`,
          name,
          status,
          objective: objective || 'OUTCOME_LEADS',
          dailyBudget: dailyBudget ? parseFloat(dailyBudget) : null,
          orgId: org.id
        }
      });

      return NextResponse.json({ success: true, campaign });
    }

    // 6. Create New Ad
    if (action === 'create_ad') {
      const { name, status, platform, campaignId, imageUrl } = body;
      if (!name || !status || !platform || !campaignId) {
        return NextResponse.json({ error: 'Missing required parameters: name, status, platform, campaignId' }, { status: 400 });
      }

      const campaign = await prisma.metaCampaign.findFirst({
        where: { id: campaignId, orgId: org.id },
      });
      if (!campaign) {
        return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
      }

      const ad = await prisma.metaAd.create({
        data: {
          adId: `act_109283741_ad_${Date.now().toString().slice(-6)}`,
          name,
          status,
          spend: 0,
          leadsCount: 0,
          reach: 0,
          impressions: 0,
          clicks: 0,
          platform,
          imageUrl: imageUrl || null,
          campaignId,
          orgId: org.id
        }
      });

      return NextResponse.json({ success: true, ad });
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
