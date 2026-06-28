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

    // Retrieve PayPal credentials
    const conn = await prisma.integrationConnection.findFirst({
      where: { orgId: org.id, provider: 'PAYPAL' },
    });

    let clientId = '';
    let clientSecret = '';

    if (conn?.syncLogs) {
      try {
        const config = JSON.parse(conn.syncLogs);
        if (config.keyId) clientId = config.keyId;
        if (config.keySecret) clientSecret = config.keySecret;
      } catch (e) {
        console.error('Error parsing PayPal keys:', e);
      }
    }

    const isConnected = !!(clientId && clientSecret) && conn?.status === 'CONNECTED';

    // Mock data for sandbox / demo mode fallback
    const mockPayments = [
      { id: 'pp_txn_101', amount: 250.00, currency: 'USD', status: 'completed', method: 'express_checkout', email: 'payer1@aether.com', createdAt: 'June 26, 2026' },
      { id: 'pp_txn_102', amount: 80.00, currency: 'USD', status: 'completed', method: 'express_checkout', email: 'payer2@vertex.co', createdAt: 'June 25, 2026' },
      { id: 'pp_txn_103', amount: 1500.00, currency: 'USD', status: 'completed', method: 'express_checkout', email: 'payer3@pulse.io', createdAt: 'June 24, 2026' },
      { id: 'pp_txn_104', amount: 110.00, currency: 'USD', status: 'completed', method: 'express_checkout', email: 'payer4@solaria.net', createdAt: 'June 21, 2026' },
      { id: 'pp_txn_105', amount: 300.00, currency: 'USD', status: 'refunded', method: 'express_checkout', email: 'payer5@novabiolabs.com', createdAt: 'June 19, 2026' },
    ];

    const mockStats = {
      totalVolume: 32400.00,
      successCount: 4,
      failedCount: 0,
      refundedCount: 1,
      aov: 6480.00,
      balance: 4850.00,
    };

    if (!isConnected && !useDemo) {
      return NextResponse.json({
        connected: false,
        payments: [],
        stats: { totalVolume: 0, successCount: 0, failedCount: 0, refundedCount: 0, aov: 0, balance: 0 },
        message: 'PayPal integration is disconnected. Connect keys in Settings to pull live data.'
      });
    }

    let livePayments: any[] = [];
    let fetchError: string | null = null;
    let usingDemoData = useDemo || (clientId.startsWith('paypal_client_id_test'));

    if (isConnected && !usingDemoData) {
      try {
        // Try production token, then fallback to sandbox token
        let tokenRes = await fetch('https://api-m.paypal.com/v1/oauth2/token', {
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: 'grant_type=client_credentials'
        });

        let isSandbox = false;
        if (!tokenRes.ok) {
          // Try sandbox
          tokenRes = await fetch('https://api-m.sandbox.paypal.com/v1/oauth2/token', {
            method: 'POST',
            headers: {
              'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: 'grant_type=client_credentials'
          });
          isSandbox = true;
        }

        if (tokenRes.ok) {
          const tokenData = await tokenRes.json();
          const accessToken = tokenData.access_token;
          const host = isSandbox ? 'api-m.sandbox.paypal.com' : 'api-m.paypal.com';

          // Fetch transactions (last 30 days)
          const endDate = new Date();
          const startDate = new Date();
          startDate.setDate(startDate.getDate() - 30);
          
          // Formats date string exactly: 2026-06-01T00:00:00Z
          const endDateStr = endDate.toISOString().split('.')[0] + 'Z';
          const startDateStr = startDate.toISOString().split('.')[0] + 'Z';

          const txres = await fetch(`https://${host}/v1/reporting/transactions?start_date=${startDateStr}&end_date=${endDateStr}&page_size=50`, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: 'application/json',
            }
          });

          if (txres.ok) {
            const txdata = await txres.json();
            const txDetails = txdata.transaction_details || [];
            livePayments = txDetails.map((td: any) => {
              const info = td.transaction_info || {};
              const payer = td.payer_info || {};
              return {
                id: info.transaction_id,
                amount: Math.abs(Number(info.transaction_amount?.value || 0)),
                currency: info.transaction_amount?.currency_code || 'USD',
                status: info.transaction_status === 'S' ? 'completed' : info.transaction_status === 'V' ? 'refunded' : 'failed',
                method: 'express_checkout',
                email: payer.email_address || 'customer@paypal.com',
                createdAt: new Date(info.transaction_initiation_date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                }),
              };
            });
          } else {
            const errMsg = await txres.text();
            console.error('PayPal reporting transaction fetch failed:', errMsg);
            fetchError = `PayPal Transaction API error: ${txres.statusText}`;
          }
        } else {
          fetchError = `PayPal OAuth token error: ${tokenRes.statusText}`;
        }
      } catch (err: any) {
        console.error('Error fetching live PayPal payments:', err);
        fetchError = 'Network connection failed while calling PayPal API.';
      }
    }

    const finalPayments = (usingDemoData || (livePayments.length === 0))
      ? [...livePayments, ...mockPayments]
      : livePayments;

    let totalVolume = 0;
    let successCount = 0;
    let failedCount = 0;
    let refundedCount = 0;

    finalPayments.forEach((p: any) => {
      const amt = Number(p.amount || 0);
      if (p.status === 'completed' || p.status === 'succeeded') {
        totalVolume += amt;
        successCount++;
      } else if (p.status === 'failed') {
        failedCount++;
      } else if (p.status === 'refunded') {
        totalVolume += amt;
        refundedCount++;
      }
    });

    const aov = successCount > 0 ? Math.round(totalVolume / (successCount + refundedCount)) : 0;

    return NextResponse.json({
      connected: isConnected,
      usingDemoData: usingDemoData || (livePayments.length === 0),
      payments: finalPayments,
      stats: {
        totalVolume,
        successCount,
        failedCount,
        refundedCount,
        aov,
        balance: mockStats.balance,
      },
      fetchError,
    });
  } catch (error: any) {
    console.error('Error in PayPal API route:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
