import { NextRequest, NextResponse } from 'next/server';
import {
  CANVA_OAUTH_COOKIE,
  canvaRedirectUri,
  CanvaIntegrationError,
  connectCanva,
  readCanvaOAuthAttempt,
  readCanvaOAuthState,
} from '@/lib/canva';

function clearOAuthCookie(request: NextRequest, response: NextResponse) {
  response.cookies.set(CANVA_OAUTH_COOKIE, '', {
    httpOnly: true,
    maxAge: 0,
    path: '/api/canva',
    sameSite: 'lax',
    secure:
      request.nextUrl.protocol === 'https:' ||
      request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() === 'https',
  });
  return response;
}

function dashboardError(request: NextRequest, reason: string, origin = request.nextUrl.origin) {
  return clearOAuthCookie(
    request,
    NextResponse.redirect(new URL(`/dashboard?canva=${encodeURIComponent(reason)}`, origin)),
  );
}

export async function GET(request: NextRequest) {
  let returnOrigin = request.nextUrl.origin;
  try {
    const cookie = request.cookies.get(CANVA_OAUTH_COOKIE)?.value;
    const returnedState = request.nextUrl.searchParams.get('state');
    if (!returnedState) return dashboardError(request, 'invalid_state');

    const state = readCanvaOAuthState(returnedState, cookie);
    const attempt = await readCanvaOAuthAttempt(state);
    returnOrigin = state.returnOrigin;
    const providerError = request.nextUrl.searchParams.get('error');
    if (providerError) return dashboardError(request, providerError, returnOrigin);

    const code = request.nextUrl.searchParams.get('code');
    if (!code) return dashboardError(request, 'missing_code', returnOrigin);

    await connectCanva({
      code,
      orgId: state.orgId,
      redirectUri: canvaRedirectUri(request.url),
      verifier: attempt.verifier,
    });
    return clearOAuthCookie(request, NextResponse.redirect(new URL(state.returnTo, state.returnOrigin)));
  } catch (error) {
    console.error('Canva OAuth callback failed:', error);
    const reason = error instanceof CanvaIntegrationError ? error.code : 'callback_failed';
    return dashboardError(request, reason, returnOrigin);
  }
}
