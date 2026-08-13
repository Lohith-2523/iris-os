export interface ClientOnboardingInviteRecord {
  email: string;
  token: string;
  used: boolean;
  expiresAt: Date;
}

export function serializeClientOnboardingInvite(
  invite: ClientOnboardingInviteRecord | undefined,
  canView: boolean,
  now = Date.now(),
) {
  if (!canView || !invite) return null;

  return {
    email: invite.email,
    path: `/invite?token=${encodeURIComponent(invite.token)}`,
    status: invite.used ? 'COMPLETED' : invite.expiresAt.getTime() <= now ? 'EXPIRED' : 'PENDING',
    expiresAt: invite.expiresAt.toISOString(),
  } as const;
}
