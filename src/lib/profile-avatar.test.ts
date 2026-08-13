import { describe, expect, it } from 'vitest';
import { MAX_PROFILE_AVATAR_BYTES, validateProfileAvatarDataUrl } from './profile-avatar';

function dataUrl(mime: string, bytes: number[]) {
  return `data:${mime};base64,${Buffer.from(bytes).toString('base64')}`;
}

describe('profile avatar validation', () => {
  it('accepts supported image data whose signature matches its MIME type', () => {
    const png = dataUrl('image/png', [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const jpeg = dataUrl('image/jpeg', [0xff, 0xd8, 0xff, 0xd9]);
    const webp = dataUrl('image/webp', [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);

    expect(validateProfileAvatarDataUrl(png)).toEqual({ value: png });
    expect(validateProfileAvatarDataUrl(jpeg)).toEqual({ value: jpeg });
    expect(validateProfileAvatarDataUrl(webp)).toEqual({ value: webp });
  });

  it('allows the current user to remove their profile picture', () => {
    expect(validateProfileAvatarDataUrl(null)).toEqual({ value: null });
  });

  it('rejects active, mismatched, and oversized content', () => {
    expect(validateProfileAvatarDataUrl(dataUrl('image/svg+xml', [1, 2, 3]))).toHaveProperty('error');
    expect(validateProfileAvatarDataUrl(dataUrl('image/png', [0xff, 0xd8, 0xff, 0xd9]))).toHaveProperty('error');
    expect(validateProfileAvatarDataUrl(dataUrl('image/png', new Array(MAX_PROFILE_AVATAR_BYTES + 1).fill(0)))).toHaveProperty('error');
  });
});
