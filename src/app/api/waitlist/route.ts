import { isWaitlistGateActive } from '@/lib/waitlist-config';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { appendSheetRecord } from '@/lib/google-sheets';
import { scheduleWaitlistInvitation } from '@/lib/auth-access';

export const runtime = 'nodejs';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function cleanOptionalText(value: unknown, maximumLength: number) {
  if (typeof value !== 'string') return null;
  const cleaned = value.trim().replace(/\s+/g, ' ');
  return cleaned ? cleaned.slice(0, maximumLength) : null;
}

export async function POST(request: NextRequest) {
  if (!isWaitlistGateActive()) {
    return NextResponse.json({ error: 'Waitlist registration is paused. Please sign up directly.' }, { status: 410 });
  }
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }

    const input = body as Record<string, unknown>;
    const email = cleanOptionalText(input.email, 320)?.toLowerCase();
    if (!email || !EMAIL_PATTERN.test(email)) {
      return NextResponse.json({ error: 'Enter a valid work email address.' }, { status: 400 });
    }

    const name = cleanOptionalText(input.name, 120);
    const specialization = cleanOptionalText(input.specialization, 120);

    const entry = await prisma.waitlistEntry.upsert({
      where: { email },
      create: { name, email, specialization },
      update: {},
    });
    await scheduleWaitlistInvitation(entry);
    if (!entry.sheetSyncedAt) {
      try {
        await appendSheetRecord({
          spreadsheetId: '1FyW5FeczNyfAv338j5kqBWv6auYtQVVreBsBIaXnJ_c',
          headers: ['Work email', 'Joined at (UTC)', 'Full name', 'Agency specialization'],
          values: [email, entry.createdAt.toISOString(), name || entry.name || '', specialization || entry.specialization || ''],
          idempotencyValue: email,
        });
        await prisma.waitlistEntry.update({ where: { id: entry.id }, data: { sheetSyncedAt: new Date(), sheetSyncError: null } });
      } catch (sheetError) {
        await prisma.waitlistEntry.update({ where: { id: entry.id }, data: { sheetSyncError: sheetError instanceof Error ? sheetError.message.slice(0, 1_000) : 'Sheet sync failed' } });
        console.error('Waitlist Google Sheet sync failed:', sheetError);
      }
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error('Waitlist registration failed:', error);
    return NextResponse.json({ error: 'Unable to join the waitlist. Please try again.' }, { status: 500 });
  }
}
