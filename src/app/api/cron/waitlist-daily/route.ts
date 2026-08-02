import { NextRequest, NextResponse } from 'next/server';
import { sendDailyWaitlistReport } from '@/lib/waitlist-daily-report';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await sendDailyWaitlistReport();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Daily waitlist report failed:', error);
    return NextResponse.json({ error: 'Waitlist report delivery failed.' }, { status: 500 });
  }
}
