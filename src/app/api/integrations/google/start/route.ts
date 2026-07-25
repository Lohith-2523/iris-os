import { NextRequest, NextResponse } from 'next/server';
import {
  createGoogleAuthorization,
  GOOGLE_OAUTH_STATE_COOKIE,
  googleOAuthRedirectUri,
  GoogleOAuthError,
} from '@/lib/google-oauth';
import { getRequestUser } from '@/lib/org';

const ALLOWED_RETURN_PATHS = new Set(['/calendar', '/settings']);

export async function GET(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) {
      return NextResponse.redirect(new URL('/login?auth_error=session_required', request.url));
    }
    const requestedReturnPath = request.nextUrl.searchParams.get('returnTo') || '/calendar';
    const returnTo = ALLOWED_RETURN_PATHS.has(requestedReturnPath)
      ? requestedReturnPath
      : '/calendar';
    const redirectUri = googleOAuthRedirectUri(request.url);
    const authorization = createGoogleAuthorization({
      orgId: user.orgId,
      redirectUri,
      returnTo,
      userId: user.id,
    });
    const response = NextResponse.redirect(authorization.authorizationUrl);
    response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, authorization.nonce, {
      httpOnly: true,
      maxAge: 15 * 60,
      path: '/api/integrations/google',
      sameSite: 'lax',
      secure:
        request.nextUrl.protocol === 'https:' ||
        request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() === 'https',
    });
    return response;
  } catch (error) {
    console.error('Unable to start Google Calendar authorization:', error);
    const reason = error instanceof GoogleOAuthError ? error.code : 'authorization_start_failed';
    return NextResponse.redirect(
      new URL(`/calendar?google_connected=error&reason=${encodeURIComponent(reason)}`, request.url),
    );
  }
}
