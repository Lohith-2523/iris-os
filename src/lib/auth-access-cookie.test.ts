import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDeviceAccessCookieValue, verifyDeviceAccessCookieValue } from './auth-access-cookie';

describe('device access cookie', () => {
  beforeEach(() => vi.stubEnv('AUTH_ACCESS_SECRET', 'test-auth-access-secret-that-is-long-enough'));

  it('accepts an intact unexpired grant and rejects tampering', () => {
    const expiresAt = new Date('2030-01-01T00:00:00.000Z');
    const value = createDeviceAccessCookieValue('grant-1', 'random-token', expiresAt);
    expect(verifyDeviceAccessCookieValue(value, new Date('2029-01-01T00:00:00.000Z'))).toMatchObject({ grantId: 'grant-1', rawToken: 'random-token' });
    expect(verifyDeviceAccessCookieValue(value.replace('random-token', 'other-token'), new Date('2029-01-01T00:00:00.000Z'))).toBeNull();
  });

  it('rejects expired grants', () => {
    const value = createDeviceAccessCookieValue('grant-1', 'random-token', new Date('2028-01-01T00:00:00.000Z'));
    expect(verifyDeviceAccessCookieValue(value, new Date('2029-01-01T00:00:00.000Z'))).toBeNull();
  });
});
