import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

async function getCanvaToken(existingConnection: any, parsedConfig: any) {
  if (!existingConnection || !parsedConfig || !parsedConfig.accessToken) {
    return null;
  }

  const { accessToken, refreshToken, expiresAt } = parsedConfig;

  // Check if token is expired (with a 1-minute buffer)
  if (Date.now() >= expiresAt - 60000) {
    console.log('Canva access token expired. Refreshing...');
    let clientId = process.env.CANVA_CLIENT_ID || '';
    let clientSecret = process.env.CANVA_CLIENT_SECRET || '';

    if (parsedConfig.customClientId) clientId = parsedConfig.customClientId;
    if (parsedConfig.customClientSecret) clientSecret = parsedConfig.customClientSecret;

    if (!clientId) clientId = 'OC-AZ7biQWiih90';
    if (!clientSecret) clientSecret = 'cnvca2GQ0hoejLZDnEaDt4zsl04PxlRnuzPipOEj9Sb0ApQ017f15b7e';

    try {
      const response = await fetch('https://api.canva.com/rest/v1/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }),
      });

      if (!response.ok) {
        console.error('Failed to refresh Canva token:', await response.text());
        return null;
      }

      const refreshedData = await response.json();
      const updatedConfig = {
        ...parsedConfig,
        accessToken: refreshedData.access_token,
        refreshToken: refreshedData.refresh_token || refreshToken,
        expiresAt: Date.now() + (refreshedData.expires_in * 1000),
        updatedAt: new Date().toISOString()
      };

      await prisma.integrationConnection.update({
        where: { id: existingConnection.id },
        data: {
          syncLogs: JSON.stringify(updatedConfig)
        }
      });

      return refreshedData.access_token;
    } catch (err) {
      console.error('Error refreshing Canva token:', err);
      return null;
    }
  }

  return accessToken;
}

async function pollJob(url: string, token: string, maxAttempts = 15) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!res.ok) {
      throw new Error(`Polling failed with status ${res.status}: ${await res.text()}`);
    }
    const data = await res.json();
    const status = data.job?.status;
    if (status === 'success') {
      return data.job;
    }
    if (status === 'failed') {
      throw new Error(`Job failed: ${data.job?.error?.message || JSON.stringify(data.job?.error || 'unknown error')}`);
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  throw new Error('Job polling timed out');
}

