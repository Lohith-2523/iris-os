export function canShowAtlasLauncher(role?: string | null) {
  if (!role) return false;
  return !['client', 'member'].includes(role.toLowerCase());
}
