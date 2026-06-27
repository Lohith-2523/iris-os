import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  let baseUrl = 'http://localhost:3000';
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');

    // Resolve dynamic base URL using request headers or fallback to request URL
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || url.host;
    const protoHeader = request.headers.get('x-forwarded-proto');
    const protocol = protoHeader ? protoHeader.split(',')[0].trim() : url.protocol.replace(':', '');
    baseUrl = process.env.NEXTAUTH_URL || `${protocol}://${host}`;

    const cookieStore = await cookies();
    const storedVerifier = cookieStore.get('canva_code_verifier')?.value;
    const storedState = cookieStore.get('canva_state')?.value;

    // Clear authentication cookies
    cookieStore.delete('canva_code_verifier');
    cookieStore.delete('canva_state');

    const errorParam = url.searchParams.get('error');
    const errorDesc = url.searchParams.get('error_description') || url.searchParams.get('message');
    if (errorParam) {
      return NextResponse.redirect(`${baseUrl}/design-hub?oauth=error&message=${encodeURIComponent(errorParam)}: ${encodeURIComponent(errorDesc || '')}`);
    }

    if (!code) {
      return NextResponse.redirect(`${baseUrl}/design-hub?oauth=error&message=Authorization%20code%20is%20missing`);
    }

    if (!storedVerifier || !state || state !== storedState) {
      return NextResponse.redirect(`${baseUrl}/design-hub?oauth=error&message=OAuth%20state%20verification%20failed%20or%20verifier%20missing`);
    }

    // Retrieve active credentials (either custom DB credentials or .env fallback)
    let clientId = process.env.CANVA_CLIENT_ID || '';
    let clientSecret = process.env.CANVA_CLIENT_SECRET || '';

    let parsedConfig: any = {};
    try {
      const existingConnection = await prisma.integrationConnection.findFirst({
        where: { provider: 'CANVA' }
      });
      
      if (existingConnection?.syncLogs) {
        try {
          parsedConfig = JSON.parse(existingConnection.syncLogs);
          if (parsedConfig.customClientId) clientId = parsedConfig.customClientId;
          if (parsedConfig.customClientSecret) clientSecret = parsedConfig.customClientSecret;
        } catch (e) {
          // Ignore JSON errors
        }
      }
    } catch (dbError: any) {
      console.warn('Prisma database connection failed in Canva callback route (retrieving config). Falling back to env variables.', dbError.message);
    }

    if (!clientId) clientId = 'OC-AZ7biQWiih90';
    if (!clientSecret) clientSecret = 'cnvca2GQ0hoejLZDnEaDt4zsl04PxlRnuzPipOEj9Sb0ApQ017f15b7e';

    const redirectUri = process.env.CANVA_REDIRECT_URI || `${baseUrl}/api/canva/callback`;

    // Canva Connect token endpoint exchange
    const tokenResponse = await fetch('https://api.canva.com/rest/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        code_verifier: storedVerifier,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Canva token exchange failed:', errorText);
      return NextResponse.redirect(`${baseUrl}/design-hub?oauth=error&message=Token%20exchange%20failed%20with%2520status%20${tokenResponse.status}`);
    }

    const tokenData = await tokenResponse.json();

    // Fetch user profile from Canva Connect API to confirm identity
    const profileResponse = await fetch('https://api.canva.com/rest/v1/users/me', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
      },
    });

    let profileData = null;
    if (profileResponse.ok) {
      profileData = await profileResponse.json();
    }

    // Persist credentials inside database connection logs
    try {
      const org = await prisma.organization.findFirst();
      if (org) {
        const syncLogsObj = {
          ...parsedConfig,
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          expiresAt: Date.now() + (tokenData.expires_in * 1000),
          profile: profileData,
          connectedAt: new Date().toISOString()
        };

        const existingConnection = await prisma.integrationConnection.findFirst({
          where: { provider: 'CANVA' }
        });

        if (existingConnection) {
          await prisma.integrationConnection.update({
            where: { id: existingConnection.id },
            data: {
              status: 'CONNECTED',
              lastSync: new Date(),
              syncLogs: JSON.stringify(syncLogsObj)
            }
          });
        } else {
          await prisma.integrationConnection.create({
            data: {
              provider: 'CANVA',
              status: 'CONNECTED',
              lastSync: new Date(),
              syncLogs: JSON.stringify(syncLogsObj),
              orgId: org.id
            }
          });
        }
      }
    } catch (dbError: any) {
      console.error('Failed to persist Canva credentials in database:', dbError.message);
      // Proceed gracefully, redirecting the user to the frontend since authentication succeeded
    }

    return NextResponse.redirect(`${baseUrl}/design-hub?oauth=success`);
  } catch (error: any) {
    console.error('Error in Canva OAuth callback:', error);
    return NextResponse.redirect(`${baseUrl}/design-hub?oauth=error&message=${encodeURIComponent(error.message)}`);
  }
}
