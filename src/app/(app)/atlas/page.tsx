import { redirect } from 'next/navigation';
import AtlasClient from './atlas-client';
import { canRenderRequestRoute, getRequestSecurityContext } from '@/server/security/request-security-context';
import { getAtlasInitialReadModel } from '@/server/domains/atlas-read-service';

export default async function AtlasPage() {
  const ctx = await getRequestSecurityContext();
  if (!ctx) redirect('/login');
  if (!canRenderRequestRoute(ctx, '/atlas')) return null;

  return <AtlasClient initialData={await getAtlasInitialReadModel(ctx)} />;
}
