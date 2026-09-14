import { NextRequest, NextResponse } from 'next/server';
import { requestExistingAccountAccess } from '@/lib/auth-access';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { email?: unknown } | null;
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase().slice(0, 320) : '';
  if (!EMAIL_PATTERN.test(email)) return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
  try {
    await requestExistingAccountAccess(email);
  } catch (error) {
    console.error('Account access email request failed:', error);
  }
  return NextResponse.json({ ok: true, message: 'If an Iris OS account exists for that email, an access link is on its way.' });
}
