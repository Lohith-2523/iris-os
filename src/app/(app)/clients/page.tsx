import { redirect } from 'next/navigation';
import ClientsClient from './clients-client';
import { canRenderRequestRoute, getRequestSecurityContext } from '@/server/security/request-security-context';
import { getClientsReadModel } from '@/server/read-models/workspace-pages';

export default async function ClientsPage() {
  const ctx = await getRequestSecurityContext();
  if (!ctx) redirect('/login');
  if (!canRenderRequestRoute(ctx, '/clients')) return null;
  return <ClientsClient initialData={await getClientsReadModel(ctx)} />;
}
