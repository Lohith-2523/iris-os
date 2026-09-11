export function workspaceRoleLabel(role?: string | null) {
  const value = role?.trim() || '';
  const normalized = value.toLowerCase().replace(/[\s_-]+/g, '');

  if (normalized === 'subadmin') return 'Core member';
  if (normalized === 'admin') return 'Agency admin';
  if (normalized === 'member') return 'Team member';
  if (normalized === 'client') return 'Client';

  return value.replaceAll('_', ' ');
}
