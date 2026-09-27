export type TeamMemberAccessPrincipal = {
  role: string;
  plan: string;
  accessPermissions?: string[] | null;
  deliveryWorkspace?: boolean;
};

export const TEAM_WORKSPACE_ROUTES = ['teams-dashboard', 'tasks', 'calendar', 'messages'] as const;

export function isDeliveryTeamMember(principal: Pick<TeamMemberAccessPrincipal, 'role' | 'deliveryWorkspace'>) {
  return principal.role.toLowerCase() === 'member'
    || (principal.role.toLowerCase() === 'sub_admin' && Boolean(principal.deliveryWorkspace));
}

export function teamMemberWorkspaceHome(principal: TeamMemberAccessPrincipal) {
  const role = principal.role.toLowerCase();
  if (role === 'client') return '/client-dashboard';
  if (role === 'admin') return '/dashboard';
  if (isDeliveryTeamMember(principal)) return '/teams-dashboard';

  const permissions = principal.accessPermissions || [];
  const preferred = ['dashboard', 'agency-leads', 'clients', 'projects', 'tasks', 'team', 'calendar', 'messages', 'finance', 'invoices', 'reporting', 'analytics', 'strategy', 'atlas', 'settings'];
  const firstPage = preferred.find((page) => permissions.includes(page));
  return firstPage ? `/${firstPage}` : '/settings';
}

export function hasDeliveryWork(input: {
  handlesDeliverables?: boolean | null;
  projectCount?: number;
  activeTaskCount?: number;
  activeDeliverableCount?: number;
}) {
  return Boolean(input.handlesDeliverables || input.projectCount || input.activeTaskCount || input.activeDeliverableCount);
}
