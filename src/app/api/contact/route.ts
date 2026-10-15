import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { sendIrisEmail } from '@/lib/email/iris-email';
import { contactRequestNotificationEmail } from '@/lib/email/iris-templates';
import { RecaptchaConfigurationError, verifyRecaptchaToken } from '@/lib/recaptcha';

export const runtime = 'nodejs';

const topics = ['GENERAL', 'SALES', 'PARTNERSHIP', 'SUPPORT', 'PRESS'] as const;
const contactSchema = z.object({
  requestId: z.string().uuid(),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(320),
  company: z.string().trim().max(160).optional().default(''),
  topic: z.enum(topics),
  subject: z.string().trim().min(3).max(160),
  message: z.string().trim().min(10).max(8_000),
  recaptchaToken: z.string().min(20).max(4_096),
  website: z.string().max(200).optional().default(''),
});

function requestIp(request: Request) {
  return (request.headers.get('cf-connecting-ip')
    || request.headers.get('x-real-ip')
    || request.headers.get('x-forwarded-for')?.split(',')[0]
    || '').trim().slice(0, 96);
}

export async function POST(request: Request) {
  const parsed = contactSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Please check every field and try again.' }, { status: 400 });
  }
  const input = parsed.data;
  if (input.website) return NextResponse.json({ ok: true }, { status: 201 });

  try {
    if (!await verifyRecaptchaToken({
      token: input.recaptchaToken,
      remoteIp: requestIp(request),
      userAgent: request.headers.get('user-agent')?.slice(0, 500),
    })) {
      return NextResponse.json({ error: 'Human verification was unsuccessful. Please try again.' }, { status: 400 });
    }

    const details = [
      input.company ? `Company: ${input.company}` : '',
      `Topic: ${input.topic}`,
      '',
      input.message,
    ].filter((line, index) => line || index > 1).join('\n');
    const stored = await prisma.helpRequest.upsert({
      where: { id: input.requestId },
      create: {
        id: input.requestId,
        type: 'CONTACT',
        name: input.name,
        email: input.email.toLowerCase(),
        subject: input.subject,
        details,
        page: '/contact',
      },
      update: {},
    });
    if (stored.emailSentAt) return NextResponse.json({ ok: true }, { status: 200 });

    const email = contactRequestNotificationEmail(input);
    await sendIrisEmail({
      to: ['contact@irisos.app'],
      subject: email.subject,
      html: email.html,
      text: email.text,
      idempotencyKey: `contact:${input.requestId}`,
      tags: [{ name: 'category', value: 'website-contact' }],
    });
    await prisma.helpRequest.update({
      where: { id: input.requestId },
      data: { emailSentAt: new Date(), emailError: null },
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    if (error instanceof RecaptchaConfigurationError) {
      return NextResponse.json({ error: 'Contact verification is temporarily unavailable. Please email contact@irisos.app directly.' }, { status: 503 });
    }
    console.error('Contact request delivery failed:', error);
    await prisma.helpRequest.updateMany({
      where: { id: input.requestId, emailSentAt: null },
      data: { emailError: error instanceof Error ? error.message.slice(0, 1_000) : 'Delivery failed' },
    }).catch(() => undefined);
    return NextResponse.json({ error: 'Your message could not be delivered. Please email contact@irisos.app directly.' }, { status: 502 });
  }
}
