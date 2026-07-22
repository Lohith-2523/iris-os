import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import crypto from 'crypto';

// Basic parser for Meta signed_request
function parseSignedRequest(signedRequest: string): any {
  try {
    const [encodedSig, payload] = signedRequest.split('.');
    if (!encodedSig || !payload) return null;

    const sig = Buffer.from(encodedSig.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('hex');
    const data = JSON.parse(Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8'));

    const appSecret = process.env.META_APP_SECRET;
    if (!appSecret) return null;
    const hmac = crypto.createHmac('sha256', appSecret);
    const expectedSig = hmac.update(payload).digest('hex');
    const actual = Buffer.from(sig, 'hex');
    const expected = Buffer.from(expectedSig, 'hex');
    if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return null;

    return data;
  } catch (e) {
    console.error('Error parsing signed request:', e);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    let signedRequest = '';
    
    // Check content-type
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      signedRequest = (formData.get('signed_request') as string) || '';
    } else {
      const body = await request.json().catch(() => ({}));
      signedRequest = body.signed_request || '';
    }

    const decoded = signedRequest ? parseSignedRequest(signedRequest) : null;
    const userId = decoded?.user_id;
    if (!userId) return NextResponse.json({ error: 'Invalid signed request' }, { status: 401 });

    // Set Canva and any other integrations to DISCONNECTED
    const connection = await prisma.integrationConnection.findFirst({ where: { provider: 'META', externalAccountId: userId } });
    if (connection) {
      await prisma.integrationConnection.updateMany({
        where: { orgId: connection.orgId, provider: 'META' },
        data: {
          status: 'DISCONNECTED',
          syncLogs: `Meta deauthorized for user ID: ${userId}`
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Deauthorization request processed successfully',
    });
  } catch (error: any) {
    console.error('Error in Meta Deauthorization route:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'active',
    message: 'Meta OAuth Deauthorization endpoint is active. Use POST with signed_request to trigger.',
    docs: 'https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback/'
  });
}
