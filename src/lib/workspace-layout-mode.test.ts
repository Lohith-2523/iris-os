import { describe, expect, it } from 'vitest';
import {
  resolveWorkspaceLayoutFamily,
  resolveWorkspaceLayoutMode,
  resolveWorkspaceViewportHeight,
} from './workspace-layout-mode';

describe('resolveWorkspaceViewportHeight', () => {
  it('uses the visible viewport when browser chrome reduces the usable height', () => {
    expect(resolveWorkspaceViewportHeight({
      innerHeight: 844,
      visualViewport: { height: 713.6 },
    })).toBe(714);
  });

  it('falls back to the layout viewport on older browsers', () => {
    expect(resolveWorkspaceViewportHeight({ innerHeight: 568 })).toBe(568);
  });
});

describe('resolveWorkspaceLayoutMode', () => {
  it.each([
    [320, 568, 'compact-phone'],
    [360, 640, 'standard-phone'],
    [390, 844, 'standard-phone'],
    [414, 896, 'large-phone'],
    [480, 960, 'large-phone'],
    [600, 960, 'small-tablet'],
    [720, 1024, 'small-tablet'],
    [768, 1024, 'tablet-portrait'],
    [834, 1194, 'tablet-portrait'],
    [1024, 768, 'tablet-landscape'],
    [1180, 820, 'tablet-landscape'],
    [1024, 1366, 'large-tablet'],
    [1280, 720, 'standard'],
    [1280, 800, 'standard'],
    [1366, 768, 'standard'],
    [1440, 900, 'standard'],
    [1440, 960, 'standard'],
    [1512, 982, 'standard'],
    [1536, 864, 'standard'],
    [1536, 960, 'standard'],
    [1728, 1117, 'wide'],
    [1920, 1080, 'wide'],
    [1920, 1200, 'wide'],
    [1920, 1280, 'wide'],
    [2560, 1440, 'large'],
    [2560, 1600, 'large'],
    [2560, 1080, 'ultrawide'],
    [3440, 1440, 'ultrawide'],
    [3840, 1600, 'ultrawide'],
  ] as const)('maps %sx%s to %s', (width, height, expected) => {
    expect(resolveWorkspaceLayoutMode(width, height)).toBe(expected);
  });

  it.each([
    [1280, 800, 'tablet-landscape'],
    [1366, 1024, 'tablet-landscape'],
  ] as const)('maps coarse-pointer %sx%s to %s', (width, height, expected) => {
    expect(resolveWorkspaceLayoutMode(width, height, { coarsePointer: true })).toBe(expected);
  });
});

describe('resolveWorkspaceLayoutFamily', () => {
  it.each([
    ['/dashboard', 'dashboard'],
    ['/client-dashboard', 'dashboard'],
    ['/calendar', 'planner'],
    ['/clients/onboard', 'records'],
    ['/documents', 'studio'],
    ['/settings/security', 'settings'],
  ] as const)('maps %s to %s', (pathname, expected) => {
    expect(resolveWorkspaceLayoutFamily(pathname)).toBe(expected);
  });
});
