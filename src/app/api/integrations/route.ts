import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

const PROVIDERS = ['CANVA', 'PAYPAL', 'STRIPE', 'RAZORPAY'];

const DEFAULT_LOGS: Record<string, string> = {
  CANVA: 'Synced 12 assets from Canva workspace root.',
  PAYPAL: 'Not connected. Connect your PayPal Client ID and Secret Key.',
  STRIPE: 'Not connected. Connect your Stripe Restricted API Key.',
  RAZORPAY: 'Not connected. Connect your Razorpay Key ID and Secret.',
};

export async function GET() {
  try {
    const org = await prisma.organization.findFirst();
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const dbConnections = await prisma.integrationConnection.findMany({
      where: { orgId: org.id },
    });

    const connectionsMap = new Map(dbConnections.map((c) => [c.provider, c]));

    const integrations = PROVIDERS.map((provider) => {
      const dbConn = connectionsMap.get(provider);
      
      // Stripe is seeded as CONNECTED with a default mock log, but lacks actual key configuration.
      const isMockStripe = provider === 'STRIPE' && dbConn?.syncLogs === 'Synced subscription events, active webhooks verified';
      
      let status = 'CONNECTED';
      if (provider === 'RAZORPAY' || provider === 'PAYPAL') {
        status = dbConn ? dbConn.status : 'DISCONNECTED';
      } else if (provider === 'STRIPE') {
        status = (dbConn && !isMockStripe) ? dbConn.status : 'DISCONNECTED';
      } else {
        status = dbConn ? dbConn.status : 'CONNECTED';
      }

      let logs = DEFAULT_LOGS[provider];
      if (dbConn && !isMockStripe) {
        logs = (provider === 'RAZORPAY' || provider === 'PAYPAL' || provider === 'STRIPE')
          ? 'Active connection verified via secure API credentials.' 
          : dbConn.syncLogs || DEFAULT_LOGS[provider];
      }

      return {
        provider,
        status,
        lastSync: (dbConn && !isMockStripe) ? dbConn.lastSync : null,
        logs,
        hasConfig: dbConn ? (provider === 'STRIPE' ? !isMockStripe : !!dbConn.syncLogs) : false,
      };
    });

    return NextResponse.json(integrations);
  } catch (error: any) {
    console.error('Error fetching integrations:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const org = await prisma.organization.findFirst();
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const body = await request.json();
    const { provider, action, keyId, keySecret } = body;

    if (!provider || !PROVIDERS.includes(provider)) {
      return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
    }

    const existingConnection = await prisma.integrationConnection.findFirst({
      where: { orgId: org.id, provider },
    });

    if (action === 'disconnect') {
      if (existingConnection) {
        await prisma.integrationConnection.delete({
          where: { id: existingConnection.id },
        });
      }
      return NextResponse.json({ success: true, status: 'DISCONNECTED' });
    }

    if (provider === 'STRIPE') {
      if (!keyId) {
        return NextResponse.json({ error: 'Stripe API Secret or Restricted key is required.' }, { status: 400 });
      }

      // Validate key against Stripe API
      try {
        const testRes = await fetch('https://api.stripe.com/v1/balance', {
          headers: { Authorization: `Bearer ${keyId}` },
        });
        if (!testRes.ok) {
          const errMsg = await testRes.text();
          console.error('Stripe key validation failed:', errMsg);
          return NextResponse.json({ error: 'Invalid Stripe API key. Please check your Secret or Restricted Key.' }, { status: 400 });
        }
      } catch (err: any) {
        console.error('Network error validating Stripe credentials:', err);
        return NextResponse.json({ error: 'Failed to reach Stripe API. Check server connection.' }, { status: 500 });
      }

      const syncLogs = JSON.stringify({ apiKey: keyId });

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

      return NextResponse.json({ success: true, status: 'CONNECTED' });
    }

    if (provider === 'RAZORPAY') {
      if (!keyId || !keySecret) {
        return NextResponse.json({ error: 'Key ID and Secret Key are required.' }, { status: 400 });
      }

      // Validate keys against Razorpay API
      const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');
      try {
        const testRes = await fetch('https://api.razorpay.com/v1/payments?count=1', {
          headers: { Authorization: authHeader },
        });
        if (!testRes.ok) {
          const errMsg = await testRes.text();
          console.error('Razorpay key validation failed:', errMsg);
          return NextResponse.json({ error: 'Invalid Razorpay credentials. Please verify Key ID and Secret.' }, { status: 400 });
        }
      } catch (err: any) {
        console.error('Network error validating Razorpay credentials:', err);
        return NextResponse.json({ error: 'Failed to reach Razorpay API. Check server connection.' }, { status: 500 });
      }

      const syncLogs = JSON.stringify({ keyId, keySecret });

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
            provider: 'RAZORPAY',
            status: 'CONNECTED',
            lastSync: new Date(),
            syncLogs,
          },
        });
      }

      return NextResponse.json({ success: true, status: 'CONNECTED' });
    }

    if (provider === 'PAYPAL') {
      if (!keyId || !keySecret) {
        return NextResponse.json({ error: 'Client ID and Client Secret Key are required.' }, { status: 400 });
      }

      // Validate keys against PayPal OAuth2 Endpoint
      try {
        let tokenRes = await fetch('https://api-m.paypal.com/v1/oauth2/token', {
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: 'grant_type=client_credentials'
        });

        if (!tokenRes.ok) {
          // Try sandbox
          tokenRes = await fetch('https://api-m.sandbox.paypal.com/v1/oauth2/token', {
            method: 'POST',
            headers: {
              'Authorization': 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64'),
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: 'grant_type=client_credentials'
          });
        }

        if (!tokenRes.ok) {
          const errMsg = await tokenRes.text();
          console.error('PayPal credential validation failed:', errMsg);
          return NextResponse.json({ error: 'Invalid PayPal credentials. Please verify Client ID and Secret.' }, { status: 400 });
        }
      } catch (err: any) {
        console.error('Network error validating PayPal credentials:', err);
        return NextResponse.json({ error: 'Failed to reach PayPal API. Check server connection.' }, { status: 500 });
      }

      const syncLogs = JSON.stringify({ keyId, keySecret });

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

      return NextResponse.json({ success: true, status: 'CONNECTED' });
    }

    // Default mock response for other integrations
    if (existingConnection) {
      await prisma.integrationConnection.update({
        where: { id: existingConnection.id },
        data: {
          status: 'CONNECTED',
          lastSync: new Date(),
        },
      });
    } else {
      await prisma.integrationConnection.create({
        data: {
          orgId: org.id,
          provider,
          status: 'CONNECTED',
          lastSync: new Date(),
          syncLogs: 'Manual integration connected.',
        },
      });
    }

    return NextResponse.json({ success: true, status: 'CONNECTED' });
  } catch (error: any) {
    console.error('Error updating integration connection:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
