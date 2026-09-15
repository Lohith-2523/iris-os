import { describe, expect, it } from 'vitest';
import {
  AUTH_CALLBACK_PATH,
  canAccessPasswordReset,
  isPasswordRecoveryExchange,
  passwordRecoveryRedirectUrl,
  RESET_PASSWORD_PATH,
} from './auth-routes';

describe('password recovery routes', () => {
  it('builds the Supabase recovery callback URL', () => {
    const redirectUrl = new URL(passwordRecoveryRedirectUrl('https://irisos.app'));

    expect(redirectUrl.origin).toBe('https://irisos.app');
    expect(redirectUrl.pathname).toBe(AUTH_CALLBACK_PATH);
    expect(redirectUrl.searchParams.get('next')).toBe(RESET_PASSWORD_PATH);
  });

  it('only accepts a Supabase recovery exchange for the reset route', () => {
    expect(isPasswordRecoveryExchange(RESET_PASSWORD_PATH, 'recovery')).toBe(true);
    expect(isPasswordRecoveryExchange(RESET_PASSWORD_PATH, null)).toBe(false);
    expect(isPasswordRecoveryExchange('/dashboard', 'recovery')).toBe(false);
  });

  it('protects the reset page with both a session and recovery grant', () => {
    expect(canAccessPasswordReset(RESET_PASSWORD_PATH, true, 'verified')).toBe(true);
    expect(canAccessPasswordReset(RESET_PASSWORD_PATH, true)).toBe(false);
    expect(canAccessPasswordReset(RESET_PASSWORD_PATH, false, 'verified')).toBe(false);
    expect(canAccessPasswordReset('/login', false)).toBe(true);
  });
});
