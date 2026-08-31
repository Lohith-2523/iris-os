export type WorkspaceRouteRestriction = 'admin' | 'sub_admin' | 'member' | 'client' | null;

type WorkspacePrincipal = {
  role: string;
  plan: string;
  accessPermissions?: string[] | null;
};

export function workspaceRouteRestriction(
  principal: WorkspacePrincipal,
  pathname: string,
): WorkspaceRouteRestriction {
  const role = principal.role.toLowerCase();
  const messagingAllowed = principal.plan !== 'BASIC';

  if (role === 'client') {
    const allowed = pathname === '/client-dashboard'
      || pathname === '/client-leads'
      || pathname === '/clients/onboard'
      || pathname === '/settings'
      || pathname === '/calendar'
      || (messagingAllowed && pathname === '/messages');
    return allowed ? null : 'client';
  }

  if (role === 'member') {
    const allowed = pathname === '/teams-dashboard'
      || pathname === '/tasks'
      || pathname === '/settings'
      || pathname === '/calendar'
      || (messagingAllowed && pathname === '/messages');
    return allowed ? null : 'member';
  }

  if (role === 'admin' && ['/client-dashboard', '/client-leads', '/teams-dashboard'].includes(pathname)) {
    return 'admin';
  }

  const routePermission = pathname.split('/').filter(Boolean)[0] || 'dashboard';
  if (role === 'sub_admin'
    && pathname !== '/settings'
    && !(principal.accessPermissions || []).includes(routePermission)) {
    return 'sub_admin';
  }

  return null;
}

export function canRenderWorkspaceRoute(principal: WorkspacePrincipal, pathname: string) {
  return workspaceRouteRestriction(principal, pathname) === null;
}
