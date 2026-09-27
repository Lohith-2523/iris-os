'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { isWorkspaceThemePath } from '@/lib/theme-routes';
import { applyWorkspaceTheme, readWorkspaceTheme } from '@/lib/workspace-theme';

export function RouteThemeSync() {
  const pathname = usePathname();

  React.useLayoutEffect(() => {
    applyWorkspaceTheme(isWorkspaceThemePath(pathname) ? readWorkspaceTheme() : 'dark');
  }, [pathname]);

  return null;
}
