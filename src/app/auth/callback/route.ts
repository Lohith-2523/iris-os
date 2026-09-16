import { WAITLIST_ENABLED } from '@/lib/waitlist-config';
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { prisma } from '@/lib/db';
import {
  DeletedClientWorkspaceError,
  provisionAuthenticatedUser,
  WorkspaceSignupRoleConflictError,
} from '@/lib/org';
import {
  isTransientDatabaseConnectionError,
  withDatabaseConnectionRetry,
} from '@/lib/database-resilience';
import {
  FORGOT_PASSWORD_PATH,
  ADMIN_FORGOT_PASSWORD_PATH,
  ADMIN_RESET_PASSWORD_PATH,
  isPasswordRecoveryExchange,
  PASSWORD_RECOVERY_COOKIE,
  PASSWORD_RECOVERY_COOKIE_VALUE,
  RESET_PASSWORD_PATH,
} from '@/lib/auth-routes';
import { hasApprovedSignup, validateDeviceAccess } from '@/lib/auth-access';
import { DEVICE_ACCESS_COOKIE } from '@/lib/auth-access-cookie';
import { hasSuperadminAccess, SUPERADMIN_OWNER_EMAIL } from '@/admin/policy';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const requestedNext = searchParams.get('next') ?? '/dashboard';
  const next = requestedNext.startsWith('/') && !requestedNext.startsWith('//') ? requestedNext : '/dashboard';
  const recoveryFailureUrl = new URL(next === ADMIN_RESET_PASSWORD_PATH ? ADMIN_FORGOT_PASSWORD_PATH : FORGOT_PASSWORD_PATH, origin);
  recoveryFailureUrl.searchParams.set('recovery_error', 'invalid_or_expired');
  const authenticationFailureUrl = next === RESET_PASSWORD_PATH || next === ADMIN_RESET_PASSWORD_PATH
    ? recoveryFailureUrl.toString()
    : next === '/admin'
      ? `${origin}/admin/login`
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
      response.headers.set('Location', new URL(next, origin).toString());
      return response;
    }
    if (next === RESET_PASSWORD_PATH) {
      response.headers.set('Location', recoveryFailureUrl.toString());
      return response;
    }
    if (next === ADMIN_RESET_PASSWORD_PATH) {
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

    if (next === '/admin') {
      const normalizedEmail = email.trim().toLowerCase();
      const grant = normalizedEmail === SUPERADMIN_OWNER_EMAIL
        ? null
        : await prisma.adminAccess.findUnique({ where: { email: normalizedEmail } });
      if (hasSuperadminAccess(normalizedEmail, Boolean(session.user.email_confirmed_at), grant)) {
        response.headers.set('Location', new URL('/admin', origin).toString());
        return response;
      }
      await supabase.auth.signOut();
      response.headers.set('Location', new URL('/admin/login?auth_error=admin_access_denied', origin).toString());
      return response;
    }

    if (WAITLIST_ENABLED) {
      const existingWorkspaceUser = await prisma.user.findFirst({
        where: { OR: [{ authUserId: session.user.id }, { email: email.toLowerCase() }] },
        select: { id: true },
      });
      const deviceCookie = request.headers.get('cookie')
        ?.split(';')
        .map(value => value.trim())
        .find(value => value.startsWith(`${DEVICE_ACCESS_COOKIE}=`))
        ?.slice(DEVICE_ACCESS_COOKIE.length + 1);
      const approvedDevice = existingWorkspaceUser
        || await validateDeviceAccess(deviceCookie ? decodeURIComponent(deviceCookie) : null, email)
        || await hasApprovedSignup(session.user.id, email);
      if (!approvedDevice) {
        await supabase.auth.signOut();
        return NextResponse.redirect(`${origin}/waitlist?access=required`);
      }
    }

    let dbUser;
    try {
      dbUser = await withDatabaseConnectionRetry(
        () => provisionAuthenticatedUser(session.user, {
          intent: next === '/onboarding' ? 'workspace-signup' : 'sign-in',
        }),
        {
          onRetry: (_error, nextAttempt) => {
            console.warn(`Workspace initialization is waiting for a database connection (attempt ${nextAttempt}).`);
          },
        },
      );
    } catch (error) {
      if (error instanceof WorkspaceSignupRoleConflictError) {
        await supabase.auth.signOut({ scope: 'local' });
        response.headers.set('Location', new URL('/login?auth_error=account_already_exists', origin).toString());
        return response;
      }
      if (error instanceof DeletedClientWorkspaceError) {
        await supabase.auth.signOut({ scope: 'local' });
        response.headers.set('Location', new URL('/login?auth_error=workspace_deleted', origin).toString());
        return response;
      }
      throw error;
    }
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
    if (next === RESET_PASSWORD_PATH || next === ADMIN_RESET_PASSWORD_PATH) {
      return NextResponse.redirect(recoveryFailureUrl);
    }
    if (isTransientDatabaseConnectionError(error)) {
      return NextResponse.redirect(`${origin}/login?auth_error=workspace_temporarily_unavailable`);
    }
    return NextResponse.redirect(`${origin}/login?auth_error=workspace_initialization_failed`);
  }
}
