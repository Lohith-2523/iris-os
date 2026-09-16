export const SUPERADMIN_OWNER_EMAIL = 'cto.admin@irisos.app';

export function isIrisAdminEmail(email: string) {
  return /^[^@\s]+@irisos\.app$/i.test(email.trim());
}

type Grant = {
  acceptedAt: Date | null;
  expiresAt: Date;
  revokedAt: Date | null;
};

export function hasSuperadminAccess(
  email: string,
  verified: boolean,
  grant: Grant | null,
  now = new Date(),
) {
  const normalized = email.trim().toLowerCase();
  if (!verified || !isIrisAdminEmail(normalized)) return false;
  if (normalized === SUPERADMIN_OWNER_EMAIL) return true;
  return Boolean(grant && !grant.revokedAt && (grant.acceptedAt || grant.expiresAt > now));
}
