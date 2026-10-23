import { NextRequest, NextResponse } from 'next/server';
import { RECAPTCHA_SIGNUP_ACTION } from '@/config/recaptcha';
import { RecaptchaConfigurationError, verifyRecaptchaToken } from '@/lib/recaptcha';
import { createClient } from '@/lib/server';
import { signupSchema } from '@/lib/signup-validation';

export const runtime = 'nodejs';

function requestIp(request: Request) {
  return (request.headers.get('cf-connecting-ip')
    || request.headers.get('x-real-ip')
    || request.headers.get('x-forwarded-for')?.split(',')[0]
    || '').trim().slice(0, 96);
}

export async function POST(request: NextRequest) {
  const parsed = signupSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid signup details.' }, { status: 400 });
  try {
    if (!await verifyRecaptchaToken({
      token: parsed.data.recaptchaToken,
      expectedAction: RECAPTCHA_SIGNUP_ACTION,
      remoteIp: requestIp(request),
      userAgent: request.headers.get('user-agent')?.slice(0, 500),
    })) {
      return NextResponse.json({ error: 'Human verification was unsuccessful. Please try again.' }, { status: 400 });
    }
    const supabase = await createClient();
    // A deleted client can still have an unexpired session in this browser.
    // Clear it before starting a top-level workspace signup so signUp cannot
    // accidentally leave that client identity active.
    const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' });
    if (signOutError) throw signOutError;
    const { name, email, phone, password } = parsed.data;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: new URL('/auth/callback?next=/onboarding', request.nextUrl.origin).toString(),
        data: { name, full_name: name, phone, role: 'admin' },
      },
    });
    if (error) return NextResponse.json({ error: error.message }, { status: error.status === 429 ? 429 : 400 });
    return NextResponse.json(
      { confirmationRequired: !data.session },
      { status: data.session ? 201 : 202 },
    );
  } catch (error) {
    if (error instanceof RecaptchaConfigurationError) {
      return NextResponse.json({ error: 'Signup verification is temporarily unavailable.' }, { status: 503 });
    }
    console.error('Email signup failed:', error);
    return NextResponse.json({ error: 'Unable to create your workspace. Please try again.' }, { status: 503 });
  }
}
