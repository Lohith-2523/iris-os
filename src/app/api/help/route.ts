import { NextResponse } from 'next/server';
import { z } from 'zod';
import { appendSheetRecord } from '@/lib/google-sheets';
import { sendIrisEmail } from '@/lib/email/iris-email';
import { helpRequestNotificationEmail } from '@/lib/email/iris-templates';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

const HELP_SHEET_ID = '19rb4gmwSMOvM3p26zHWNgjJmVUmJm1I3oonB72qbLVQ';
const schema = z.object({
  requestId: z.string().uuid(),
  type: z.enum(['FEEDBACK', 'FEATURE', 'COMPLAINT', 'ISSUE']),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(320),
  subject: z.string().trim().min(3).max(160),
  details: z.string().trim().min(10).max(8_000),
  page: z.string().trim().max(500).optional().default(''),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Complete every field before sending.' }, { status: 400 });
  const input = parsed.data;
  const createdAt = new Date().toISOString();
  try {
    const stored = await prisma.helpRequest.upsert({
      where: { id: input.requestId },
      create: { id: input.requestId, type: input.type, name: input.name, email: input.email.toLowerCase(), subject: input.subject, details: input.details, page: input.page || null },
      update: {},
    });
    const sheetPromise = stored.sheetSyncedAt ? Promise.resolve() : appendSheetRecord({
      spreadsheetId: HELP_SHEET_ID,
      headers: ['Request ID', 'Submitted at (UTC)', 'Type', 'Name', 'Email', 'Subject', 'Details', 'Page'],
      values: [input.requestId, createdAt, input.type, input.name, input.email.toLowerCase(), input.subject, input.details, input.page],
      idempotencyValue: input.requestId,
    });
    const emailTemplate = helpRequestNotificationEmail({
      type: input.type,
      name: input.name,
      email: input.email,
      subject: input.subject,
      details: input.details,
      page: input.page || 'IrisOS',
    });
    const emailPromise = stored.emailSentAt ? Promise.resolve() : sendIrisEmail({
      to: ['cto.admin@irisos.app'],
      subject: emailTemplate.subject,
      text: emailTemplate.text,
      html: emailTemplate.html,
      idempotencyKey: `help:${input.requestId}`,
      tags: [{ name: 'category', value: 'help-request' }],
    });
    const [sheet, email] = await Promise.allSettled([sheetPromise, emailPromise]);
    const sheetError = sheet.status === 'rejected' ? (sheet.reason instanceof Error ? sheet.reason.message : 'Sheet sync failed') : null;
    const emailError = email.status === 'rejected' ? (email.reason instanceof Error ? email.reason.message : 'Email delivery failed') : null;
    await prisma.helpRequest.update({ where: { id: input.requestId }, data: {
      sheetSyncedAt: sheet.status === 'fulfilled' ? new Date() : undefined,
      sheetSyncError: sheetError,
      emailSentAt: email.status === 'fulfilled' ? new Date() : undefined,
      emailError,
    } });
    return NextResponse.json({ ok: true, deliveryPending: Boolean(sheetError || emailError) }, { status: 201 });
  } catch (error) {
    console.error('Help request delivery failed:', error);
    return NextResponse.json({ error: 'Your request could not be delivered. Please try again.' }, { status: 502 });
  }
}
