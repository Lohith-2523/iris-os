import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function cleanOptionalText(value: unknown, maximumLength: number) {
  if (typeof value !== 'string') return null;
  const cleaned = value.trim().replace(/\s+/g, ' ');
  return cleaned ? cleaned.slice(0, maximumLength) : null;
}

export async function POST(request: NextRequest) {
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

    try {
      await prisma.waitlistEntry.create({ data: { name, email, specialization } });
    } catch (error: unknown) {
      const code = typeof error === 'object' && error && 'code' in error
        ? (error as { code?: string }).code
        : undefined;
      if (code !== 'P2002') throw error;
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error('Waitlist registration failed:', error);
    return NextResponse.json({ error: 'Unable to join the waitlist. Please try again.' }, { status: 500 });
  }
}
