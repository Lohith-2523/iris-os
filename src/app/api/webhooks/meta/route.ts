import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || process.env.META_WEBHOOK_VERIFY_TOKEN || 'irisos_meta_verify_token';

// GET Handshake challenge verification
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    // Logging verification query params for audit
    console.log('Meta Webhook GET verification request:', {
      mode,
      token,
      challenge,
      url: request.url
    });

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('Meta Webhook handshake verified successfully.');
      if (challenge) {
        return new Response(challenge, {
          status: 200,
          headers: { 'Content-Type': 'text/plain' },
        });
      }
    }

    console.warn('Meta Webhook handshake verification failed.');
    return new Response('Verification failed', { status: 403 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error in Meta Webhook GET verification:', errorMessage);
    return new Response(errorMessage, { status: 500 });
  }
}

// POST Event Receiver
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Received Meta Webhook payload:', JSON.stringify(body, null, 2));

    const { object: webhookObject, entry: entries = [] } = body;

    const org = await prisma.organization.findFirst();
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const processedEvents: Record<string, unknown>[] = [];

    // Helper to log connection events to IntegrationConnection log
    const logConnectionEvent = async (provider: string, message: string) => {
      const conn = await prisma.integrationConnection.findFirst({
        where: { provider }
      });
      if (conn) {
        let currentLogs = [];
        if (conn.syncLogs) {
          try {
            currentLogs = JSON.parse(conn.syncLogs);
          } catch (e) {
            console.error('Failed to parse connection syncLogs:', e);
          }
        }
        const newLog = {
          timestamp: new Date().toISOString(),
          message
        };
        const updatedLogs = [newLog, ...(Array.isArray(currentLogs) ? currentLogs : [])].slice(0, 50);
        await prisma.integrationConnection.update({
          where: { id: conn.id },
          data: {
            lastSync: new Date(),
            syncLogs: JSON.stringify(updatedLogs),
            status: 'CONNECTED'
          }
        });
      }
    };

    for (const entry of entries) {
      // 1. Handle Ad Account Webhooks
      if (webhookObject === 'ad_account') {
        const changes = entry.changes || [];
        for (const change of changes) {
          const val = change.value;
          if (!val) continue;

          // Check if ad status/spend changes
          if (change.field === 'ad_status' || val.ad_id) {
            const adId = val.ad_id;
            const updatedAd = await prisma.metaAd.updateMany({
              where: { adId },
              data: {
                status: val.status || undefined,
                spend: val.spend !== undefined ? parseFloat(val.spend) : undefined,
                reach: val.reach !== undefined ? parseInt(val.reach) : undefined,
                clicks: val.clicks !== undefined ? parseInt(val.clicks) : undefined,
                impressions: val.impressions !== undefined ? parseInt(val.impressions) : undefined
              }
            });
            await logConnectionEvent('SLACK', `Meta Webhook: Ad ${adId} updated status/metrics via ad_account webhook.`);
            processedEvents.push({ type: 'ad_account_change', adId, success: updatedAd.count > 0 });
          }

          // Check if campaign level changes
          if (val.campaign_id) {
            const campaignId = val.campaign_id;
            const updatedCampaign = await prisma.metaCampaign.updateMany({
              where: { campaignId },
              data: {
                status: val.status || undefined,
                dailyBudget: val.daily_budget !== undefined ? parseFloat(val.daily_budget) : undefined
              }
            });
            processedEvents.push({ type: 'campaign_change', campaignId, success: updatedCampaign.count > 0 });
          }
        }
      }

      // 2. Handle Catalog Webhooks
      else if (webhookObject === 'catalog') {
        const changes = entry.changes || [];
        for (const change of changes) {
          const val = change.value;
          await logConnectionEvent('CANVA', `Meta Catalog Webhook: Catalog ${entry.id || 'Unknown'} field ${change.field || 'unknown'} changed: ${JSON.stringify(val)}`);
          processedEvents.push({ type: 'catalog_change', field: change.field });
        }
      }

      // 3. Handle User Webhooks
      else if (webhookObject === 'user') {
        const changedFields = entry.changed_fields || [];
        await logConnectionEvent('SLACK', `Meta User Webhook: User ${entry.uid || 'Unknown'} profile fields changed: ${changedFields.join(', ')}`);
        processedEvents.push({ type: 'user_profile_change', fields: changedFields });
      }

      // 4. Handle Permissions Webhooks
      else if (webhookObject === 'permissions') {
        const changes = entry.changes || [];
        for (const change of changes) {
          await logConnectionEvent('SLACK', `Meta Permissions Webhook: App permission ${change.field || 'unknown'} value: ${JSON.stringify(change.value)}`);
          processedEvents.push({ type: 'permission_change', permission: change.field });
        }
      }

      // 5. Handle Application Webhooks
      else if (webhookObject === 'application') {
        const changes = entry.changes || [];
        for (const change of changes) {
          await logConnectionEvent('SLACK', `Meta Application Webhook: App field ${change.field || 'unknown'} changed.`);
          processedEvents.push({ type: 'app_change', field: change.field });
        }
      }

      // 6. Handle Instagram Webhooks
      else if (webhookObject === 'instagram') {
        const changes = entry.changes || [];
        for (const change of changes) {
          await logConnectionEvent('CANVA', `Meta Instagram Webhook: IG User ${entry.id || 'Unknown'} field ${change.field || 'unknown'} updated: ${JSON.stringify(change.value)}`);
          processedEvents.push({ type: 'instagram_event', field: change.field });
        }
      }

      // 7. Handle Whatsapp Webhooks
      else if (webhookObject === 'whatsapp_business_account') {
        const changes = entry.changes || [];
        for (const change of changes) {
          await logConnectionEvent('HUBSPOT', `Meta WhatsApp Webhook: WABA ${entry.id || 'Unknown'} field ${change.field || 'unknown'} changed.`);
          processedEvents.push({ type: 'whatsapp_event', field: change.field });
        }
      }

      // 8. Handle Page Webhooks (including Lead Gen)
      else if (webhookObject === 'page') {
        const changes = entry.changes || [];
        for (const change of changes) {
          if (change.field === 'leadgen') {
            const val = change.value;
            const leadgenId = val.leadgen_id;
            const adId = val.ad_id || '';

            const matchingAd = await prisma.metaAd.findUnique({
              where: { adId }
            });

            const adName = matchingAd ? matchingAd.name : 'Meta Ad Lead Form';

            const lead = await prisma.metaLead.upsert({
              where: { leadId: leadgenId },
              update: {
                adId,
                adName,
              },
              create: {
                leadId: leadgenId,
                adId,
                adName,
                fullName: val.full_name || `Meta Lead (${leadgenId.slice(-4)})`,
                email: val.email || `lead-${leadgenId.slice(-4)}@facebook-leads.com`,
                phone: val.phone || '+1-555-0100',
                status: 'new',
                createdTime: val.created_time ? new Date(val.created_time * 1000) : new Date(),
                orgId: org.id,
              }
            });

            await logConnectionEvent('HUBSPOT', `Meta Webhook: Saved new leadgen record: ${lead.fullName} (${lead.email}).`);
            processedEvents.push({ type: 'leadgen_captured', leadId: leadgenId });
          } else {
            await logConnectionEvent('SLACK', `Meta Page Webhook: Page ${entry.id || 'Unknown'} field ${change.field || 'unknown'} update.`);
            processedEvents.push({ type: 'page_change', field: change.field });
          }
        }
      }
    }

    return NextResponse.json({ success: true, processedCount: processedEvents.length, events: processedEvents });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error handling Meta Webhook POST:', error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
