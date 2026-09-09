import { isDeliveryTeamMember } from './team-member-access';

export type WorkspaceRouteRestriction = 'admin' | 'sub_admin' | 'member' | 'client' | null;

type WorkspacePrincipal = {
  role: string;
  plan: string;
  accessPermissions?: string[] | null;
  deliveryWorkspace?: boolean;
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

  if (role === 'sub_admin') {
    const routePermission = pathname.split('/').filter(Boolean)[0] || 'dashboard';
    const teamWorkspacePage = isDeliveryTeamMember(principal) && (
      pathname === '/teams-dashboard'
      || pathname === '/tasks'
      || pathname === '/calendar'
      || (messagingAllowed && pathname === '/messages')
    );
    const assignedPage = (principal.accessPermissions || []).includes(routePermission);
    return pathname === '/settings' || teamWorkspacePage || assignedPage ? null : 'sub_admin';
  }

  if (role === 'admin' && ['/client-dashboard', '/client-leads', '/teams-dashboard'].includes(pathname)) {
    return 'admin';
  }

  return null;
}

export function canRenderWorkspaceRoute(principal: WorkspacePrincipal, pathname: string) {
  return workspaceRouteRestriction(principal, pathname) === null;
}
