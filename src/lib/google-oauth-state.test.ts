import { describe, expect, it } from 'vitest';
import { createGoogleOAuthState, verifyGoogleOAuthState } from './google-oauth-state';

const secret = 'a-test-secret-that-is-long-enough-for-hmac-signing';
const now = 1_800_000_000_000;
const payload = {
  expiresAt: now + 60_000,
  nonce: 'nonce-that-is-definitely-longer-than-thirty-two-characters',
  orgId: 'org-1',
  returnTo: '/calendar',
  userId: 'user-1',
};

describe('Google OAuth state', () => {
  it('round-trips an unexpired signed payload', () => {
    const state = createGoogleOAuthState(payload, secret);
    expect(verifyGoogleOAuthState(state, secret, now)).toEqual(payload);
  });

  it('rejects tampering and expired payloads', () => {
    const state = createGoogleOAuthState(payload, secret);
    expect(verifyGoogleOAuthState(`${state}tampered`, secret, now)).toBeNull();
    expect(verifyGoogleOAuthState(state, secret, payload.expiresAt)).toBeNull();
  });

  it('rejects protocol-relative return paths', () => {
    const state = createGoogleOAuthState({ ...payload, returnTo: '//attacker.example' }, secret);
    expect(verifyGoogleOAuthState(state, secret, now)).toBeNull();
  });
});
