export const workspaceThemePaths = [
  '/agency-leads',
  '/analytics',
  '/calendar',
  '/client-dashboard',
  '/clients',
  '/dashboard',
  '/explorer',
  '/finance',
  '/prism',
  '/projects',
  '/reporting',
  '/settings',
  '/tasks',
  '/team',
  '/teams-dashboard',
] as const;

export function isWorkspaceThemePath(pathname: string) {
  return workspaceThemePaths.some(
    (workspacePath) => pathname === workspacePath || pathname.startsWith(`${workspacePath}/`)
  );
}
