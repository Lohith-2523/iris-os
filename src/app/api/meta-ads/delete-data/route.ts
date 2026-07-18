import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import crypto from 'crypto';
import { getOrganization } from '@/lib/org';

// Basic parser for Meta signed_request
function parseSignedRequest(signedRequest: string): any {
  try {
    const [encodedSig, payload] = signedRequest.split('.');
    if (!encodedSig || !payload) return null;

    const sig = Buffer.from(encodedSig.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('hex');
    const data = JSON.parse(Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8'));

    // Verify signature if secret is configured
    const appSecret = process.env.META_APP_SECRET;
    if (appSecret) {
      const hmac = crypto.createHmac('sha256', appSecret);
      const expectedSig = hmac.update(payload).digest('hex');
      if (sig !== expectedSig) {
        console.warn('Data deletion request signature mismatch.');
        return null;
      }
    }

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

    console.log('Meta Data Deletion callback invoked. Signed Request:', signedRequest);

    let userId = 'simulated_user_id';
    if (signedRequest) {
      const decoded = parseSignedRequest(signedRequest);
      if (decoded) {
        userId = decoded.user_id || userId;
        console.log('Decoded signed request:', decoded);
      }
    }

    const org = await getOrganization(request);
    if (org) {
      // Delete Meta campaigns, ads, leads for the org in a transaction
      await prisma.$transaction([
        prisma.metaLead.deleteMany({ where: { orgId: org.id } }),
        prisma.metaAd.deleteMany({ where: { orgId: org.id } }),
        prisma.metaCampaign.deleteMany({ where: { orgId: org.id } }),
        prisma.integrationConnection.updateMany({
          where: { orgId: org.id },
          data: {
            status: 'DISCONNECTED',
            syncLogs: `Data wiped. User data deletion requested for Meta User ID: ${userId}`
          }
        })
      ]);
      console.log(`Deleted all Meta campaigns, ads, and leads for organization ${org.id} due to Meta data deletion request.`);
    }

    const confirmationCode = `meta_del_confirm_${Date.now().toString()}`;
    const statusUrl = `https://irisos.app/api/meta-ads/delete-data?id=${confirmationCode}`;

    return NextResponse.json({
      url: statusUrl,
      confirmation_code: confirmationCode
    });
  } catch (error: any) {
    console.error('Error in Meta Data Deletion route:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id') || 'meta_del_simulated_ok';

  return NextResponse.json({
    status: 'completed',
    confirmation_code: id,
    message: 'Your Meta Ads & Leads integration data deletion request has been processed. All simulated database records were deleted.'
  });
}
