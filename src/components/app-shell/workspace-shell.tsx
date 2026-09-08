'use client';

import * as React from 'react';
import { Sidebar } from '@/components/app-shell/sidebar';
import { Topbar } from '@/components/app-shell/topbar';
import { X, Lock, ArrowRight } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { setActiveWorkspaceContext } from '@/lib/utils';
import { setAtlasAIWorkspaceScope } from '@/lib/atlas-ai/service';
import { AuthSync } from '@/components/app-shell/auth-sync';
import { MetaSdkLoader } from '@/components/integrations/meta-sdk-loader';
import { FileInputSecurityGuard } from '@/components/security/file-input-security-guard';
import { canShowAtlasLauncher } from '@/lib/workspace-launchers';
import { AsyncButtonFeedback } from '@/components/app-shell/async-button-feedback';
import { SubscriptionPlanDialog } from '@/components/billing/subscription-plan-dialog';
import { MobileBottomNavigation } from '@/components/app-shell/mobile-bottom-navigation';
import { planIncludes, type PlanId } from '@/lib/plan-entitlements';
import { resolveWorkspaceLayoutFamily, useWorkspaceLayoutMode } from '@/lib/workspace-layout-mode';
import {
  configureWorkspaceDataCache,
  primeWorkspaceJson,
  prepareWorkspaceDataCacheForRouteChange,
  prepareWorkspaceDataCacheForNavigation,
  stageWorkspaceDataCache,
  startWorkspaceDataBackgroundChecks,
  stopWorkspaceDataBackgroundChecks,
} from '@/lib/workspace-data-cache';
import { workspaceDataUrlsForRoute } from '@/lib/workspace-route-data';
import type { WorkspaceReadModel } from '@/lib/workspace-read-model';
import { workspaceRouteRestriction } from '@/lib/workspace-route-authorization';

prepareWorkspaceDataCacheForNavigation();

function WorkspaceRuntime() {
  const metaAppId = process.env.NEXT_PUBLIC_META_APP_ID;
  const metaApiVersion = process.env.NEXT_PUBLIC_META_API_VERSION || 'v25.0';

  return (
    <>
      <AuthSync />
      <FileInputSecurityGuard />
      <AsyncButtonFeedback />
      {metaAppId && <MetaSdkLoader appId={metaAppId} apiVersion={metaApiVersion} />}
    </>
  );
}

type WorkspaceShellUser = {
  id: string;
  orgId: string;
  name: string;
  role: string;
  plan: string;
  organizationName?: string;
  organizationLogoDataUrl?: string | null;
  accessPermissions?: string[] | null;
};

function workspaceShellUser(workspace: WorkspaceReadModel): WorkspaceShellUser {
  return {
    ...workspace.user,
    orgId: workspace.user.orgId || workspace.organization.id,
    plan: workspace.organization.plan || 'BASIC',
    organizationName: workspace.organization.name || 'Agency Workspace',
    organizationLogoDataUrl: workspace.organization.invoiceLogoDataUrl || null,
  };
}

