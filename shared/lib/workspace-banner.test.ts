import { describe, expect, it } from 'vitest';
import {
  WORKSPACE_BANNER_HEIGHT,
  WORKSPACE_BANNER_RATIO,
  WORKSPACE_BANNER_WIDTH,
  resolveWorkspaceBannerPosition,
  resolveWorkspaceBannerZoom,
} from './workspace-banner';

describe('workspace banner', () => {
  it('uses the native dimensions of the default IrisOS banner', () => {
    expect(WORKSPACE_BANNER_WIDTH).toBe(2503);
    expect(WORKSPACE_BANNER_HEIGHT).toBe(603);
    expect(WORKSPACE_BANNER_RATIO).toBe(2503 / 603);
  });

  it('normalizes banner positions and zoom values', () => {
    expect(resolveWorkspaceBannerPosition(undefined)).toEqual({ x: 50, y: 50 });
    expect(resolveWorkspaceBannerPosition({ x: -20, y: 140 })).toEqual({ x: 0, y: 100 });
    expect(resolveWorkspaceBannerZoom(undefined)).toBe(1);
    expect(resolveWorkspaceBannerZoom(0.1)).toBe(0.5);
    expect(resolveWorkspaceBannerZoom(8)).toBe(4);
  });
});
