import { isWaitlistGateActive } from '@/lib/waitlist-config';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/server';
import { signupSchema } from '@/lib/signup-validation';
import { bindDeviceGrantToAuthUser, validateDeviceAccess } from '@/lib/auth-access';
import { DEVICE_ACCESS_COOKIE } from '@/lib/auth-access-cookie';

export async function POST(request: NextRequest) {
  const parsed = signupSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid signup details.' }, { status: 400 });
  try {
    const accessCookie = request.cookies.get(DEVICE_ACCESS_COOKIE)?.value;
    const waitlistGateActive = isWaitlistGateActive();
    if (waitlistGateActive && !await validateDeviceAccess(accessCookie, parsed.data.email)) {
      return NextResponse.json({ error: 'A valid IrisOS invitation is required to create an account.' }, { status: 403 });
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
    if (waitlistGateActive && data.user) await bindDeviceGrantToAuthUser(accessCookie, data.user.id, email);
    return NextResponse.json(
      { confirmationRequired: !data.session },
      { status: data.session ? 201 : 202 },
    );
  } catch (error) {
    console.error('Email signup failed:', error);
    return NextResponse.json({ error: 'Unable to create your workspace. Please try again.' }, { status: 503 });
  }
}
