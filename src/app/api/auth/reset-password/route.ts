import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  PASSWORD_RECOVERY_COOKIE,
  PASSWORD_RECOVERY_COOKIE_VALUE,
} from '@/lib/auth-routes';

const resetPasswordSchema = z.object({
  password: z.string().min(6).max(128),
  confirmPassword: z.string().min(6).max(128),
}).refine(({ password, confirmPassword }) => password === confirmPassword, {
  message: 'Passwords do not match.',
  path: ['confirmPassword'],
});

export async function POST(request: NextRequest) {
  if (request.cookies.get(PASSWORD_RECOVERY_COOKIE)?.value !== PASSWORD_RECOVERY_COOKIE_VALUE) {
    return NextResponse.json({ error: 'A valid password recovery link is required.' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid password.' }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Authentication service is not configured.' }, { status: 503 });
  }

  const response = NextResponse.json({ success: true });
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: 'The password recovery session has expired.' }, { status: 401 });
  }

  const { error: updateError } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (updateError) {
    return NextResponse.json({ error: updateError.message || 'Unable to update the password.' }, { status: 400 });
  }

  const { error: signOutError } = await supabase.auth.signOut();
  if (signOutError) {
    return NextResponse.json({ error: 'Password updated, but the recovery session could not be closed.' }, { status: 500 });
  }

  response.cookies.set(PASSWORD_RECOVERY_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}
