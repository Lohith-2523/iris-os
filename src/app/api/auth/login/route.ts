import { NextResponse } from 'next/server';
import { z } from 'zod';
import { RECAPTCHA_LOGIN_ACTION } from '@/config/recaptcha';
import { RecaptchaConfigurationError, verifyRecaptchaToken } from '@/lib/recaptcha';
import { createClient } from '@/lib/server';

export const runtime = 'nodejs';

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().max(254).email(),
  password: z.string().min(1).max(128),
  recaptchaToken: z.string().min(20).max(4_096),
});

function requestIp(request: Request) {
  return (request.headers.get('cf-connecting-ip')
    || request.headers.get('x-real-ip')
    || request.headers.get('x-forwarded-for')?.split(',')[0]
    || '').trim().slice(0, 96);
}

export async function POST(request: Request) {
  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Enter valid sign-in details and complete verification.' }, { status: 400 });
  }

  try {
    const verified = await verifyRecaptchaToken({
      token: parsed.data.recaptchaToken,
      expectedAction: RECAPTCHA_LOGIN_ACTION,
      remoteIp: requestIp(request),
      userAgent: request.headers.get('user-agent')?.slice(0, 500),
    });
    if (!verified) {
      return NextResponse.json({ error: 'Human verification was unsuccessful. Please try again.' }, { status: 400 });
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: error.status === 429 ? 429 : 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof RecaptchaConfigurationError) {
      return NextResponse.json({ error: 'Sign-in verification is temporarily unavailable.' }, { status: 503 });
    }
    console.error('Password login failed:', error);
    return NextResponse.json({ error: 'Unable to sign in. Please try again.' }, { status: 503 });
  }
}
