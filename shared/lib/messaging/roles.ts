export function isMessagingTeamRole(role: string) {
  const normalizedRole = role.toLowerCase();
  return normalizedRole === 'member' || normalizedRole === 'sub_admin';
}

export function isAllowedDirectPair(roleA: string, roleB: string) {
  const normalizedRoles = [roleA, roleB].map((role) => {
    const normalizedRole = role.toLowerCase();
    return isMessagingTeamRole(normalizedRole) ? 'member' : normalizedRole;
  });
  const roles = new Set(normalizedRoles);
  return roles.has('admin') && (roles.has('client') || roles.has('member')) && roles.size === 2;
}

export function messagingDirectoryRolesFor(role: string) {
  return role.toLowerCase() === 'admin' ? ['client', 'member', 'sub_admin'] : ['admin'];
}
