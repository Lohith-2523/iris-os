import { redirect } from 'next/navigation';
import DashboardClient from './dashboard-client';
import { canRenderRequestRoute, getRequestSecurityContext } from '@/server/security/request-security-context';
import { getDashboardReadModel } from '@/server/read-models/workspace-pages';

export default async function DashboardPage() {
  const ctx = await getRequestSecurityContext();
  if (!ctx) redirect('/login');
  if (!canRenderRequestRoute(ctx, '/dashboard')) return null;
  return <DashboardClient initialData={await getDashboardReadModel(ctx)} />;
}
