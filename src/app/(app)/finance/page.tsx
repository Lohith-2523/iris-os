import { redirect } from 'next/navigation';
import FinanceClient from './finance-client';
import { canRenderRequestRoute, getRequestSecurityContext } from '@/server/security/request-security-context';
import { getFinanceReadModel } from '@/server/read-models/workspace-pages';

export default async function FinancePage() {
  const ctx = await getRequestSecurityContext();
  if (!ctx) redirect('/login');
  if (!canRenderRequestRoute(ctx, '/finance')) return null;
  return <FinanceClient initialData={await getFinanceReadModel(ctx)} />;
}
