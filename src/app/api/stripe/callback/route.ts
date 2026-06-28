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

    let stripeUserId = '';
    let accessToken = '';

    if (code.startsWith('mock_stripe_code')) {
      stripeUserId = 'acct_mock_stripe_123';
      accessToken = 'sk_mock_stripe_123';
    } else {
      const res = await fetch('https://connect.stripe.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=authorization_code&code=${code}&client_secret=${process.env.STRIPE_SECRET_KEY}`,
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error('Stripe Connect OAuth exchange failed:', errText);
        return NextResponse.redirect(new URL('/settings?tab=integrations&status=error&message=OAuth+token+exchange+failed', request.url));
      }

      const tokenData = await res.json();
      stripeUserId = tokenData.stripe_user_id;
      accessToken = tokenData.access_token || tokenData.stripe_publishable_key || '';
    }

    const syncLogs = JSON.stringify({ stripeUserId, accessToken, connectedAt: new Date().toISOString() });

    const existingConnection = await prisma.integrationConnection.findFirst({
      where: { orgId: org.id, provider: 'STRIPE' },
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
          provider: 'STRIPE',
          status: 'CONNECTED',
          lastSync: new Date(),
          syncLogs,
        },
      });
    }

    return NextResponse.redirect(new URL('/settings?tab=integrations&status=success&provider=Stripe', request.url));
  } catch (err: any) {
    console.error('Error in Stripe OAuth callback:', err);
    return NextResponse.redirect(new URL(`/settings?tab=integrations&status=error&message=${encodeURIComponent(err.message)}`, request.url));
  }
}
