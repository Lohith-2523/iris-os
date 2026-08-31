import { redirect } from 'next/navigation';
import { WorkspaceShell } from '@/components/app-shell/workspace-shell';
import { getRequestSecurityContext } from '@/server/security/request-security-context';
import { getWorkspaceReadModel } from '@/server/workspace/workspace-service';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getRequestSecurityContext();
  if (!ctx) redirect('/login');

  const workspace = await getWorkspaceReadModel(ctx);
  return <WorkspaceShell initialWorkspace={workspace}>{children}</WorkspaceShell>;
}
