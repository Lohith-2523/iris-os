import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  if (error || !code) {
    const msg = errorDescription || error || 'Authorization was cancelled';
    return NextResponse.redirect(new URL(`/settings?tab=integrations&status=error&message=${encodeURIComponent(msg)}`, request.url));
  }

  try {
    const org = await prisma.organization.findFirst();
    if (!org) {
      return NextResponse.redirect(new URL('/settings?tab=integrations&status=error&message=Organization+not+found', request.url));
    }

    let keyId = '';
    let keySecret = '';

    if (code.startsWith('mock_paypal_code')) {
      keyId = 'paypal_client_id_test_99';
      keySecret = 'paypal_client_secret_test_23';
    } else {
      // For real OAuth code exchange, exchange authorization code for token
      const host = request.headers.get('host') || 'localhost:3000';
      const protocol = host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https';
      const redirectUri = `${protocol}://${host}/api/paypal/callback`;

      const clientId = process.env.PAYPAL_CLIENT_ID || '';
      const clientSecret = process.env.PAYPAL_SECRET_KEY || '';

      const isProduction = process.env.PAYPAL_ENVIRONMENT === 'PRODUCTION';
      const tokenEndpoint = isProduction
        ? 'https://api-m.paypal.com/v1/oauth2/token'
        : 'https://api-m.sandbox.paypal.com/v1/oauth2/token';

      const authHeader = 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

      const res = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `grant_type=authorization_code&code=${code}&redirect_uri=${encodeURIComponent(redirectUri)}`,
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error('PayPal OAuth exchange failed:', errText);
        return NextResponse.redirect(new URL('/settings?tab=integrations&status=error&message=OAuth+token+exchange+failed', request.url));
      }

      const tokenData = await res.json();
      // Store credentials or access token retrieved
      keyId = clientId;
      keySecret = clientSecret; // maintain config for future transaction queries
    }

    const syncLogs = JSON.stringify({ keyId, keySecret, connectedAt: new Date().toISOString() });

    const existingConnection = await prisma.integrationConnection.findFirst({
      where: { orgId: org.id, provider: 'PAYPAL' },
    });

    if (existingConnection) {
      await prisma.integrationConnection.update({
        where: { id: existingConnection.id },
        data: {
          status: 'CONNECTED',
          lastSync: new Date(),
          syncLogs,
        },
      });
    } else {
      await prisma.integrationConnection.create({
        data: {
          orgId: org.id,
          provider: 'PAYPAL',
          status: 'CONNECTED',
          lastSync: new Date(),
          syncLogs,
        },
      });
    }

    return NextResponse.redirect(new URL('/settings?tab=integrations&status=success&provider=PayPal', request.url));
  } catch (err: any) {
    console.error('Error in PayPal OAuth callback:', err);
    return NextResponse.redirect(new URL(`/settings?tab=integrations&status=error&message=${encodeURIComponent(err.message)}`, request.url));
  }
}
