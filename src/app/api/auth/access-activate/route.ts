import { NextRequest, NextResponse } from 'next/server';
import { ACCOUNT_LOGIN_PURPOSE, ADMIN_DIRECT_ACCESS_PURPOSE, redeemAuthAccessToken } from '@/lib/auth-access';
import { DEVICE_ACCESS_COOKIE, DEVICE_ACCESS_MAX_AGE_SECONDS, deviceAccessCookieOptions } from '@/lib/auth-access-cookie';

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const token = form.get('token');
  if (typeof token !== 'string' || token.length < 32 || token.length > 256) {
    return NextResponse.redirect(new URL('/access?error=invalid', request.url), 303);
  }
  const access = await redeemAuthAccessToken(token);
  if (!access) return NextResponse.redirect(new URL('/access?error=invalid', request.url), 303);
  const destination = access.purpose === ADMIN_DIRECT_ACCESS_PURPOSE
    ? '/'
    : access.purpose === ACCOUNT_LOGIN_PURPOSE
      ? '/login'
      : '/signup';
  const response = NextResponse.redirect(new URL(destination, request.url), 303);
  response.cookies.set(DEVICE_ACCESS_COOKIE, access.cookieValue, deviceAccessCookieOptions(DEVICE_ACCESS_MAX_AGE_SECONDS));
  return response;
}
