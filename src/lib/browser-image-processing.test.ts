import { describe, expect, it } from 'vitest';
import { calculateImageGeometry, MAX_SOURCE_IMAGE_BYTES } from './browser-image-processing';

describe('browser image processing geometry', () => {
  it('accepts source images up to 10 MB', () => {
    expect(MAX_SOURCE_IMAGE_BYTES).toBe(10 * 1024 * 1024);
  });

  it('preserves the complete profile picture at its original aspect ratio', () => {
    expect(calculateImageGeometry(2400, 1600, 'profile-avatar')).toEqual({
      sourceX: 0,
      sourceY: 0,
      sourceWidth: 2400,
      sourceHeight: 1600,
      outputWidth: 2400,
      outputHeight: 1600,
    });
  });

  it('preserves invoice-logo aspect ratio within its output bounds', () => {
    expect(calculateImageGeometry(2400, 800, 'invoice-logo')).toEqual({
      sourceX: 0,
      sourceY: 0,
      sourceWidth: 2400,
      sourceHeight: 800,
      outputWidth: 1200,
      outputHeight: 400,
    });
  });

  it('center-crops welcome backgrounds to the dashboard card ratio', () => {
    expect(calculateImageGeometry(2400, 1600, 'welcome-background')).toEqual({
      sourceX: 0,
      sourceY: 320,
      sourceWidth: 2400,
      sourceHeight: 960,
      outputWidth: 1600,
      outputHeight: 640,
    });
  });
});
