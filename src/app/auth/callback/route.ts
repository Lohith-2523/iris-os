import { NextResponse } from 'next/server';
import { createClient } from '@/lib/server';
import { prisma } from '@/lib/db';
import { provisionAuthenticatedUser } from '@/lib/org';
import {
  isTransientDatabaseConnectionError,
  withDatabaseConnectionRetry,
} from '@/lib/database-resilience';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const requestedNext = searchParams.get('next') ?? '/dashboard';
  const next = requestedNext.startsWith('/') && !requestedNext.startsWith('//') ? requestedNext : '/dashboard';

  try {
    if (!code) {
      return NextResponse.redirect(`${origin}/login?auth_error=missing_code`);
    }

    const supabase = await createClient();
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);
    if (error || !data?.session?.user?.email) {
      console.error('Google OAuth callback session exchange failed:', error);
      return NextResponse.redirect(`${origin}/login?auth_error=oauth_exchange_failed`);
    }

    const session = data.session;
    const email = session.user.email;
    if (!email) {
      return NextResponse.redirect(`${origin}/login?auth_error=missing_email`);
    }
    if (next.startsWith('/onboarding/member')) {
      const inviteToken = new URL(next, origin).searchParams.get('token');
      const invite = inviteToken ? await prisma.memberInvite.findUnique({ where: { token: inviteToken } }) : null;
      if (invite && !invite.used && invite.expiresAt > new Date() && invite.email.toLowerCase() === email.toLowerCase()) {
        return NextResponse.redirect(`${origin}${next}`);
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
    return NextResponse.redirect(`${origin}${redirectUrl}`);
  } catch (error) {
    console.error('Google OAuth callback failed:', error);
    if (isTransientDatabaseConnectionError(error)) {
      return NextResponse.redirect(`${origin}/login?auth_error=workspace_temporarily_unavailable`);
    }
    return NextResponse.redirect(`${origin}/login?auth_error=workspace_initialization_failed`);
  }
}
