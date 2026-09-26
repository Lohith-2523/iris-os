import { describe, expect, it } from 'vitest';
import { MAX_CLIENT_LOGO_BYTES, validateClientLogoDataUrl } from './client-logo';

const dataUrl = (mime: string, bytes: number[]) => `data:${mime};base64,${Buffer.from(bytes).toString('base64')}`;

describe('validateClientLogoDataUrl', () => {
  it('accepts valid PNG and JPEG logos', () => {
    expect(validateClientLogoDataUrl(dataUrl('image/png', [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toHaveProperty('value');
    expect(validateClientLogoDataUrl(dataUrl('image/jpeg', [0xff, 0xd8, 0xff, 0xd9]))).toHaveProperty('value');
  });

  it('accepts removal and rejects invalid or oversized content', () => {
    expect(validateClientLogoDataUrl(null)).toEqual({ value: null });
    expect(validateClientLogoDataUrl(dataUrl('image/png', [0xff, 0xd8, 0xff, 0xd9]))).toHaveProperty('error');
    expect(validateClientLogoDataUrl(dataUrl('image/png', new Array(MAX_CLIENT_LOGO_BYTES + 1).fill(0)))).toHaveProperty('error');
  });
});
