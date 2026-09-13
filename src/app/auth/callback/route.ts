import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { prisma } from '@/lib/db';
import { provisionAuthenticatedUser } from '@/lib/org';
import {
  isTransientDatabaseConnectionError,
  withDatabaseConnectionRetry,
} from '@/lib/database-resilience';
import {
  FORGOT_PASSWORD_PATH,
  isPasswordRecoveryExchange,
  PASSWORD_RECOVERY_COOKIE,
  PASSWORD_RECOVERY_COOKIE_VALUE,
  RESET_PASSWORD_PATH,
} from '@/lib/auth-routes';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const requestedNext = searchParams.get('next') ?? '/dashboard';
  const next = requestedNext.startsWith('/') && !requestedNext.startsWith('//') ? requestedNext : '/dashboard';
  const recoveryFailureUrl = new URL(FORGOT_PASSWORD_PATH, origin);
  recoveryFailureUrl.searchParams.set('recovery_error', 'invalid_or_expired');
  const authenticationFailureUrl = next === RESET_PASSWORD_PATH
    ? recoveryFailureUrl.toString()
    : `${origin}/login`;
  // The code exchange refreshes auth cookies. Keep those cookies on the same
  // redirect response so the destination request is authenticated.
  const response = NextResponse.redirect(new URL('/dashboard', request.url));

  try {
    if (!code) {
      return NextResponse.redirect(`${authenticationFailureUrl}${authenticationFailureUrl.includes('?') ? '&' : '?'}auth_error=missing_code`);
    }

    const cookieHeader = request.headers.get('cookie') ?? '';
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!supabaseUrl || !supabaseKey) throw new Error('Supabase configuration is missing.');

    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return cookieHeader
            .split(';')
            .map((entry) => entry.trim())
            .filter(Boolean)
            .map((entry) => {
              const separator = entry.indexOf('=');
              return { name: entry.slice(0, separator), value: entry.slice(separator + 1) };
            });
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);
    if (error || !data?.session?.user?.email) {
      console.error('Authentication callback session exchange failed:', error);
      return NextResponse.redirect(`${authenticationFailureUrl}${authenticationFailureUrl.includes('?') ? '&' : '?'}auth_error=oauth_exchange_failed`);
    }

    const session = data.session;
    const email = session.user.email;
    if (!email) {
      return NextResponse.redirect(`${authenticationFailureUrl}${authenticationFailureUrl.includes('?') ? '&' : '?'}auth_error=missing_email`);
    }
    const redirectType = (data as typeof data & { redirectType?: string | null }).redirectType;
    if (isPasswordRecoveryExchange(next, redirectType)) {
      response.cookies.set(PASSWORD_RECOVERY_COOKIE, PASSWORD_RECOVERY_COOKIE_VALUE, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 10 * 60,
      });
      response.headers.set('Location', new URL(RESET_PASSWORD_PATH, origin).toString());
      return response;
    }
    if (next === RESET_PASSWORD_PATH) {
      response.headers.set('Location', recoveryFailureUrl.toString());
      return response;
    }
    if (new URL(next, origin).pathname === '/onboarding/member' || new URL(next, origin).pathname === '/invite') {
      const inviteToken = new URL(next, origin).searchParams.get('token');
      const invite = !inviteToken ? null : new URL(next, origin).pathname === '/invite'
        ? await prisma.clientInvite.findUnique({ where: { token: inviteToken } })
        : await prisma.memberInvite.findUnique({ where: { token: inviteToken } });
      if (invite && !invite.used && invite.expiresAt > new Date() && invite.email.toLowerCase() === email.toLowerCase()) {
        response.headers.set('Location', new URL(next, origin).toString());
        return response;
      }
      return NextResponse.redirect(`${origin}/login?auth_error=invalid_invite`);
    }

    const dbUser = await withDatabaseConnectionRetry(
      () => provisionAuthenticatedUser(session.user),
      {
        onRetry: (_error, nextAttempt) => {
          console.warn(`Workspace initialization is waiting for a database connection (attempt ${nextAttempt}).`);
        },
      },
    );
    const role = dbUser.role?.toLowerCase() || 'admin';

    // First-time users and users with unfinished onboarding resume the saved
    // wizard state. Completed workspaces return to their requested page/dashboard.
    const redirectUrl = role === 'client'
        ? '/client-dashboard'
        : role === 'member'
          ? '/teams-dashboard'
          : dbUser.organization.onboardingState?.needsOnboarding
            ? '/onboarding'
            : next === '/onboarding'
              ? '/dashboard'
              : next;
    response.headers.set('Location', new URL(redirectUrl, origin).toString());
    return response;
  } catch (error) {
    console.error('Authentication callback failed:', error);
    if (next === RESET_PASSWORD_PATH) {
      return NextResponse.redirect(recoveryFailureUrl);
    }
    if (isTransientDatabaseConnectionError(error)) {
      return NextResponse.redirect(`${origin}/login?auth_error=workspace_temporarily_unavailable`);
    }
    return NextResponse.redirect(`${origin}/login?auth_error=workspace_initialization_failed`);
  }
}
