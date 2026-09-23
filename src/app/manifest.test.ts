import { describe, expect, it } from 'vitest';
import manifest from './manifest';

describe('IrisOS web app manifest', () => {
  it('defines an installable standalone desktop experience', () => {
    const value = manifest();

    expect(value.name).toBe('IrisOS');
    expect(value.start_url).toBe('/dashboard');
    expect(value.display).toBe('standalone');
    expect(value.icons).toEqual(expect.arrayContaining([
      expect.objectContaining({ sizes: '192x192', purpose: 'any' }),
      expect.objectContaining({ sizes: '512x512', purpose: 'any' }),
      expect.objectContaining({ sizes: '192x192', purpose: 'maskable' }),
      expect.objectContaining({ sizes: '512x512', purpose: 'maskable' }),
    ]));
  });
});
