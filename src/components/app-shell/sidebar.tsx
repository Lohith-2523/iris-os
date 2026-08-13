'use client';

import * as React from 'react';
import { workspaceFetch as fetch } from '@/lib/workspace-data-cache';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/client';
import { readWorkspaceUiPreference, type WorkspaceUiScope, writeWorkspaceUiPreference } from '@/lib/workspace-ui-storage';
import { AtlasIcon } from '@/components/ui/atlas-icon';
import { SubscriptionPlanDialog } from '@/components/billing/subscription-plan-dialog';
import { prepareWorkspaceDataCacheForRouteChange } from '@/lib/workspace-data-cache';
import { normalizePlan, planIncludes, type PlanId } from '@/lib/plan-entitlements';
import {
  LayoutDashboard,
  Wallet,
  Users,
  FolderKanban,
  UserCheck,
  FileText,
  TrendingUp,
  Activity,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Calendar,
  FileSpreadsheet,
  ReceiptText,
  FilePenLine,
  MessageSquare,
} from 'lucide-react';

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  onCloseMobile?: () => void;
  workspacePlan?: string;
  workspaceRole?: string;
  workspaceOrganizationName?: string;
  workspaceOrganizationLogoDataUrl?: string | null;
}

type NavigationItem = {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  highlight?: boolean;
  badge?: string;
  requiredPlan?: PlanId;
};

type NavigationGroup = {
  label: string;
  items: NavigationItem[];
};

