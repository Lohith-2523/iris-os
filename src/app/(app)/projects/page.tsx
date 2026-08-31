import { redirect } from 'next/navigation';
import ProjectsClient from './projects-client';
import { canRenderRequestRoute, getRequestSecurityContext } from '@/server/security/request-security-context';
import { getProjectsReadModel } from '@/server/read-models/workspace-pages';

export default async function ProjectsPage() {
  const ctx = await getRequestSecurityContext();
  if (!ctx) redirect('/login');
  if (!canRenderRequestRoute(ctx, '/projects')) return null;
  return <ProjectsClient initialData={await getProjectsReadModel(ctx)} />;
}