export async function GET(request: NextRequest) {
  try {
    const existingConnection = await prisma.integrationConnection.findFirst({
      where: { provider: 'CANVA' }
    });

    let connected = false;
    let profile: any = null;
    let customClientId = '';
    let customClientSecret = '';
    let parsedConfig: any = {};

    if (existingConnection?.syncLogs) {
      try {
        parsedConfig = JSON.parse(existingConnection.syncLogs);
        customClientId = parsedConfig.customClientId || '';
        customClientSecret = parsedConfig.customClientSecret || '';
        if (parsedConfig.accessToken) {
          connected = existingConnection.status === 'CONNECTED';
          profile = parsedConfig.profile || null;
        }
      } catch (e) {
        // Ignore JSON error
      }
    }

    // Default mock fallback designs if Canva calls fail or aren't authenticated yet
    const fallbackDesigns = [
      { id: '1', name: 'Summer Campaign Instagram Square', campaign: 'Summer Launch 2026', status: 'APPROVED', lastSync: '2 hours ago', type: 'Social Media', format: 'PNG' },
      { id: '2', name: 'Aether Social Ads Banner', campaign: 'Summer Launch 2026', status: 'IN_REVIEW', lastSync: '4 hours ago', type: 'Display Ads', format: 'JPG' },
      { id: '3', name: 'Vortex Brand Deck Assets', campaign: 'Corporate Redesign 2026', status: 'DRAFT', lastSync: '1 day ago', type: 'Marketing Decks', format: 'PDF' },
      { id: '4', name: 'Helios Media Ad Template', campaign: 'General Production', status: 'APPROVED', lastSync: '3 days ago', type: 'Templates', format: 'PNG' },
    ];

    if (!connected) {
      return NextResponse.json({
        connected: false,
        profile: null,
        designs: fallbackDesigns,
        customCredentials: { clientId: customClientId, clientSecret: customClientSecret }
      });
    }

    const token = await getCanvaToken(existingConnection, parsedConfig);
    if (!token) {
      return NextResponse.json({
        connected: false,
        profile: null,
        designs: fallbackDesigns,
        customCredentials: { clientId: customClientId, clientSecret: customClientSecret },
        error: 'Token resolved as invalid or expired'
      });
    }

    // Attempt to query real designs list and brand templates from Canva Connect REST API
    try {
      const designsPromise = fetch('https://api.canva.com/rest/v1/designs', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const templatesPromise = fetch('https://api.canva.com/rest/v1/brand-templates', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const [designsRes, templatesRes] = await Promise.all([designsPromise, templatesPromise]);

      let activeDesigns = [];
      let apiError = null;

      if (designsRes.ok) {
        const apiData = await designsRes.json();
        activeDesigns = (apiData.items || []).map((item: any, idx: number) => ({
          id: item.id,
          name: item.name,
          campaign: idx % 2 === 0 ? 'Summer Launch 2026' : 'General Production',
          status: idx % 3 === 0 ? 'APPROVED' : 'DRAFT',
          lastSync: 'Synced Just Now',
          type: 'Social Media',
          format: 'PNG',
          editUrl: item.urls?.edit_url || 'https://www.canva.com'
        }));
      } else {
        const errorText = await designsRes.text();
        apiError = { status: designsRes.status, body: errorText };
      }

      let activeTemplates = null;
      if (templatesRes.ok) {
        const templatesData = await templatesRes.json();
        const items = templatesData.brand_templates || templatesData.items || [];
        if (items.length > 0) {
          activeTemplates = items.map((item: any) => ({
            id: item.id,
            name: item.name,
            thumbnailUrl: item.thumbnail?.url || '',
            viewUrl: item.view_url || '',
            dimensions: '1080x1080 px',
            fields: ['headline', 'promoText', 'hexColor']
          }));
        }
      }

      return NextResponse.json({
        connected: true,
        profile,
        designs: activeDesigns.length > 0 ? activeDesigns : fallbackDesigns,
        templates: activeTemplates,
        customCredentials: { clientId: customClientId, clientSecret: customClientSecret },
        apiError
      });
    } catch (apiErr: any) {
      console.error('Error fetching designs or templates from Canva API:', apiErr);
      return NextResponse.json({
        connected: true,
        profile,
        designs: fallbackDesigns,
        templates: null,
        customCredentials: { clientId: customClientId, clientSecret: customClientSecret },
        apiError: { status: 500, message: apiErr.message }
      });
    }
  } catch (error: any) {
    console.error('GET /api/canva error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    const org = await prisma.organization.findFirst();
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const existingConnection = await prisma.integrationConnection.findFirst({
      where: { provider: 'CANVA' }
    });

    let parsedConfig: any = {};
    if (existingConnection?.syncLogs) {
      try {
        parsedConfig = JSON.parse(existingConnection.syncLogs);
      } catch (e) {
        // Ignore
      }
    }

    if (action === 'save_credentials') {
      const { clientId, clientSecret } = body;
      const updatedConfig = {
        ...parsedConfig,
        customClientId: clientId,
        customClientSecret: clientSecret
      };

      if (existingConnection) {
        await prisma.integrationConnection.update({
          where: { id: existingConnection.id },
          data: {
            syncLogs: JSON.stringify(updatedConfig)
          }
        });
      } else {
        await prisma.integrationConnection.create({
          data: {
            provider: 'CANVA',
            status: 'DISCONNECTED',
            lastSync: new Date(),
            syncLogs: JSON.stringify(updatedConfig),
            orgId: org.id
          }
        });
      }

      return NextResponse.json({ success: true, message: 'Custom developer credentials saved successfully' });
    }

    if (action === 'disconnect') {
      if (existingConnection) {
        // We preserve custom client credentials but clear tokens/profile
        const resetConfig = {
          customClientId: parsedConfig.customClientId || '',
          customClientSecret: parsedConfig.customClientSecret || ''
        };

        await prisma.integrationConnection.update({
          where: { id: existingConnection.id },
          data: {
            status: 'DISCONNECTED',
            lastSync: new Date(),
            syncLogs: JSON.stringify(resetConfig)
          }
        });
      }

      return NextResponse.json({ success: true, message: 'Disconnected Canva connection' });
    }

    // Call Canva Connect APIs for specific integration operations (Autofill, Export, Upload)
    const token = await getCanvaToken(existingConnection, parsedConfig);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized. Canva account not connected.' }, { status: 401 });
    }

    if (action === 'get_template_dataset') {
      const { templateId } = body;
      try {
        const response = await fetch(`https://api.canva.com/rest/v1/brand-templates/${templateId}/dataset`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!response.ok) {
          const errorText = await response.text();
          return NextResponse.json({ error: 'Failed to fetch template dataset schema', details: errorText }, { status: response.status });
        }
        const resData = await response.json();
        return NextResponse.json({ success: true, dataset: resData.dataset || {} });
      } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
      }
    }

    if (action === 'autofill') {
      const { templateId, data } = body;
      try {
        const response = await fetch(`https://api.canva.com/rest/v1/autofills`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            brand_template_id: templateId,
            data
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          return NextResponse.json({ error: 'Autofill request failed', details: errorText }, { status: response.status });
        }

        const initialJob = await response.json();
        const jobId = initialJob.job?.id;
        if (!jobId) {
          return NextResponse.json({ success: true, result: initialJob });
        }

        const completedJob = await pollJob(`https://api.canva.com/rest/v1/autofills/${jobId}`, token);
        return NextResponse.json({ success: true, result: completedJob });
      } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
      }
    }

    if (action === 'export') {
      const { designId } = body;
      try {
        const response = await fetch(`https://api.canva.com/rest/v1/exports`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            design_id: designId,
            format: { type: 'jpg' }
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          return NextResponse.json({ error: 'Export trigger failed', details: errorText }, { status: response.status });
        }

        const initialJob = await response.json();
        const jobId = initialJob.job?.id;
        if (!jobId) {
          return NextResponse.json({ success: true, result: initialJob });
        }

        const completedJob = await pollJob(`https://api.canva.com/rest/v1/exports/${jobId}`, token);
        return NextResponse.json({ success: true, result: completedJob });
      } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
      }
    }

    if (action === 'upload') {
      const { fileName, fileContent } = body;
      try {
        if (!fileName || !fileContent) {
          return NextResponse.json({ error: 'Missing file content or name' }, { status: 400 });
        }

        const base64Data = fileContent.includes(',') ? fileContent.split(',')[1] : fileContent;
        const buffer = Buffer.from(base64Data, 'base64');
        const metadataHeaderValue = Buffer.from(JSON.stringify({ name: fileName })).toString('base64');

        const response = await fetch(`https://api.canva.com/rest/v1/asset-uploads`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Asset-Upload-Metadata': metadataHeaderValue,
            'Content-Type': 'application/octet-stream'
          },
          body: buffer
        });

        if (!response.ok) {
          const errorText = await response.text();
          return NextResponse.json({ error: 'Asset upload request failed', details: errorText }, { status: response.status });
        }

        const initialJob = await response.json();
        const jobId = initialJob.job?.id;
        if (!jobId) {
          return NextResponse.json({ success: true, result: initialJob });
        }

        const completedJob = await pollJob(`https://api.canva.com/rest/v1/asset-uploads/${jobId}`, token);
        return NextResponse.json({ success: true, result: completedJob });
      } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
      }
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (error: any) {
    console.error('POST /api/canva error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
