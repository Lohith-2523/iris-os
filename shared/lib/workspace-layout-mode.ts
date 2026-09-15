'use client';

import * as React from 'react';

export type WorkspaceLayoutMode =
  | 'compact-phone'
  | 'standard-phone'
  | 'large-phone'
  | 'small-tablet'
  | 'tablet-portrait'
  | 'tablet-landscape'
  | 'large-tablet'
  | 'compact'
  | 'standard'
  | 'wide'
  | 'large'
  | 'ultrawide';

export type WorkspaceLayoutFamily = 'dashboard' | 'planner' | 'records' | 'studio' | 'settings';

const WORKSPACE_FAMILIES: Record<WorkspaceLayoutFamily, ReadonlySet<string>> = {
  dashboard: new Set(['dashboard', 'client-dashboard', 'teams-dashboard', 'analytics', 'finance', 'reporting']),
  planner: new Set(['calendar', 'tasks', 'projects', 'team']),
  records: new Set(['clients', 'client-leads', 'agency-leads', 'invoices', 'proposals', 'messages']),
  studio: new Set(['atlas', 'strategy', 'documents', 'explorer']),
  settings: new Set(['settings']),
};

export function resolveWorkspaceLayoutFamily(pathname: string): WorkspaceLayoutFamily {
  const route = pathname.split('/').filter(Boolean)[0] || 'dashboard';
  for (const [family, routes] of Object.entries(WORKSPACE_FAMILIES) as [WorkspaceLayoutFamily, ReadonlySet<string>][]) {
    if (routes.has(route)) return family;
  }
  return 'records';
}

export function resolveWorkspaceViewportHeight(viewport: {
  innerHeight: number;
  visualViewport?: { height: number } | null;
}): number {
  const visualHeight = viewport.visualViewport?.height;
  return Number.isFinite(visualHeight) && visualHeight && visualHeight > 0
    ? Math.round(visualHeight)
    : Math.round(viewport.innerHeight);
}

export function resolveWorkspaceLayoutMode(
  width: number,
  height: number,
  options: { coarsePointer?: boolean } = {},
): WorkspaceLayoutMode {
  if (width < 360) return 'compact-phone';
  if (width < 414) return 'standard-phone';
  if (width < 600) return 'large-phone';
  if (width < 768) return 'small-tablet';

  const isPortrait = height >= width;
  if (width < 900) return isPortrait ? 'tablet-portrait' : 'tablet-landscape';
  if (width < 1200) return isPortrait ? 'large-tablet' : 'tablet-landscape';
  if (options.coarsePointer && width < 1440) return isPortrait ? 'large-tablet' : 'tablet-landscape';

  const aspectRatio = width / Math.max(height, 1);
  if (aspectRatio >= 2) return 'ultrawide';
  if (width >= 2200) return 'large';
  if (width >= 1600) return 'wide';
  return 'standard';
}

function readViewportMode(): WorkspaceLayoutMode {
  if (typeof window === 'undefined') return 'standard';
  return resolveWorkspaceLayoutMode(window.innerWidth, window.innerHeight, {
    coarsePointer: window.matchMedia('(pointer: coarse)').matches,
  });
}

export function useWorkspaceLayoutMode(): WorkspaceLayoutMode {
  const [mode, setMode] = React.useState<WorkspaceLayoutMode>('standard');

  React.useEffect(() => {
    let frame = 0;
    const update = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        document.documentElement.style.setProperty(
          '--workspace-viewport-height',
          `${resolveWorkspaceViewportHeight(window)}px`,
        );
        setMode(readViewportMode());
      });
    };

    update();
    window.addEventListener('resize', update, { passive: true });
    window.addEventListener('orientationchange', update, { passive: true });
    window.visualViewport?.addEventListener('resize', update, { passive: true });
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      window.visualViewport?.removeEventListener('resize', update);
      document.documentElement.style.removeProperty('--workspace-viewport-height');
    };
  }, []);

  return mode;
}
