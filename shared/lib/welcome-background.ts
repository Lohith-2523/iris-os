const MAX_WELCOME_BACKGROUND_BYTES = 2 * 1024 * 1024;

export function validateWelcomeBackgroundDataUrl(value: unknown): { value: string | null } | { error: string } {
  if (value === null || value === undefined || value === '') return { value: null };
  if (typeof value !== 'string') return { error: 'Banner images must be PNG, JPEG, or WebP files.' };
  const match = value.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!match) return { error: 'Banner images must be PNG, JPEG, or WebP files.' };
  const bytes = Buffer.from(match[2], 'base64');
  if (bytes.length === 0 || bytes.length > MAX_WELCOME_BACKGROUND_BYTES) {
    return { error: 'Banner images must be no larger than 2 MB after processing.' };
  }
  const isPng = bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[bytes.length - 2] === 0xff && bytes[bytes.length - 1] === 0xd9;
  const isWebp = bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP';
  const valid = (match[1] === 'image/png' && isPng) || (match[1] === 'image/jpeg' && isJpeg) || (match[1] === 'image/webp' && isWebp);
  return valid ? { value } : { error: 'The banner file contents do not match its image type.' };
}
