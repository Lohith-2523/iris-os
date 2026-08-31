import { redirect } from 'next/navigation';
import SecurityUsersClient from './security-client';
import { canRenderRequestRoute, getRequestSecurityContext } from '@/server/security/request-security-context';
import { getSecurityUsersReadModel } from '@/server/domains/security-read-service';

export default async function SecurityUsersPage() {
  const ctx = await getRequestSecurityContext();
  if (!ctx) redirect('/login');
  if (!canRenderRequestRoute(ctx, '/settings/security')) return null;
  if (ctx.role.toLowerCase() !== 'admin') redirect('/settings');
  return <SecurityUsersClient initialData={await getSecurityUsersReadModel(ctx)} />;
}
