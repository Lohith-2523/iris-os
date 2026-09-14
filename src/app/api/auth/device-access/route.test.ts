import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import {
  createDeviceAccessCookieValue,
  DEVICE_ACCESS_COOKIE,
  verifyDeviceAccessCookieValue,
} from '@/lib/auth-access-cookie';

const mocks = vi.hoisted(() => ({
  getRequestUser: vi.fn(),
  ensureDeviceAccessForUser: vi.fn(),
  validateDeviceAccess: vi.fn(),
}));

vi.mock('@/lib/org', () => ({ getRequestUser: mocks.getRequestUser }));
vi.mock('@/lib/auth-access', () => ({
  ensureDeviceAccessForUser: mocks.ensureDeviceAccessForUser,
  validateDeviceAccess: mocks.validateDeviceAccess,
}));

import { GET, PATCH, POST } from './route';

const now = new Date('2029-01-01T00:00:00.000Z');
const expiresAt = new Date('2030-01-01T00:00:00.000Z');

function request(method: string, cookieValue?: string, body?: unknown) {
  const headers = new Headers();
  if (cookieValue) headers.set('cookie', `${DEVICE_ACCESS_COOKIE}=${cookieValue}`);
  if (body) headers.set('content-type', 'application/json');
  return new NextRequest('http://localhost:3000/api/auth/device-access', {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('/api/auth/device-access', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('AUTH_ACCESS_SECRET', 'test-auth-access-secret-that-is-long-enough');
    vi.setSystemTime(now);
  });

  it('recognizes a valid browser and reads its signed landing choice', async () => {
    const cookieValue = createDeviceAccessCookieValue('grant-1', 'random-token', expiresAt, 'LOGIN');
    mocks.validateDeviceAccess.mockResolvedValue({ id: 'grant-1' });

    const response = await GET(request('GET', cookieValue));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ knownDevice: true, landingPreference: 'LOGIN' });
  });

  it('creates a persistent grant for an authenticated workspace user', async () => {
    const cookieValue = createDeviceAccessCookieValue('grant-2', 'new-random-token', expiresAt);
    mocks.getRequestUser.mockResolvedValue({ id: 'user-1', email: 'owner@example.com' });
    mocks.ensureDeviceAccessForUser.mockResolvedValue({ cookieValue, expiresAt, created: true });

    const response = await POST(request('POST'));

    expect(response.status).toBe(200);
    expect(mocks.ensureDeviceAccessForUser).toHaveBeenCalledWith(undefined, { id: 'user-1', email: 'owner@example.com' });
    expect(response.cookies.get(DEVICE_ACCESS_COOKIE)?.value).toBe(cookieValue);
  });

  it('stores a remembered choice inside the signed device cookie', async () => {
    const cookieValue = createDeviceAccessCookieValue('grant-1', 'random-token', expiresAt);
    mocks.validateDeviceAccess.mockResolvedValue({ id: 'grant-1' });

    const response = await PATCH(request('PATCH', cookieValue, { landingPreference: 'HOME' }));
    const updatedCookie = response.cookies.get(DEVICE_ACCESS_COOKIE)?.value;

    expect(response.status).toBe(200);
    expect(verifyDeviceAccessCookieValue(updatedCookie, now)?.landingPreference).toBe('HOME');
  });

  it('clears an invalid device cookie instead of recognizing the browser', async () => {
    const response = await GET(request('GET', 'tampered-token'));

    await expect(response.json()).resolves.toEqual({ knownDevice: false, landingPreference: 'ASK' });
    expect(response.cookies.get(DEVICE_ACCESS_COOKIE)?.value).toBe('');
    expect(mocks.validateDeviceAccess).not.toHaveBeenCalled();
  });
});