export function WorkspaceShell({
  children,
  initialWorkspace,
}: {
  children: React.ReactNode;
  initialWorkspace: WorkspaceReadModel;
}) {
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);
  const layoutMode = useWorkspaceLayoutMode();
  const pathname = usePathname();
  const layoutFamily = resolveWorkspaceLayoutFamily(pathname);
  const router = useRouter();
  
  const [user, setUser] = React.useState<WorkspaceShellUser>(() => workspaceShellUser(initialWorkspace));

  const applyWorkspace = React.useCallback((workspace: WorkspaceReadModel) => {
    const data = workspace.user;
    const orgId = data.orgId || workspace.organization.id;
    const activePlan = workspace.organization.plan || 'BASIC';
    configureWorkspaceDataCache({ userId: data.id, orgId });
    primeWorkspaceJson('/api/workspace', workspace);
    setAtlasAIWorkspaceScope({ userId: data.id, orgId });
    setUser(workspaceShellUser(workspace));
    setActiveWorkspaceContext({ userName: data.name, currency: workspace.organization.currency });

    if (activePlan !== 'BASIC') {
      void import('@/lib/messaging/protocol')
        .then(({ getMessagingProtocol }) => getMessagingProtocol().prepare({ userId: data.id }))
        .catch((error) => {
          console.error('Unable to register the secure messaging device during workspace startup:', error);
        });
    }
  }, []);

  const fetchUser = React.useCallback(async () => {
    try {
      const res = await fetch('/api/workspace', { cache: 'no-store' });
      if (res.ok) {
        applyWorkspace(await res.json() as WorkspaceReadModel);
      } else if (res.status === 401) {
        configureWorkspaceDataCache(null);
        setAtlasAIWorkspaceScope(null);
        router.replace('/login');
      }
    } catch (e) {
      console.error('Error fetching user in layout:', e);
    }
  }, [applyWorkspace, router]);

  React.useEffect(() => {
    applyWorkspace(initialWorkspace);
    window.addEventListener('user-updated', fetchUser);
    return () => {
      window.removeEventListener('user-updated', fetchUser);
    };
  }, [applyWorkspace, fetchUser, initialWorkspace]);

  React.useEffect(() => {
    prepareWorkspaceDataCacheForRouteChange(pathname);
    if (!user) return;
    const schedule = window.requestIdleCallback
      ? window.requestIdleCallback(() => void stageWorkspaceDataCache(workspaceDataUrlsForRoute(pathname)), { timeout: 2_000 })
      : window.setTimeout(() => void stageWorkspaceDataCache(workspaceDataUrlsForRoute(pathname)), 250);
    return () => {
      if (window.cancelIdleCallback && typeof schedule === 'number') window.cancelIdleCallback(schedule);
      else window.clearTimeout(schedule);
    };
  }, [pathname, user]);

  React.useEffect(() => {
    if (!user) return;
    startWorkspaceDataBackgroundChecks();
    return stopWorkspaceDataBackgroundChecks;
  }, [user]);

  const routeRestriction = workspaceRouteRestriction(user, pathname);
  const isClientGated = routeRestriction === 'client';
  const isMemberGated = routeRestriction === 'member';
  const isAdminGated = routeRestriction === 'admin';
  const isSubAdminGated = routeRestriction === 'sub_admin';

  const planGate: { feature: string; requiredPlan: PlanId } | null = pathname === '/messages'
    ? { feature: 'Messages', requiredPlan: 'PRO' }
    : pathname === '/atlas'
      ? { feature: 'Atlas AI', requiredPlan: 'PRO' }
      : pathname === '/strategy'
          ? { feature: 'Strategy', requiredPlan: 'ADVANCED' }
          : null;
  const isPlanGated = Boolean(user && planGate && !planIncludes(user.plan, planGate.requiredPlan));

  return (
    <div
      className="workspace-shell flex h-dvh w-full overflow-hidden bg-[#09090b]"
      data-layout-mode={layoutMode}
      data-layout-family={layoutFamily}
    >
      <WorkspaceRuntime />
      {/* Desktop Sidebar */}
      <Sidebar className="workspace-desktop-sidebar hidden md:flex shrink-0" workspacePlan={user?.plan} workspaceRole={user?.role} workspaceOrganizationName={user?.organizationName} workspaceOrganizationLogoDataUrl={user?.organizationLogoDataUrl} />

      {/* Mobile Sidebar overlay drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Backdrop */}
          <div
            className="workspace-overlay fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setIsMobileOpen(false)}
          />

          {/* Sidebar Drawer */}
          <div className="workspace-drawer relative z-50 flex h-full w-[282px] max-w-[calc(100%-3.5rem)] transform transition-transform duration-300 ease-in-out">
            <Sidebar onCloseMobile={() => setIsMobileOpen(false)} className="w-full" workspacePlan={user?.plan} workspaceRole={user?.role} workspaceOrganizationName={user?.organizationName} workspaceOrganizationLogoDataUrl={user?.organizationLogoDataUrl} />
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
        <Topbar
          onMenuToggle={() => setIsMobileOpen(true)}
          atlasMenuEnabled={Boolean(user && canShowAtlasLauncher(user.role))}
          workspacePlan={user?.plan}
          canManagePlan={user?.role.toLowerCase() === 'admin'}
        />
        
        {/* Page Content area */}
        <main
          className="workspace-main relative flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden overscroll-contain bg-[#0c0c0e]"
        >
           {isSubAdminGated ? (
            <div className="flex h-[70vh] flex-col items-center justify-center">
              <div className="workspace-access-card w-full max-w-lg space-y-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-7 text-center">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-xl border border-zinc-800 bg-zinc-900"><Lock className="h-6 w-6" /></div>
                <div><h2 className="font-bold text-white">Access not assigned</h2><p className="mt-2 text-zinc-400">The agency admin has not granted your sub-admin account access to this page.</p></div>
                <Button onClick={() => router.push('/dashboard')}>Return to dashboard</Button>
              </div>
            </div>
          ) : isAdminGated ? (
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
      {user && <MobileBottomNavigation role={user.role} plan={user.plan} accessPermissions={user.accessPermissions} onMore={() => setIsMobileOpen(true)} />}
      <SubscriptionPlanDialog open={isPlanGated} currentPlan={user?.plan} feature={planGate?.feature || 'this feature'} requiredPlan={planGate?.requiredPlan || 'PRO'} canManage={user?.role.toLowerCase() === 'admin'} onClose={() => router.push('/dashboard')} onPlanChanged={(nextPlan) => setUser(current => current ? { ...current, plan: nextPlan } : current)} />
    </div>
  );
}
