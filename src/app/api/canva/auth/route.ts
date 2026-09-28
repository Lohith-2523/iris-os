import { NextRequest, NextResponse } from 'next/server';
import {
  CANVA_OAUTH_COOKIE,
  canvaRedirectUri,
  CanvaIntegrationError,
  createCanvaAuthorization,
} from '@/lib/canva';
import { getRequestUser, isOrganizationAdmin } from '@/lib/org';

const BANNER_RETURN_PATH = '/api/canva/designs/banner';

export async function GET(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.redirect(new URL('/login?auth_error=session_required', request.url), 303);
    if (!isOrganizationAdmin(user)) return NextResponse.redirect(new URL('/dashboard?canva=forbidden', request.url), 303);

    const authorization = await createCanvaAuthorization({
      orgId: user.orgId,
      redirectUri: canvaRedirectUri(request.url),
      returnOrigin: request.nextUrl.origin,
      returnTo: BANNER_RETURN_PATH,
      userId: user.id,
    });
    const response = NextResponse.redirect(authorization.authorizationUrl, 303);
    response.cookies.set(CANVA_OAUTH_COOKIE, authorization.cookieValue, {
      httpOnly: true,
      maxAge: 15 * 60,
      path: '/api/canva',
      sameSite: 'lax',
      secure:
        request.nextUrl.protocol === 'https:' ||
        request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() === 'https',
    });
    return response;
  } catch (error) {
    console.error('Unable to start Canva authorization:', error);
    const reason = error instanceof CanvaIntegrationError ? error.code : 'authorization_start_failed';
    return NextResponse.redirect(new URL(`/dashboard?canva=${encodeURIComponent(reason)}`, request.url), 303);
  }
}