export function Sidebar({ className, onCloseMobile, workspacePlan, workspaceRole, workspaceOrganizationName, workspaceOrganizationLogoDataUrl, ...props }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = React.useMemo(() => createClient(), []);
  const [orgName, setOrgName] = React.useState(workspaceOrganizationName || 'Agency Workspace');
  const [orgLogoDataUrl, setOrgLogoDataUrl] = React.useState(workspaceOrganizationLogoDataUrl || '');
  const [plan, setPlan] = React.useState('');
  const [user, setUser] = React.useState<{
    id?: string;
    orgId?: string;
    name: string;
    email: string;
    role: string;
    avatarUrl?: string | null;
    accessPermissions?: string[] | null;
  } | null>(null);
  const [isCollapsed, setIsCollapsed] = React.useState(true);
  const [uiScope, setUiScope] = React.useState<WorkspaceUiScope | null>(null);
  const [upgradePrompt, setUpgradePrompt] = React.useState<{ feature: string; href: string; requiredPlan: PlanId } | null>(null);
  const resolvedPlan = normalizePlan(workspacePlan || plan);
  const resolvedRole = (workspaceRole || user?.role || '').toLowerCase();

  const loadOrg = React.useCallback(async () => {
    try {
      const res = await fetch('/api/workspace');
      if (res.ok) {
        const data = await res.json();
        setOrgName(data.organization.name || 'Agency Workspace');
        setOrgLogoDataUrl(data.organization.invoiceLogoDataUrl || '');
        setPlan(data.organization.plan || '');
        setUser(data.user);
        setUiScope({ userId: data.user.id, orgId: data.organization.id });
      }
    } catch (e) {
      console.error('Error loading org in sidebar:', e);
    }
  }, []);

  React.useEffect(() => {
    setIsCollapsed(readWorkspaceUiPreference(uiScope, 'sidebar', true, (value): value is boolean => typeof value === 'boolean'));
  }, [uiScope]);

  // Client and team member workspaces are hosted by the agency that invited
  // them. Apply that agency branding immediately from the app bootstrap,
  // before the sidebar's background workspace refresh completes.
  React.useEffect(() => {
    if (workspaceOrganizationName) setOrgName(workspaceOrganizationName);
    if (workspaceOrganizationLogoDataUrl !== undefined) setOrgLogoDataUrl(workspaceOrganizationLogoDataUrl || '');
  }, [workspaceOrganizationName, workspaceOrganizationLogoDataUrl]);

  const toggleCollapsed = () => {
    setIsCollapsed((current) => {
      const next = !current;
      writeWorkspaceUiPreference(uiScope, 'sidebar', next);
      return next;
    });
  };

  React.useEffect(() => {
    void loadOrg();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        void loadOrg();
      } else {
        setUser(null);
      }
    });

    // Listen to changes from settings update
    const handleOrgUpdate = () => loadOrg();
    const handleUserUpdate = () => void loadOrg();

    window.addEventListener('organization-updated', handleOrgUpdate);
    window.addEventListener('user-updated', handleUserUpdate);
    
    return () => {
      subscription.unsubscribe();
      window.removeEventListener('organization-updated', handleOrgUpdate);
      window.removeEventListener('user-updated', handleUserUpdate);
    };
  }, [loadOrg, supabase]);

  const navigationGroups = React.useMemo<NavigationGroup[]>(() => [
    {
      label: 'Overview',
      items: [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { name: 'Agency Leads', href: '/agency-leads', icon: FileSpreadsheet },
        { name: 'Clients', href: '/clients', icon: Users },
      ],
    },
    {
      label: 'Finance',
      items: [
        { name: 'Finance', href: '/finance', icon: Wallet },
        { name: 'Invoices', href: '/invoices', icon: ReceiptText },
      ],
    },
    {
      label: 'Documents',
      items: [
        { name: 'Proposals', href: '/proposals', icon: FilePenLine },
        { name: 'Contracts', href: '/documents', icon: FileText },
      ],
    },
    {
      label: 'Delivery',
      items: [
        { name: 'Projects', href: '/projects', icon: FolderKanban },
        { name: 'Tasks', href: '/tasks', icon: Activity },
        { name: 'Team', href: '/team', icon: UserCheck },
        { name: 'Calendar', href: '/calendar', icon: Calendar },
        { name: 'Messages', href: '/messages', icon: MessageSquare, requiredPlan: 'PRO' },
      ],
    },
    {
      label: 'Intelligence',
      items: [
        { name: 'Reporting', href: '/reporting', icon: FileText },
        { name: 'Strategy', href: '/strategy', icon: TrendingUp, requiredPlan: 'ADVANCED' },
        { name: 'Atlas AI', href: '/atlas', icon: AtlasIcon, highlight: true, requiredPlan: 'PRO' },
      ],
    },
  ], []);

  const visibleGroups = React.useMemo<NavigationGroup[]>(() => {
    if (resolvedRole === 'client') {
      return [{
        label: 'Workspace',
        items: [
          { name: 'Client Dashboard', href: '/client-dashboard', icon: LayoutDashboard },
          { name: 'Calendar', href: '/calendar', icon: Calendar },
          { name: 'Messages', href: '/messages', icon: MessageSquare, requiredPlan: 'PRO' },
        ],
      }];
    }
    if (resolvedRole === 'member') {
      return [{
        label: 'Workspace',
        items: [
          { name: 'Teams Dashboard', href: '/teams-dashboard', icon: LayoutDashboard },
          { name: 'Tasks', href: '/tasks', icon: Activity },
          { name: 'Calendar', href: '/calendar', icon: Calendar },
          { name: 'Messages', href: '/messages', icon: MessageSquare, requiredPlan: 'PRO' },
        ],
      }];
    }
    if (resolvedRole === 'sub_admin') {
      const permissions = user?.accessPermissions || [];
      return navigationGroups
        .map((group) => ({ ...group, items: group.items.filter((item) => permissions.includes(item.href.split('/').filter(Boolean)[0])) }))
        .filter((group) => group.items.length > 0);
    }
    return navigationGroups;
  }, [navigationGroups, resolvedRole, user?.accessPermissions]);

  const initials = React.useMemo(() => {
    return orgName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }, [orgName]);

  const userInitials = React.useMemo(() => {
    if (!user?.name) return 'LK';
    return user.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }, [user]);

  return (
    <div
      className={cn(
        'workspace-sidebar flex h-full flex-col border-r border-zinc-800 bg-[#09090b] text-zinc-400 transition-all duration-300 relative shrink-0',
        isCollapsed ? 'w-20' : 'w-[282px]',
        className
      )}
      {...props}
    >
      {/* Toggle Button */}
      <button
        onClick={toggleCollapsed}
        className="workspace-icon-control absolute -right-3 top-6 z-50 flex h-7 w-7 items-center justify-center rounded-full border border-zinc-800 bg-[#09090b] text-zinc-400 hover:text-white shadow-md cursor-pointer"
        title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        aria-label={isCollapsed ? 'Expand navigation' : 'Collapse navigation'}
        aria-expanded={!isCollapsed}
      >
        {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
      </button>

      <div className="flex h-16 items-center justify-center border-b border-zinc-800 px-2">
        <Link
          href={resolvedRole === 'client' ? '/client-dashboard' : resolvedRole === 'member' ? '/teams-dashboard' : '/dashboard'}
          className="flex items-center justify-center"
          onClick={() => {
            prepareWorkspaceDataCacheForRouteChange(resolvedRole === 'client' ? '/client-dashboard' : resolvedRole === 'member' ? '/teams-dashboard' : '/dashboard');
            onCloseMobile?.();
          }}
        >
          {isCollapsed ? (
            <img 
              src="/iris-logo-white-transparent.png" 
              alt="Iris OS Logo" 
              className="h-9 w-9 object-contain"
            />
          ) : (
            <div className="flex items-center gap-2">
              <img 
                src="/iris-logo-black-bg.png" 
                alt="Iris OS Logo" 
                className="h-[43px] object-contain"
              />
            </div>
          )}
        </Link>
      </div>

      {/* Brand Switcher / Org details */}
      <div className="px-2 py-3 border-b border-zinc-900 bg-zinc-950/40">
        <div className={cn(
          "workspace-org-identity flex items-center rounded-xl border border-zinc-800 bg-zinc-900/50",
          isCollapsed ? "p-1.5 justify-center" : "px-3 py-2"
        )}>
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 overflow-hidden rounded bg-zinc-100 text-zinc-800 border border-zinc-200 dark:bg-zinc-700 dark:text-white dark:border-none flex items-center justify-center text-[10px] font-bold shrink-0">
              {orgLogoDataUrl ? (
                <img
                  src={orgLogoDataUrl}
                  alt={`${orgName} logo`}
                  className="h-full w-full object-cover"
                  onError={() => setOrgLogoDataUrl('')}
                />
              ) : (initials || 'AP')}
            </div>
            {!isCollapsed && <span className="text-xs font-semibold text-zinc-200 truncate">{orgName}</span>}
          </div>
        </div>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-2 py-4">
        <nav className="space-y-4">
          {visibleGroups.map((group) => (
            <div key={group.label} className="space-y-1">
              {!isCollapsed && (
                <p className="px-3 pb-1 text-[9px] font-bold uppercase tracking-[0.18em] text-zinc-600">
                  {group.label}
                </p>
              )}
              {isCollapsed && <div className="mx-3 mb-2 border-t border-zinc-900" aria-hidden="true" />}
              {group.items.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
            const Icon = item.icon;
            const isLocked = Boolean(item.requiredPlan && !planIncludes(resolvedPlan, item.requiredPlan));

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={(event) => {
                  if (isLocked && item.requiredPlan) {
                    event.preventDefault();
                    setUpgradePrompt({ feature: item.name, href: item.href, requiredPlan: item.requiredPlan });
                    return;
                  }
                  prepareWorkspaceDataCacheForRouteChange(item.href);
                  onCloseMobile?.();
                }}
                title={isCollapsed ? item.name : undefined}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'workspace-nav-link group flex items-center rounded-xl transition-[transform,background-color,color,box-shadow,border-color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500',
                  isCollapsed ? 'justify-center p-2.5 mb-1' : 'justify-between px-3 py-2 text-xs font-medium',
                  isActive
                    ? item.highlight
                      ? 'bg-zinc-900 text-white border-l-2 border-l-zinc-300'
                      : 'bg-zinc-900 text-white border-l-2 border-l-white'
                    : 'hover:bg-zinc-950 hover:text-zinc-200',
                  item.highlight && !isActive && 'text-zinc-300 font-semibold',
                  isCollapsed && isActive && 'border-l-0 bg-zinc-900 text-white'
                )}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={cn(
                      'shrink-0 transition-colors h-4 w-4',
                      isActive
                        ? item.highlight
                          ? 'text-zinc-200'
                          : 'text-white'
                        : 'text-zinc-500 group-hover:text-zinc-300',
                      item.highlight && !isActive && 'text-zinc-300'
                    )}
                  />
                  {!isCollapsed && <span>{item.name}</span>}
                </div>
                {!isCollapsed && 'badge' in item && typeof item.badge === 'string' && (
                  <span className="rounded bg-zinc-800 border border-zinc-700 px-1.5 py-0.2 text-[9px] font-semibold text-zinc-400 uppercase tracking-wider scale-90">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
              })}
            </div>
          ))}
        </nav>
      </div>

      {/* User Footer Profile */}
      <div className="border-t border-zinc-800 p-3 bg-zinc-950/20">
        {user ? (
          <Link
            href="/settings"
            onClick={() => {
              prepareWorkspaceDataCacheForRouteChange('/settings');
              onCloseMobile?.();
            }}
            title={isCollapsed ? 'Open profile settings' : undefined}
            aria-label="Open profile settings"
            className={cn("workspace-profile-settings group flex items-center rounded-xl border border-transparent outline-none transition-colors hover:bg-zinc-900 focus-visible:ring-2 focus-visible:ring-zinc-500", isCollapsed ? "justify-center p-1.5" : "gap-2.5 p-2")}
          >
              <div className="h-7 w-7 overflow-hidden rounded-md bg-zinc-800 flex items-center justify-center border border-zinc-700 text-white font-bold text-[10px] shrink-0">
                {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-full w-full object-contain" /> : userInitials}
              </div>
              {!isCollapsed && (
                <div className="truncate">
                  <span className="block text-xs font-semibold text-white leading-none group-hover:underline">
                    {user.name}
                  </span>
                  <span className="workspace-profile-email mt-1 block truncate text-[10px] text-zinc-500">
                    {user.email}
                  </span>
                  <span className="mt-1 block text-[10px] font-semibold uppercase tracking-wider text-white-600">{resolvedPlan ? `${resolvedPlan}` : ''}</span>
                </div>
              )}
          </Link>
        ) : (
          <div className="flex flex-col gap-2">
            {!isCollapsed && <div className="text-zinc-500 text-[10px] text-center mb-1">Signed out</div>}
            <div className="flex gap-2">
              <Link
                href="/login"
                className={cn(
                  "flex-1 rounded border border-zinc-800 bg-zinc-900 text-zinc-300 font-semibold hover:bg-zinc-800 hover:text-white transition-colors cursor-pointer text-center",
                  isCollapsed ? "p-1.5" : "px-3 py-1.5 text-[10px]"
                )}
              >
                {isCollapsed ? <LogOut className="h-3.5 w-3.5 mx-auto" /> : "Sign In"}
              </Link>
            </div>
          </div>
        )}
      </div>
      <SubscriptionPlanDialog open={Boolean(upgradePrompt)} currentPlan={resolvedPlan} feature={upgradePrompt?.feature || 'this feature'} requiredPlan={upgradePrompt?.requiredPlan || 'PRO'} canManage={resolvedRole === 'admin'} onClose={() => setUpgradePrompt(null)} onPlanChanged={(nextPlan) => { const destination = upgradePrompt?.href; setPlan(nextPlan); setUpgradePrompt(null); onCloseMobile?.(); if (destination) { prepareWorkspaceDataCacheForRouteChange(destination); router.push(destination); } }} />
    </div>
  );
}

export default Sidebar;
