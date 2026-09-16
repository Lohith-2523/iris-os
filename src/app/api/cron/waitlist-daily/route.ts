import { WAITLIST_ENABLED } from '@/lib/waitlist-config';
import { NextRequest, NextResponse } from 'next/server';
import { sendDueWaitlistInvitations } from '@/lib/auth-access';
import { sendDailyWaitlistReport } from '@/lib/waitlist-daily-report';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!WAITLIST_ENABLED) return NextResponse.json({ skipped: true, reason: 'Waitlist is paused.' });

  const [reportResult, invitationResult] = await Promise.allSettled([
    sendDailyWaitlistReport(),
    sendDueWaitlistInvitations(),
  ]);

  if (reportResult.status === 'rejected' || invitationResult.status === 'rejected') {
    if (reportResult.status === 'rejected') console.error('Daily waitlist report failed:', reportResult.reason);
    if (invitationResult.status === 'rejected') console.error('Waitlist invitation delivery failed:', invitationResult.reason);
    return NextResponse.json({
      error: 'One or more daily waitlist tasks failed.',
      report: reportResult.status === 'fulfilled' ? reportResult.value : null,
      invitations: invitationResult.status === 'fulfilled' ? invitationResult.value : null,
    }, { status: 500 });
  }

  return NextResponse.json({
    report: reportResult.value,
    invitations: invitationResult.value,
  });
}
