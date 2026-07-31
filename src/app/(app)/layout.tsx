'use client';

import * as React from 'react';
import { Sidebar } from '@/components/app-shell/sidebar';
import { Topbar } from '@/components/app-shell/topbar';
import { X, Lock, ArrowRight } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { setActiveWorkspaceContext } from '@/lib/utils';
import { setPrismAIWorkspaceScope } from '@/lib/prism-ai/service';
import { DailyBriefingLauncher } from '@/components/daily-briefing/daily-briefing-launcher';
import {
  configureWorkspaceDataCache,
  getWorkspaceDataLoadingSnapshot,
  prepareWorkspaceDataCacheForRouteChange,
  prepareWorkspaceDataCacheForNavigation,
  startWorkspaceDataBackgroundChecks,
  stopWorkspaceDataBackgroundChecks,
  subscribeWorkspaceDataLoading,
  warmWorkspaceDataCache,
  workspaceFetch,
} from '@/lib/workspace-data-cache';

prepareWorkspaceDataCacheForNavigation();

const ADMIN_WORKSPACE_DATA = [
  '/api/workspace',
  '/api/data?domain=dashboard',
  '/api/data?domain=finance',
  '/api/data?domain=clients',
  '/api/data?domain=team',
  '/api/data?domain=reporting',
  '/api/data?domain=operations',
  '/api/tasks',
  '/api/projects',
  '/api/transactions',
  '/api/subscriptions',
  '/api/retainers',
  '/api/agency-leads',
  '/api/calendar',
  '/api/meta-portal',
  '/api/integrations',
  '/api/reports',
  '/api/organization',
  '/api/prism-ai/sessions',
];

