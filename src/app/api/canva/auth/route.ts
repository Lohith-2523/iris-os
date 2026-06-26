import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Generate PKCE code verifier and code challenge
    const codeVerifier = crypto.randomBytes(96).toString('base64url');
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
    
    // Generate state
    const state = crypto.randomBytes(16).toString('hex');
    
    // Save verifier and state in cookies
    const cookieStore = await cookies();
    cookieStore.set('canva_code_verifier', codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 3600 // 1 hour
    });
    cookieStore.set('canva_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 3600
    });

    // Check if custom credentials exist in the DB connection logs
    let clientId = process.env.CANVA_CLIENT_ID || '';
    
    const existingConnection = await prisma.integrationConnection.findFirst({
      where: { provider: 'CANVA' }
    });
    
    if (existingConnection?.syncLogs) {
      try {
        const config = JSON.parse(existingConnection.syncLogs);
        if (config.customClientId) {
          clientId = config.customClientId;
        }
      } catch (e) {
        // Ignore JSON parsing errors
      }
    }

    if (!clientId) {
      clientId = 'OC-AZ7biQWiih90'; // Sandbox default fallback
    }

    // Resolve dynamic redirect URI using environment variables or request headers
    const requestUrl = new URL(request.url);
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || requestUrl.host;
    const protoHeader = request.headers.get('x-forwarded-proto');
    const protocol = protoHeader ? protoHeader.split(',')[0].trim() : requestUrl.protocol.replace(':', '');
    const baseUrl = process.env.NEXTAUTH_URL || `${protocol}://${host}`;
    const redirectUri = process.env.CANVA_REDIRECT_URI || `${baseUrl}/api/canva/callback`;
    const scope = process.env.CANVA_SCOPES || 'design:read design:meta:read design:content:read design:content:write asset:read asset:write profile:read brand-kit:read brandtemplate:meta:read brandtemplate:content:read folder:read folder:write export:read export:write';

    // Canva Auth URL redirect
    const authUrl = `https://www.canva.com/api/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&code_challenge=${codeChallenge}&code_challenge_method=s256&state=${state}`;

    return NextResponse.redirect(authUrl);
  } catch (error: any) {
    console.error('Error initiating Canva OAuth:', error);
    return NextResponse.json({ error: 'Failed to initiate Canva OAuth', details: error.message }, { status: 500 });
  }
}
