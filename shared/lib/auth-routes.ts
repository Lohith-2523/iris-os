export const AUTH_CALLBACK_PATH = '/auth/callback';
export const FORGOT_PASSWORD_PATH = '/forgot-password';
export const RESET_PASSWORD_PATH = '/reset-password';
export const ADMIN_FORGOT_PASSWORD_PATH = '/admin/forgot-password';
export const ADMIN_RESET_PASSWORD_PATH = '/admin/reset-password';
export const LOGIN_PATH = '/login';
export const PASSWORD_RECOVERY_COOKIE = 'iris_password_recovery';
export const PASSWORD_RECOVERY_COOKIE_VALUE = 'verified';

export function isPasswordRecoveryExchange(next: string, redirectType: string | null | undefined) {
  return (next === RESET_PASSWORD_PATH || next === ADMIN_RESET_PASSWORD_PATH) && redirectType === 'recovery';
}

export function canAccessPasswordReset(pathname: string, hasUser: boolean, recoveryGrant?: string) {
  return ![RESET_PASSWORD_PATH, ADMIN_RESET_PASSWORD_PATH].includes(pathname) || (
    hasUser && recoveryGrant === PASSWORD_RECOVERY_COOKIE_VALUE
  );
}

export function passwordRecoveryFailurePath(pathname: string) {
  return pathname === ADMIN_RESET_PASSWORD_PATH ? ADMIN_FORGOT_PASSWORD_PATH : FORGOT_PASSWORD_PATH;
}

export function passwordRecoveryRedirectUrl(origin: string) {
  const callbackUrl = new URL(AUTH_CALLBACK_PATH, origin);
  callbackUrl.searchParams.set('next', RESET_PASSWORD_PATH);
  return callbackUrl.toString();
}

export function adminPasswordRecoveryRedirectUrl(origin: string) {
  const callbackUrl = new URL(AUTH_CALLBACK_PATH, origin);
  callbackUrl.searchParams.set('next', ADMIN_RESET_PASSWORD_PATH);
  return callbackUrl.toString();
}
