import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getOrganization, getRequestUser, isOrganizationAdmin } from '@/lib/org';
import { encryptIntegrationCredentials } from '@/lib/integration-secrets';

const PROVIDERS = ['RAZORPAY', 'META', 'GOOGLE'];

const DEFAULT_LOGS: Record<string, string> = {
  RAZORPAY: 'Not connected. Connect your Razorpay Key ID and Secret.',
  META: 'Not connected. Authorize your Meta Business Account via Facebook SDK.',
  GOOGLE: 'Not connected. Connect your Google account to sync Google Calendar.',
};

export async function GET(request: NextRequest) {
  try {
    const org = await getOrganization(request);
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const dbConnections = await prisma.integrationConnection.findMany({
      where: { orgId: org.id },
    });

    const connectionsMap = new Map(dbConnections.map((c) => [c.provider, c]));

    const integrations = PROVIDERS.map((provider) => {
      const dbConn = connectionsMap.get(provider);
      
      const status = dbConn ? dbConn.status : 'DISCONNECTED';

      let logs = DEFAULT_LOGS[provider];
      if (dbConn) {
        logs = dbConn.syncLogs || 'Active connection verified.';
      }

      return {
        provider,
        status,
        lastSync: dbConn ? dbConn.lastSync : null,
        logs,
        hasConfig: dbConn ? !!dbConn.credentialCiphertext : false,
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
    const org = await getOrganization(request);
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }
    const user = await getRequestUser(request);
    if (!user || !isOrganizationAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

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

    if (provider === 'META' && action === 'connect_sdk') {
      const profile = body.profile || {};
      const syncLogs = `Connected via Facebook SDK. User ID: ${body.authResponse?.userID || 'unknown'}. Profile Name: ${profile.name || 'unknown'}. Profile Email: ${profile.email || 'unknown'}`;
      if (existingConnection) {
        await prisma.integrationConnection.update({
          where: { id: existingConnection.id },
          data: {
            status: 'CONNECTED',
            lastSync: new Date(),
            syncLogs,
            externalAccountId: body.authResponse?.userID || null,
          }
        });
      } else {
        await prisma.integrationConnection.create({
          data: {
            orgId: org.id,
            provider: 'META',
            status: 'CONNECTED',
            lastSync: new Date(),
            syncLogs,
            externalAccountId: body.authResponse?.userID || null,
          }
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

      const credentialCiphertext = encryptIntegrationCredentials({ keyId, keySecret });
      const syncLogs = 'Razorpay credentials verified and stored securely.';

      if (existingConnection) {
        await prisma.integrationConnection.update({
          where: { id: existingConnection.id },
          data: {
            status: 'CONNECTED',
            lastSync: new Date(),
            syncLogs,
            credentialCiphertext,
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
            credentialCiphertext,
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
