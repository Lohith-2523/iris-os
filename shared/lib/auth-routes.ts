export const AUTH_CALLBACK_PATH = '/auth/callback';
export const FORGOT_PASSWORD_PATH = '/forgot-password';
export const RESET_PASSWORD_PATH = '/reset-password';
export const LOGIN_PATH = '/login';
export const PASSWORD_RECOVERY_COOKIE = 'iris_password_recovery';
export const PASSWORD_RECOVERY_COOKIE_VALUE = 'verified';

export function isPasswordRecoveryExchange(next: string, redirectType: string | null | undefined) {
  return next === RESET_PASSWORD_PATH && redirectType === 'recovery';
}

export function canAccessPasswordReset(pathname: string, hasUser: boolean, recoveryGrant?: string) {
  return pathname !== RESET_PASSWORD_PATH || (
    hasUser && recoveryGrant === PASSWORD_RECOVERY_COOKIE_VALUE
  );
}

export function passwordRecoveryRedirectUrl(origin: string) {
  const callbackUrl = new URL(AUTH_CALLBACK_PATH, origin);
  callbackUrl.searchParams.set('next', RESET_PASSWORD_PATH);
  return callbackUrl.toString();
}
