import { isProfileAvatarTemplate } from '@/lib/profile-avatar-templates';

export const MAX_PROFILE_AVATAR_BYTES = 512 * 1024;

const PROFILE_AVATAR_ERROR = 'Profile pictures must be PNG, JPEG, or WebP images.';

export function validateProfileAvatarDataUrl(value: unknown) {
  if (value === null || value === undefined || value === '') {
    return { value: null as string | null };
  }
  if (typeof value !== 'string') return { error: PROFILE_AVATAR_ERROR };
  if (isProfileAvatarTemplate(value)) return { value };

  const match = value.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!match) return { error: PROFILE_AVATAR_ERROR };

  const bytes = Buffer.from(match[2], 'base64');
  if (bytes.length === 0 || bytes.length > MAX_PROFILE_AVATAR_BYTES) {
    return { error: 'Profile pictures must be 512 KB or smaller.' };
  }

  const isPng = bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const isJpeg = bytes[0] === 0xff
    && bytes[1] === 0xd8
    && bytes[bytes.length - 2] === 0xff
    && bytes[bytes.length - 1] === 0xd9;
  const isWebp = bytes.subarray(0, 4).toString('ascii') === 'RIFF'
    && bytes.subarray(8, 12).toString('ascii') === 'WEBP';
  const mime = match[1];

  if (
    (mime === 'image/png' && !isPng)
    || (mime === 'image/jpeg' && !isJpeg)
    || (mime === 'image/webp' && !isWebp)
  ) {
    return { error: 'Profile picture contents do not match the selected image type.' };
  }

  return { value };
}
