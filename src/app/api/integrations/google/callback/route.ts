import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  connectGoogleCalendar,
  GOOGLE_OAUTH_STATE_COOKIE,
  googleOAuthRedirectUri,
  GoogleOAuthError,
  readGoogleOAuthState,
} from '@/lib/google-oauth';
import {
  GoogleCalendarIntegrationError,
  syncGoogleCalendarEvents,
} from '@/lib/google-calendar';
import { getRequestUser } from '@/lib/org';

function valuesMatch(left: string, right: string) {
  const leftBuffer = Buffer.from(left, 'utf8');
  const rightBuffer = Buffer.from(right, 'utf8');
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

function redirectResult(
  request: NextRequest,
  returnTo: string,
  result: string,
  reason?: string,
) {
  const url = new URL(returnTo, request.url);
  url.searchParams.set('google_connected', result);
  if (reason) url.searchParams.set('reason', reason);
  const response = NextResponse.redirect(url);
  response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, '', {
    httpOnly: true,
    maxAge: 0,
    path: '/api/integrations/google',
    sameSite: 'lax',
    secure:
      request.nextUrl.protocol === 'https:' ||
      request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() === 'https',
  });
  return response;
}

export async function GET(request: NextRequest) {
  let returnTo = '/calendar';

  try {
    const rawState = request.nextUrl.searchParams.get('state');
    const state = rawState ? readGoogleOAuthState(rawState) : null;
    returnTo = state?.returnTo || '/calendar';

    if (!state) {
      return redirectResult(request, returnTo, 'error', 'invalid_state');
    }

    const stateCookie = request.cookies.get(GOOGLE_OAUTH_STATE_COOKIE)?.value;
    if (!stateCookie || !valuesMatch(stateCookie, state.nonce)) {
      return redirectResult(request, returnTo, 'error', 'state_mismatch');
    }

    const providerError = request.nextUrl.searchParams.get('error');
    if (providerError) {
      return redirectResult(
        request,
        returnTo,
        providerError === 'access_denied' ? 'denied' : 'error',
        providerError,
      );
    }

    const code = request.nextUrl.searchParams.get('code');
    if (!code) {
      return redirectResult(request, returnTo, 'error', 'missing_code');
    }

    const user = await getRequestUser(request);
    if (
      !user ||
      user.id !== state.userId ||
      user.orgId !== state.orgId
    ) {
      return redirectResult(request, returnTo, 'error', 'workspace_mismatch');
    }

    await connectGoogleCalendar({
      code,
      orgId: state.orgId,
      redirectUri: googleOAuthRedirectUri(request.url),
      userId: state.userId,
    });

    try {
      await syncGoogleCalendarEvents(state.orgId, state.userId);
    } catch (syncError) {
      console.error('Initial Google Calendar synchronization failed:', syncError);
      await prisma.googleCalendarConnection.updateMany({
        where: { orgId: state.orgId, userId: state.userId },
        data: {
          status: 'ERROR',
          syncLogs: JSON.stringify({
            error:
              syncError instanceof GoogleCalendarIntegrationError
                ? syncError.message
                : 'Initial Google Calendar synchronization failed.',
            failedAt: new Date().toISOString(),
          }),
        },
      });
      return redirectResult(request, returnTo, 'error', 'initial_sync_failed');
    }

    return redirectResult(request, returnTo, 'true');
  } catch (error) {
    console.error('Google Calendar OAuth callback failed:', error);
    const reason = error instanceof GoogleOAuthError ? error.code : 'callback_failed';
    return redirectResult(request, returnTo, 'error', reason);
  }
}
