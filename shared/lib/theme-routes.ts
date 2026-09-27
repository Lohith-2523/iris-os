export const workspaceThemePaths = [
  '/agency-leads',
  '/analytics',
  '/calendar',
  '/client-dashboard',
  '/client-projects',
  '/client-documents',
  '/client-deliverables',
  '/client-leads',
  '/clients',
  '/dashboard',
  '/explorer',
  '/finance',
  '/invoices',
  '/proposals',
  '/documents',
  '/messages',
  '/atlas',
  '/projects',
  '/reporting',
  '/settings',
  '/strategy',
  '/tasks',
  '/team',
  '/teams-dashboard',
] as const;

export function isWorkspaceThemePath(pathname: string) {
  return workspaceThemePaths.some(
    (workspacePath) => pathname === workspacePath || pathname.startsWith(`${workspacePath}/`)
  );
}
