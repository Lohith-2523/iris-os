export const MAX_CLIENT_LOGO_BYTES = 512 * 1024;

export function validateClientLogoDataUrl(value: unknown) {
  if (value === null || value === undefined || value === '') {
    return { value: null as string | null };
  }
  if (typeof value !== 'string') return { error: 'Client company logo must be an image.' };
  const match = value.match(/^data:(image\/(?:png|jpeg));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return { error: 'Client company logo must be a PNG or JPEG image.' };

  const bytes = Buffer.from(match[2], 'base64');
  if (bytes.length === 0 || bytes.length > MAX_CLIENT_LOGO_BYTES) {
    return { error: 'Client company logo must be 512 KB or smaller.' };
  }

  const isPng = bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[bytes.length - 2] === 0xff && bytes[bytes.length - 1] === 0xd9;
  if ((match[1] === 'image/png' && !isPng) || (match[1] === 'image/jpeg' && !isJpeg)) {
    return { error: 'Client company logo contents do not match the selected image type.' };
  }

  return { value };
}
