import { NextResponse } from 'next/server';
import { createClient } from '@/lib/server';
import { prisma } from '@/lib/db';
import { provisionAuthenticatedUser } from '@/lib/org';
import { encryptIntegrationCredentials } from '@/lib/integration-secrets';
import { syncGoogleCalendarEvents } from '@/lib/google-calendar';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const requestedNext = searchParams.get('next') ?? '/dashboard';
  const next = requestedNext.startsWith('/') && !requestedNext.startsWith('//') ? requestedNext : '/dashboard';
  const type = searchParams.get('type');
  const isCalendar = type === 'calendar' || next.startsWith('/calendar');

  try {
    if (!code) {
      return NextResponse.redirect(`${origin}${isCalendar ? '/calendar?google_connected=error' : '/login?auth_error=missing_code'}`);
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
    const providerToken = session.provider_token;
    const providerRefreshToken = session.provider_refresh_token;

    if (next.startsWith('/onboarding/member')) {
      const inviteToken = new URL(next, origin).searchParams.get('token');
      const invite = inviteToken ? await prisma.memberInvite.findUnique({ where: { token: inviteToken } }) : null;
      if (invite && !invite.used && invite.expiresAt > new Date() && invite.email.toLowerCase() === email.toLowerCase()) {
        return NextResponse.redirect(`${origin}${next}`);
      }
      return NextResponse.redirect(`${origin}/login?auth_error=invalid_invite`);
    }

    const dbUser = await provisionAuthenticatedUser(session.user);
    const role = dbUser.role?.toLowerCase() || 'admin';

    if (isCalendar) {
            // Save the Google Connection details in database
            const credentialCiphertext = encryptIntegrationCredentials({
              accessToken: providerToken || null,
              refreshToken: providerRefreshToken || null,
            });
            const syncLogs = JSON.stringify({
              email,
              name: session.user.user_metadata?.full_name || email.split('@')[0],
              connectedAt: new Date().toISOString(),
            });

            await prisma.integrationConnection.upsert({
              where: { orgId_provider: { orgId: dbUser.orgId, provider: 'GOOGLE' } },
              update: {
                status: 'CONNECTED',
                lastSync: new Date(),
                syncLogs,
                credentialCiphertext,
                externalAccountId: email,
              },
              create: {
                orgId: dbUser.orgId,
                provider: 'GOOGLE',
                status: 'CONNECTED',
                lastSync: new Date(),
                syncLogs,
                credentialCiphertext,
                externalAccountId: email,
              },
            });

            // Sync Google Calendar events if token available
            if (providerToken || providerRefreshToken) {
              await syncGoogleCalendarEvents(dbUser.orgId, dbUser.id);
            }

      return NextResponse.redirect(`${origin}/calendar?google_connected=true`);
    }

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
    return NextResponse.redirect(`${origin}${isCalendar ? '/calendar?google_connected=error' : '/login?auth_error=workspace_initialization_failed'}`);
  }
}