function workspaceWarmupUrls(role: string) {
  const normalizedRole = role.toLowerCase();
  if (normalizedRole === 'client') {
    return ['/api/workspace', '/api/meta-portal', '/api/calendar', '/api/integrations'];
  }
  if (normalizedRole === 'member') {
    return ['/api/workspace', '/api/tasks', '/api/projects', '/api/data?domain=team', '/api/calendar', '/api/integrations'];
  }
  return ADMIN_WORKSPACE_DATA;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);
  const pathname = usePathname();
  const router = useRouter();
  
  const [user, setUser] = React.useState<{ id: string; orgId: string; name: string; role: string } | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [isBriefingGateResolved, setIsBriefingGateResolved] = React.useState(false);
  const isWorkspaceDataLoading = React.useSyncExternalStore(
    subscribeWorkspaceDataLoading,
    getWorkspaceDataLoadingSnapshot,
    () => false,
  );

  const fetchUser = React.useCallback(async () => {
    try {
      const res = await fetch('/api/user', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        configureWorkspaceDataCache({ userId: data.id, orgId: data.orgId });
        setPrismAIWorkspaceScope({ userId: data.id, orgId: data.orgId });
        const workspaceRes = await workspaceFetch('/api/workspace');
        if (workspaceRes.ok) {
          const workspace = await workspaceRes.json();
          setActiveWorkspaceContext({ userName: data.name, currency: workspace.organization.currency });
        }
        await warmWorkspaceDataCache(workspaceWarmupUrls(data.role));
      } else if (res.status === 401) {
        configureWorkspaceDataCache(null);
        setPrismAIWorkspaceScope(null);
        router.replace('/login');
      }
    } catch (e) {
      console.error('Error fetching user in layout:', e);
    } finally {
      setLoading(false);
    }
  }, [router]);

  React.useEffect(() => {
    fetchUser();
    window.addEventListener('user-updated', fetchUser);
    return () => {
      window.removeEventListener('user-updated', fetchUser);
    };
  }, [fetchUser]);

  React.useEffect(() => {
    prepareWorkspaceDataCacheForRouteChange(pathname);
  }, [pathname]);

  React.useEffect(() => {
    if (!user) return;
    startWorkspaceDataBackgroundChecks();
    return stopWorkspaceDataBackgroundChecks;
  }, [user]);

  React.useEffect(() => {
    if (!user) return;
    if (user.role.toLowerCase() !== 'admin' || pathname === '/briefing') {
      setIsBriefingGateResolved(true);
      return;
    }

    setIsBriefingGateResolved(false);
    const controller = new AbortController();
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
    void fetch(`/api/daily-briefing?intent=status&timeZone=${encodeURIComponent(timeZone)}`, {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('Daily briefing status unavailable');
        return response.json() as Promise<{ shouldOpen?: boolean }>;
      })
      .then((status) => {
        if (status.shouldOpen) {
          router.replace('/briefing?source=daily');
          return;
        }
        setIsBriefingGateResolved(true);
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        console.error('Unable to check the daily briefing:', error);
        setIsBriefingGateResolved(true);
      });

    return () => controller.abort();
  }, [pathname, router, user]);

  const isClientGated = user?.role?.toLowerCase() === 'client' && 
    pathname !== '/client-dashboard' && 
    pathname !== '/client-leads' &&
    pathname !== '/clients/onboard' &&
    pathname !== '/calendar';
  
  const isMemberGated = user?.role?.toLowerCase() === 'member' && 
    pathname !== '/teams-dashboard' && 
    pathname !== '/tasks' &&
    pathname !== '/calendar';

  const isAdminGated = user?.role?.toLowerCase() === 'admin' && 
    (pathname === '/client-dashboard' || pathname === '/client-leads' || pathname === '/teams-dashboard');

  if (loading || (user?.role.toLowerCase() === 'admin' && !isBriefingGateResolved)) {
    return (
      <div className="workspace-shell flex h-screen w-screen items-center justify-center bg-[#09090b]">
        <div className="workspace-session-status workspace-loading-card text-zinc-500 text-xs flex items-center gap-2" role="status">
          <span className="h-4 w-4 animate-spin rounded-full border border-t-transparent border-zinc-400" />
          <span>Loading workspace...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="workspace-shell flex h-screen w-screen overflow-hidden bg-[#09090b]">
      {/* Desktop Sidebar */}
      <Sidebar className="hidden md:flex shrink-0" />

      {/* Mobile Sidebar overlay drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Backdrop */}
          <div
            className="workspace-overlay fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setIsMobileOpen(false)}
          />

          {/* Sidebar Drawer */}
          <div className="workspace-drawer relative z-50 flex h-full w-64 transform transition-transform duration-300 ease-in-out">
            <Sidebar onCloseMobile={() => setIsMobileOpen(false)} className="w-full" />
            <button
              onClick={() => setIsMobileOpen(false)}
              className="workspace-icon-control absolute top-4 -right-12 flex h-9 w-9 items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
              aria-label="Close navigation"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>
      )}

      {/* Right Column (Topbar + Main Content) */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar onMenuToggle={() => setIsMobileOpen(true)} />
        
        {/* Page Content area */}
        <main
          className="workspace-main relative flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden overscroll-contain bg-[#0c0c0e] p-4 sm:p-6 lg:p-8"
          aria-busy={isWorkspaceDataLoading}
        >
          {isWorkspaceDataLoading && (
            <div
              className="workspace-overlay workspace-loading-overlay fixed inset-0 z-[70] flex items-center justify-center bg-zinc-950/82 p-6 backdrop-blur-md"
              role="status"
              aria-live="polite"
            >
              <div className="workspace-session-status workspace-loading-card w-full max-w-sm rounded-2xl border border-zinc-700/80 bg-zinc-900/92 p-6 text-center shadow-[0_28px_90px_rgba(0,0,0,0.5)]">
                <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-100" />
                <h2 className="mt-4 text-sm font-semibold text-white">Loading workspace data</h2>
              </div>
            </div>
          )}
           {isAdminGated ? (
            <div className="flex h-[70vh] flex-col items-center justify-center font-sans text-xs">
              <div className="workspace-access-card w-full max-w-md bg-[#0d0e12] border border-zinc-800 p-6 rounded-lg shadow-2xl space-y-6 text-center relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-0.5 bg-zinc-800" />
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                  <Lock className="h-5 w-5" />
                </div>
                <div className="space-y-1.5">
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">Restricted Area</h2>
                  <p className="text-[11px] text-zinc-500 max-w-xs mx-auto leading-normal">
                    This workspace is dedicated to client or team member accounts. Admins should view operational data in the Command Center.
                  </p>
                </div>
                <div className="pt-2">
                  <Button
                    onClick={() => router.push('/dashboard')}
                    className="w-full h-9 font-semibold bg-white text-zinc-950 hover:bg-zinc-200 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Return to Admin Dashboard</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ) : isClientGated ? (
            <div className="flex h-[70vh] flex-col items-center justify-center font-sans text-xs">
              <div className="workspace-access-card w-full max-w-md bg-[#0d0e12] border border-zinc-800 p-6 rounded-lg shadow-2xl space-y-6 text-center relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-0.5 bg-zinc-800" />
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                  <Lock className="h-5 w-5" />
                </div>
                <div className="space-y-1.5">
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">Restricted Area</h2>
                  <p className="text-[11px] text-zinc-500 max-w-xs mx-auto leading-normal">
                    Your account has client clearance and is authorized to view only the Client Dashboard and Calendar.
                  </p>
                </div>
                <div className="pt-2">
                  <Button
                    onClick={() => router.push('/client-dashboard')}
                    className="w-full h-9 font-semibold bg-white text-zinc-950 hover:bg-zinc-200 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Proceed to Client Dashboard</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ) : isMemberGated ? (
            <div className="flex h-[70vh] flex-col items-center justify-center font-sans text-xs">
              <div className="workspace-access-card w-full max-w-md bg-[#0d0e12] border border-zinc-800 p-6 rounded-lg shadow-2xl space-y-6 text-center relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-0.5 bg-zinc-800" />
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                  <Lock className="h-5 w-5" />
                </div>
                <div className="space-y-1.5">
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">Restricted Area</h2>
                  <p className="text-[11px] text-zinc-500 max-w-xs mx-auto leading-normal">
                    Your account has team member clearance and is authorized to view only the Teams Dashboard, Tasks, and Calendar.
                  </p>
                </div>
                <div className="pt-2">
                  <Button
                    onClick={() => router.push('/teams-dashboard')}
                    className="w-full h-9 font-semibold bg-white text-zinc-950 hover:bg-zinc-200 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Proceed to Teams Dashboard</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div key={pathname} className="workspace-page">
              {children}
            </div>
          )}
        </main>
      </div>
      {user?.role.toLowerCase() === 'admin' && <DailyBriefingLauncher />}
    </div>
  );
}
