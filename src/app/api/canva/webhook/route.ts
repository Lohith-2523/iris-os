import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Received Canva Webhook payload:', JSON.stringify(body, null, 2));

    const { event, design_id, export_url } = body;

    // Log the sync event to simulate server logs
    console.log(`Canva Sync: Received event ${event} for design ID: ${design_id}. Export URL: ${export_url || 'None'}`);

    return NextResponse.json({ success: true, message: 'Canva webhook event logged successfully', designId: design_id });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error handling Canva Webhook:', error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
