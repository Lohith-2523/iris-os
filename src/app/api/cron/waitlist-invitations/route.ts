import { NextRequest, NextResponse } from 'next/server';
import { sendDueWaitlistInvitations } from '@/lib/auth-access';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    return NextResponse.json(await sendDueWaitlistInvitations());
  } catch (error) {
    console.error('Waitlist invitation delivery failed:', error);
    return NextResponse.json({ error: 'Waitlist invitation delivery failed.' }, { status: 500 });
  }
}
