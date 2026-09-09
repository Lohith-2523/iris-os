export const PROFILE_AVATAR_TEMPLATE_PREFIX = 'iris-avatar:';

export const PROFILE_AVATAR_TEMPLATES = [
  { id: 'iris-avatar:ink', label: 'Ink' },
  { id: 'iris-avatar:crop', label: 'Crop' },
  { id: 'iris-avatar:waves', label: 'Waves' },
  { id: 'iris-avatar:bob', label: 'Bob' },
  { id: 'iris-avatar:curls', label: 'Curls' },
  { id: 'iris-avatar:buzz', label: 'Buzz' },
] as const;

export type ProfileAvatarTemplateId = typeof PROFILE_AVATAR_TEMPLATES[number]['id'];

const templateIds = new Set<string>(PROFILE_AVATAR_TEMPLATES.map((template) => template.id));

export function isProfileAvatarTemplate(value: unknown): value is ProfileAvatarTemplateId {
  return typeof value === 'string' && templateIds.has(value);
}

export function defaultProfileAvatarTemplate(seed: string) {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = ((hash << 5) - hash + seed.charCodeAt(index)) | 0;
  }
  return PROFILE_AVATAR_TEMPLATES[Math.abs(hash) % PROFILE_AVATAR_TEMPLATES.length].id;
}
