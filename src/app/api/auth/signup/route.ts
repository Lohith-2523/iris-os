import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/server';
import { signupSchema } from '@/lib/signup-validation';
import { requireEmailConfirmationEnabled, EmailVerificationRequiredError } from '@/lib/email-verification';
import { bindDeviceGrantToAuthUser, validateDeviceAccess } from '@/lib/auth-access';
import { DEVICE_ACCESS_COOKIE } from '@/lib/auth-access-cookie';

export async function POST(request: NextRequest) {
  const parsed = signupSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid signup details.' }, { status: 400 });
  try {
    const accessCookie = request.cookies.get(DEVICE_ACCESS_COOKIE)?.value;
    if (!await validateDeviceAccess(accessCookie, parsed.data.email)) {
      return NextResponse.json({ error: 'A valid Iris OS invitation is required to create an account.' }, { status: 403 });
    }
    // Fail closed if the provider would automatically verify a nonexistent inbox.
    await requireEmailConfirmationEnabled();
    const supabase = await createClient();
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
    if (data.user) await bindDeviceGrantToAuthUser(accessCookie, data.user.id, email);
    if (data.session) {
      await supabase.auth.signOut();
      throw new EmailVerificationRequiredError();
    }
    return NextResponse.json({ confirmationRequired: true }, { status: 202 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof EmailVerificationRequiredError ? error.message : 'Unable to start email verification. Please try again.' }, { status: 503 });
  }
}
