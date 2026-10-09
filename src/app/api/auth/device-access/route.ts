import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/org';
import { ensureDeviceAccessForUser, isAdminDirectAccessGrant, validateDeviceAccess } from '@/lib/auth-access';
import {
  createDeviceAccessCookieValue,
  DEVICE_ACCESS_COOKIE,
  deviceAccessCookieOptions,
  type DeviceLandingPreference,
  verifyDeviceAccessCookieValue,
} from '@/lib/auth-access-cookie';

function clearDeviceCookie(response: NextResponse) {
  response.cookies.set(DEVICE_ACCESS_COOKIE, '', deviceAccessCookieOptions(0));
  return response;
}

function remainingLifetimeSeconds(expiresAt: Date, now = new Date()) {
  return Math.max(1, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));
}

export async function GET(request: NextRequest) {
  const cookieValue = request.cookies.get(DEVICE_ACCESS_COOKIE)?.value;
  const parsed = verifyDeviceAccessCookieValue(cookieValue);
  const grant = parsed ? await validateDeviceAccess(cookieValue) : null;
  if (!parsed || !grant) {
    return clearDeviceCookie(NextResponse.json({ knownDevice: false, directAccess: false, landingPreference: 'ASK' }));
  }

  return NextResponse.json({
    knownDevice: true,
    directAccess: await isAdminDirectAccessGrant(grant),
    landingPreference: parsed.landingPreference,
  });
}

export async function POST(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user?.email) return NextResponse.json({ error: 'Oops! Please sign in to continue.' }, { status: 401 });

  const access = await ensureDeviceAccessForUser(
    request.cookies.get(DEVICE_ACCESS_COOKIE)?.value,
    { id: user.id, email: user.email },
  );
  const response = NextResponse.json({ ready: true, created: access.created });
  response.cookies.set(
    DEVICE_ACCESS_COOKIE,
    access.cookieValue,
    deviceAccessCookieOptions(remainingLifetimeSeconds(access.expiresAt)),
  );
  return response;
}

export async function PATCH(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const landingPreference = body?.landingPreference as DeviceLandingPreference | undefined;
  if (landingPreference !== 'LOGIN' && landingPreference !== 'HOME') {
    return NextResponse.json({ error: 'Invalid landing preference.' }, { status: 400 });
  }

  const cookieValue = request.cookies.get(DEVICE_ACCESS_COOKIE)?.value;
  const parsed = verifyDeviceAccessCookieValue(cookieValue);
  if (!parsed || !await validateDeviceAccess(cookieValue)) {
    return clearDeviceCookie(NextResponse.json({ error: 'Device access is unavailable.' }, { status: 401 }));
  }

  const response = NextResponse.json({ saved: true, landingPreference });
  response.cookies.set(
    DEVICE_ACCESS_COOKIE,
    createDeviceAccessCookieValue(parsed.grantId, parsed.rawToken, parsed.expiresAt, landingPreference),
    deviceAccessCookieOptions(remainingLifetimeSeconds(parsed.expiresAt)),
  );
  return response;
}
