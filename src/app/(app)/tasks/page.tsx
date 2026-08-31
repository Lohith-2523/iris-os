import { redirect } from 'next/navigation';
import TasksClient from './tasks-client';
import { canRenderRequestRoute, getRequestSecurityContext } from '@/server/security/request-security-context';
import { getTasksReadModel } from '@/server/read-models/workspace-pages';

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string }>;
}) {
  const ctx = await getRequestSecurityContext();
  if (!ctx) redirect('/login');
  if (!canRenderRequestRoute(ctx, '/tasks')) return null;
  const { projectId } = await searchParams;
  return <TasksClient initialData={await getTasksReadModel(ctx, projectId)} />;
}
