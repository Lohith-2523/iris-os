export const PROFILE_AVATAR_TEMPLATE_PREFIX = 'iris-avatar:';

export const PROFILE_AVATAR_TEMPLATES = [
  { id: 'iris-avatar:ink', label: 'Alex', seed: 'Alexander' },
  { id: 'iris-avatar:crop', label: 'Maya', seed: 'Aneka' },
  { id: 'iris-avatar:waves', label: 'Jordan', seed: 'Christian' },
  { id: 'iris-avatar:bob', label: 'Amara', seed: 'Amaya' },
  { id: 'iris-avatar:curls', label: 'Theo', seed: 'Aidan' },
  { id: 'iris-avatar:buzz', label: 'Nora', seed: 'Andrea' },
] as const;

export type ProfileAvatarTemplateId = typeof PROFILE_AVATAR_TEMPLATES[number]['id'];

const templateIds = new Set<string>(PROFILE_AVATAR_TEMPLATES.map((template) => template.id));

export function isProfileAvatarTemplate(value: unknown): value is ProfileAvatarTemplateId {
  return typeof value === 'string' && templateIds.has(value);
}

export function profileAvatarTemplateUrl(id: ProfileAvatarTemplateId) {
  const template = PROFILE_AVATAR_TEMPLATES.find((item) => item.id === id);
  return `https://api.dicebear.com/10.x/notionists/svg?seed=${encodeURIComponent(template?.seed || id)}`;
}

export function defaultProfileAvatarTemplate(seed: string) {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = ((hash << 5) - hash + seed.charCodeAt(index)) | 0;
  }
  return PROFILE_AVATAR_TEMPLATES[Math.abs(hash) % PROFILE_AVATAR_TEMPLATES.length].id;
}
