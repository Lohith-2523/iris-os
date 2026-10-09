import type { SecurityAllowedPage } from './security-pages';

type WorkspacePagePrincipal = {
  role: string;
  accessPermissions?: unknown;
};

export function canManageWorkspacePage(principal: WorkspacePagePrincipal, page: SecurityAllowedPage) {
  const role = principal.role.toLowerCase();
  if (role === 'admin') return true;
  return role === 'sub_admin'
    && Array.isArray(principal.accessPermissions)
    && principal.accessPermissions.includes(page);
}
