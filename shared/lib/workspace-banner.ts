export const WORKSPACE_BANNER_WIDTH = 2503;
export const WORKSPACE_BANNER_HEIGHT = 603;
export const WORKSPACE_BANNER_RATIO = WORKSPACE_BANNER_WIDTH / WORKSPACE_BANNER_HEIGHT;

export type WorkspaceBannerPosition = { x: number; y: number };

export function resolveWorkspaceBannerPosition(value: unknown): WorkspaceBannerPosition {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { x: 50, y: 50 };
  const candidate = value as Record<string, unknown>;
  const x = Number(candidate.x);
  const y = Number(candidate.y);
  return {
    x: Number.isFinite(x) ? Math.min(100, Math.max(0, x)) : 50,
    y: Number.isFinite(y) ? Math.min(100, Math.max(0, y)) : 50,
  };
}

export function resolveWorkspaceBannerZoom(value: unknown) {
  const zoom = Number(value);
  return Number.isFinite(zoom) ? Math.min(4, Math.max(0.5, zoom)) : 1;
}
