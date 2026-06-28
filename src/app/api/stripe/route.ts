import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const useDemo = searchParams.get('demo') === 'true';

    const org = await prisma.organization.findFirst();
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Retrieve Stripe credentials
    const conn = await prisma.integrationConnection.findFirst({
      where: { orgId: org.id, provider: 'STRIPE' },
    });

    let apiKey = '';
    const isDefaultSeed = conn?.syncLogs === 'Synced subscription events, active webhooks verified';

    if (conn?.syncLogs && !isDefaultSeed) {
      try {
        const config = JSON.parse(conn.syncLogs);
        if (config.apiKey) apiKey = config.apiKey;
      } catch (e) {
        console.error('Error parsing Stripe api key:', e);
      }
    }

    const isConnected = !!apiKey && conn?.status === 'CONNECTED';

    // Default mock data to enrich the UI (mirroring the razorpay layout details)
    const mockCharges = [
      { id: 'ch_1H2x9a', amount: 12000, currency: 'usd', status: 'succeeded', payment_method_details: { type: 'card_visa' }, billing_details: { email: 'customer1@aether.com' }, created: Math.floor(Date.now() / 1000) - 3600 * 2 },
      { id: 'ch_2J4k2m', amount: 45000, currency: 'usd', status: 'succeeded', payment_method_details: { type: 'card_mc' }, billing_details: { email: 'billing@vertex.co' }, created: Math.floor(Date.now() / 1000) - 3600 * 12 },
      { id: 'ch_3L9p0r', amount: 7500, currency: 'usd', status: 'succeeded', payment_method_details: { type: 'card_visa' }, billing_details: { email: 'finance@pulse.io' }, created: Math.floor(Date.now() / 1000) - 3600 * 26 },
      { id: 'ch_4N8v1s', amount: 120000, currency: 'usd', status: 'succeeded', payment_method_details: { type: 'card_amex' }, billing_details: { email: 'ops@solaria.net' }, created: Math.floor(Date.now() / 1000) - 3600 * 48 },
      { id: 'ch_5P6q4t', amount: 22000, currency: 'usd', status: 'failed', payment_method_details: { type: 'card_visa' }, billing_details: { email: 'admin@novabiolabs.com' }, created: Math.floor(Date.now() / 1000) - 3600 * 72 },
    ];

    const mockStats = {
      totalVolume: 184500, // in cents ($1845.00)
      successCount: 4,
      failedCount: 1,
      refundedCount: 0,
      aov: 46125, // in cents ($461.25)
      balance: 1245000, // in cents ($12,450.00)
    };

    if (!isConnected && !useDemo) {
      return NextResponse.json({
        connected: false,
        payments: [],
        stats: { totalVolume: 0, successCount: 0, failedCount: 0, refundedCount: 0, aov: 0, balance: 0 },
        message: 'Stripe integration is disconnected. Connect keys in Settings to pull live data.'
      });
    }

    let liveCharges: any[] = [];
    let liveBalance: number = 0;
    let fetchError: string | null = null;

    if (isConnected) {
      try {
        // Fetch Balance
        const balanceRes = await fetch('https://api.stripe.com/v1/balance', {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (balanceRes.ok) {
          const balData = await balanceRes.json();
          // Sum available balance
          const avail = balData.available || [];
          const availAmt = avail.reduce((acc: number, cur: any) => acc + Number(cur.amount || 0), 0);
          liveBalance = availAmt;
        }

        // Fetch Charges
        const chargesRes = await fetch('https://api.stripe.com/v1/charges?limit=50', {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (chargesRes.ok) {
          const chargesData = await chargesRes.json();
          liveCharges = chargesData.data || [];
        } else {
          fetchError = `Stripe API error: ${chargesRes.statusText}`;
        }
      } catch (err: any) {
        console.error('Error fetching live Stripe metrics:', err);
        fetchError = 'Network connection failed while calling Stripe API.';
      }
    }

    const finalCharges = (useDemo || (liveCharges.length === 0))
      ? [...liveCharges, ...mockCharges]
      : liveCharges;

    let totalVolume = 0;
    let successCount = 0;
    let failedCount = 0;
    let refundedCount = 0;

    finalCharges.forEach((c: any) => {
      const amt = Number(c.amount || 0);
      if (c.status === 'succeeded') {
        totalVolume += amt;
        successCount++;
      } else if (c.status === 'failed') {
        failedCount++;
      }
      if (c.refunded) {
        refundedCount++;
      }
    });

    const aov = successCount > 0 ? Math.round(totalVolume / (successCount + refundedCount)) : 0;

    return NextResponse.json({
      connected: isConnected,
      usingDemoData: useDemo || (liveCharges.length === 0),
      payments: finalCharges.map((c: any) => ({
        id: c.id,
        amount: c.amount / 100, // convert cents to usd
        currency: c.currency,
        status: c.status,
        method: c.payment_method_details?.type || 'card',
        email: c.billing_details?.email || 'customer@stripe.com',
        createdAt: new Date(c.created * 1000).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
      })),
      stats: {
        totalVolume: totalVolume / 100,
        successCount,
        failedCount,
        refundedCount,
        aov: aov / 100,
        balance: isConnected ? liveBalance / 100 : mockStats.balance / 100,
      },
      fetchError,
    });
  } catch (error: any) {
    console.error('Error in Stripe API route:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
