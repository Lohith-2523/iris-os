import { createHmac, timingSafeEqual } from 'node:crypto';

export const DEVICE_ACCESS_COOKIE = 'iris_device_access';
export const DEVICE_ACCESS_MAX_AGE_SECONDS = 180 * 24 * 60 * 60;

function signingSecret() {
  const secret = process.env.AUTH_ACCESS_SECRET
    || process.env.SUPABASE_SECRET_KEY
    || process.env.SUPABASE_SERVICE_ROLE_KEY
    || process.env.CRON_SECRET;
  if (!secret || secret.length < 24) throw new Error('AUTH_ACCESS_SECRET must contain at least 24 characters.');
  return secret;
}

function signature(value: string) {
  return createHmac('sha256', signingSecret()).update(value).digest('base64url');
}

export function createDeviceAccessCookieValue(grantId: string, rawToken: string, expiresAt: Date) {
  const payload = `${grantId}.${rawToken}.${Math.floor(expiresAt.getTime() / 1000)}`;
  return `${payload}.${signature(payload)}`;
}

export function verifyDeviceAccessCookieValue(value: string | null | undefined, now = new Date()) {
  if (!value) return null;
  const parts = value.split('.');
  if (parts.length !== 4) return null;
  const [grantId, rawToken, expiresRaw, suppliedSignature] = parts;
  const expiresAtSeconds = Number(expiresRaw);
  if (!grantId || !rawToken || !Number.isSafeInteger(expiresAtSeconds) || expiresAtSeconds <= Math.floor(now.getTime() / 1000)) return null;
  const expectedSignature = signature(`${grantId}.${rawToken}.${expiresRaw}`);
  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;
  return { grantId, rawToken, expiresAt: new Date(expiresAtSeconds * 1000) };
}

export function deviceAccessCookieOptions(maxAge = DEVICE_ACCESS_MAX_AGE_SECONDS) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
    priority: 'high' as const,
  };
}
