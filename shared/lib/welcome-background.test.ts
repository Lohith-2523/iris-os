import { describe, expect, it } from 'vitest';
import { validateWelcomeBackgroundDataUrl } from './welcome-background';

describe('validateWelcomeBackgroundDataUrl', () => {
  it('accepts a matching PNG data URL and normalizes an empty value', () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(validateWelcomeBackgroundDataUrl(`data:image/png;base64,${png.toString('base64')}`)).toEqual({ value: `data:image/png;base64,${png.toString('base64')}` });
    expect(validateWelcomeBackgroundDataUrl('')).toEqual({ value: null });
  });

  it('rejects mismatched image contents', () => {
    expect(validateWelcomeBackgroundDataUrl('data:image/png;base64,AAECAw==')).toEqual({ error: 'The banner file contents do not match its image type.' });
  });
});
