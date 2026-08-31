import { redirect } from 'next/navigation';
import TeamClient from './team-client';
import { canRenderRequestRoute, getRequestSecurityContext } from '@/server/security/request-security-context';
import { getTeamReadModel } from '@/server/read-models/workspace-pages';

export default async function TeamPage() {
  const ctx = await getRequestSecurityContext();
  if (!ctx) redirect('/login');
  if (!canRenderRequestRoute(ctx, '/team')) return null;
  return <TeamClient initialData={await getTeamReadModel(ctx)} />;
}
