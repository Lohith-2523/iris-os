'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/client';
import { isWorkspaceThemePath } from '@/lib/theme-routes';
import { applyWorkspaceTheme, readWorkspaceTheme } from '@/lib/workspace-theme';

export function AuthSync() {
  const supabase = React.useMemo(() => createClient(), []);
  const pathname = usePathname();
  const bootstrapPromise = React.useRef<Promise<void> | null>(null);

  React.useEffect(() => {
    applyWorkspaceTheme(isWorkspaceThemePath(pathname) ? readWorkspaceTheme() : 'dark');
  }, [pathname]);

  React.useEffect(() => {
    // Login and signup explicitly await bootstrap before navigating. Running the
    // global listener there creates a duplicate provisioning request.
    if (pathname === '/login' || pathname === '/signup') return;

    const bootstrap = async (hasSession: boolean) => {
      if (!hasSession) return;
      if (!bootstrapPromise.current) {
        bootstrapPromise.current = fetch('/api/auth/bootstrap', { method: 'POST' })
          .then(() => undefined)
          .finally(() => {
            bootstrapPromise.current = null;
          });
      }
      await bootstrapPromise.current;
    };

    void supabase.auth.getSession().then(({ data }) => bootstrap(Boolean(data.session)));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      void bootstrap(Boolean(session));
    });
    return () => subscription.unsubscribe();
  }, [pathname, supabase]);

  React.useEffect(() => {
    if (!isWorkspaceThemePath(pathname)) return;
    void fetch('/api/activity', { method: 'POST', keepalive: true });
  }, [pathname]);

  return null;
}
