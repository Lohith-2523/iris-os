import 'server-only';

import { prisma } from '@/lib/db';
import { createClient } from '@/lib/server';
import { hasSuperadminAccess, SUPERADMIN_OWNER_EMAIL } from '@/admin/policy';

export type SuperadminIdentity = {
  email: string;
  name: string;
  avatarUrl: string | null;
  role: 'OWNER' | 'EDITOR' | 'VIEWER';
};

export async function getSuperadmin(): Promise<SuperadminIdentity | null> {
  const { data: { user }, error } = await (await createClient()).auth.getUser();
  const email = user?.email?.trim().toLowerCase();
  if (error || !user || !email || !user.email_confirmed_at) return null;
  const metadata = user.user_metadata ?? {};
  const name = typeof metadata.full_name === 'string' && metadata.full_name.trim()
    ? metadata.full_name.trim()
    : email.split('@')[0];
  const avatarUrl = typeof metadata.avatar_url === 'string' && metadata.avatar_url.trim()
    ? metadata.avatar_url
    : null;
  if (email === SUPERADMIN_OWNER_EMAIL) return { email, name, avatarUrl, role: 'OWNER' };

  const grant = await prisma.adminAccess.findUnique({ where: { email } });
  if (!hasSuperadminAccess(email, true, grant)) return null;
  if (!grant!.acceptedAt) {
    await prisma.adminAccess.updateMany({
      where: { email, acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
      data: { acceptedAt: new Date() },
    });
  }
  return { email, name, avatarUrl, role: grant!.role === 'EDITOR' ? 'EDITOR' : 'VIEWER' };
}
