import { describe, expect, it } from 'vitest';
import { CLIENT_BRAND_COLOR_PALETTE, defaultClientBrandColor, pickRandomClientBrandColor, resolveClientBrandColor } from './client-brand-color';

describe('client brand colours', () => {
  it('keeps legacy client colours stable by client id', () => {
    expect(defaultClientBrandColor('client-a')).toBe(defaultClientBrandColor('client-a'));
    expect(CLIENT_BRAND_COLOR_PALETTE).toContain(defaultClientBrandColor('client-a'));
  });

  it('prefers an unused colour during onboarding', () => {
    const used = CLIENT_BRAND_COLOR_PALETTE.slice(0, -1);
    expect(pickRandomClientBrandColor(used, 0.5)).toBe(CLIENT_BRAND_COLOR_PALETTE.at(-1));
  });

  it('uses a saved client selection over the generated default', () => {
    expect(resolveClientBrandColor({ brandColor: '#abcdef' }, 'client-a')).toBe('#ABCDEF');
  });
});
