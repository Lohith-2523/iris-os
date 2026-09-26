'use client';

import * as React from 'react';
import { Search, Menu, X, Sun, Moon, CircleDollarSign, FolderKanban } from 'lucide-react';
import { Button } from '../ui/button';
import { AtlasIcon } from '../ui/atlas-icon';
import { prepareWorkspaceDataCacheForRouteChange } from '@/lib/workspace-data-cache';
import { NotificationCenter } from '@/components/notifications/notification-center';
import { AtlasTopbarMenu } from '@/components/atlas/atlas-floating-launcher';
import {
  applyWorkspaceTheme,
  hasPersistedWorkspaceTheme,
  persistWorkspaceTheme,
  readWorkspaceTheme,
  type WorkspaceTheme,
} from '@/lib/workspace-theme';
import { useWorkspaceRuntime } from '@/components/demo/demo-mode-provider';

interface TopbarProps {
  onMenuToggle: () => void;
  atlasMenuEnabled?: boolean;
  workspacePlan?: string;
  canManagePlan?: boolean;
}

interface CommandItem {
  name: string;
  category: string;
  description: string;
  href: string;
  keywords: string[];
}

const workspaceCommands: CommandItem[] = [
  { name: 'Dashboard', category: 'Overview', description: 'Agency health, revenue, expenses, receivables, and performance.', href: '/dashboard', keywords: ['home', 'command center', 'overview', 'agency health', 'revenue', 'expenses', 'receivables', 'performance'] },
  { name: 'Agency Leads', category: 'Pipeline', description: 'Manage prospects, stages, lead values, notes, and follow-ups.', href: '/agency-leads', keywords: ['pipeline', 'crm', 'prospects', 'sales', 'lead stages', 'follow up', 'export'] },
  { name: 'Client Leads', category: 'Pipeline', description: 'Review client-scoped leads and opportunities.', href: '/client-leads', keywords: ['client pipeline', 'prospects', 'opportunities', 'sales'] },
  { name: 'Clients', category: 'Pipeline', description: 'Open the client portfolio, account details, and profitability.', href: '/clients', keywords: ['accounts', 'portfolio', 'contacts', 'profitability', 'churn', 'renewal', 'client details'] },
  { name: 'Onboard a Client', category: 'Pipeline', description: 'Launch the complete client onboarding workflow.', href: '/clients/onboard', keywords: ['new client', 'add client', 'create client', 'intake', 'onboarding portal'] },
  { name: 'Projects', category: 'Pipeline', description: 'Manage project delivery, milestones, timelines, and budgets.', href: '/projects', keywords: ['delivery', 'milestones', 'timeline', 'budget', 'project workspace', 'new project'] },
  { name: 'Tasks', category: 'Delivery', description: 'Open TO-DO lists, Kanban boards, assignments, and approvals.', href: '/tasks', keywords: ['to-do', 'todo', 'kanban', 'backlog', 'assignments', 'deliverables', 'approval', 'blocked'] },
  { name: 'Team', category: 'Delivery', description: 'Manage team members, resources, capacity, and assignments.', href: '/team', keywords: ['people', 'members', 'resources', 'capacity', 'contractors', 'workload', 'utilization'] },
  { name: 'Calendar', category: 'Delivery', description: 'Review events, meetings, deadlines, and Google Calendar sync.', href: '/calendar', keywords: ['events', 'meetings', 'schedule', 'deadlines', 'reminders', 'google calendar'] },
  { name: 'Messages', category: 'Delivery', description: 'Open secure team and client conversations.', href: '/messages', keywords: ['chat', 'conversation', 'inbox', 'team chat', 'client chat', 'secure messaging'] },
  { name: 'Proposals', category: 'Documents', description: 'Create, edit, preview, and send client proposals.', href: '/proposals', keywords: ['documents', 'generate proposal', 'pdf', 'send proposal', 'editor'] },
  { name: 'Contracts', category: 'Documents', description: 'Create contracts and statements of work.', href: '/documents', keywords: ['documents', 'legal', 'agreement', 'statement of work', 'sow', 'pdf', 'signing'] },
  { name: 'Financial Ledger', category: 'Finance', description: 'Review revenue, expenses, receivables, and transactions.', href: '/finance', keywords: ['ledger', 'money', 'accounting', 'transactions', 'revenue', 'expenses', 'receivables', 'cash flow', 'bank'] },
  { name: 'Add an Expense', category: 'Finance', description: 'Open the ledger with Expense selected as the transaction type.', href: '/finance?tab=manual&transactionType=Expense', keywords: ['new expense', 'create expense', 'record expense', 'spend', 'cost'] },
  { name: 'Record Revenue', category: 'Finance', description: 'Open manual ledger entry for incoming revenue.', href: '/finance?tab=manual', keywords: ['new revenue', 'income', 'payment', 'transaction', 'credit'] },
  { name: 'Invoices', category: 'Finance', description: 'Create, review, download, and manage invoices.', href: '/invoices', keywords: ['billing', 'invoice pdf', 'payments', 'accounts receivable', 'client billing'] },
  { name: 'Executive Reporting', category: 'Intelligence', description: 'Generate and review executive reports and PDFs.', href: '/reporting', keywords: ['reports', 'executive report', 'pdf', 'download report', 'scheduled report', 'summary'] },
  { name: 'Strategy Studio', category: 'Intelligence', description: 'Build strategies with client and project intelligence.', href: '/strategy', keywords: ['analytics', 'planning', 'forecast', 'recommendations', 'client scope', 'project scope'] },
  { name: 'Analytics', category: 'Intelligence', description: 'Open the analytics entry point for strategic intelligence.', href: '/analytics', keywords: ['strategy', 'analysis', 'metrics', 'performance', 'insights'] },
  { name: 'Data Explorer', category: 'Intelligence', description: 'Explore operational capacity, billings, overhead, and trends.', href: '/explorer', keywords: ['analytics', 'charts', 'datasets', 'capacity', 'billings', 'overhead', 'margin', 'data'] },
  { name: 'Miles AI', category: 'Intelligence', description: 'Ask Miles and run workspace-aware intelligence workflows.', href: '/atlas', keywords: ['ai', 'assistant', 'ask atlas', 'analysis', 'forecast', 'insights', 'recommendations', 'command center'] },
  { name: 'Settings', category: 'Administration', description: 'Manage profile, organization, preferences, and integrations.', href: '/settings', keywords: ['profile', 'organization', 'preferences', 'theme', 'integrations', 'account', 'workspace'] },
  { name: 'Security & Roles', category: 'Administration', description: 'Manage roles, page access, permissions, and offboarding.', href: '/settings/security', keywords: ['security', 'roles', 'permissions', 'access', 'core member', 'offboarding', 'users'] },
  { name: 'Team Dashboard', category: 'Workspace', description: 'Open the specialist team-member command center.', href: '/teams-dashboard', keywords: ['member dashboard', 'specialist', 'assigned work', 'team workspace'] },
  { name: 'Client Dashboard', category: 'Workspace', description: 'Open the client-facing performance and delivery portal.', href: '/client-dashboard', keywords: ['client portal', 'campaigns', 'client workspace', 'clearance'] },
];

const commandSearchText = (item: CommandItem) => [item.name, item.category, item.description, ...item.keywords].join(' ').toLowerCase();

export function Topbar({ onMenuToggle, atlasMenuEnabled = true, workspacePlan, canManagePlan }: TopbarProps) {
  const runtime = useWorkspaceRuntime();
  const router = runtime.router;
  const pathname = runtime.pathname;
  const fetch = runtime.fetch;
  const isClient = pathname === '/client-dashboard';
  const [isCommandOpen, setIsCommandOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [atlasQuery, setAtlasQuery] = React.useState('');
  const [theme, setTheme] = React.useState<WorkspaceTheme>('dark');
  const hasOptimisticThemeRef = React.useRef(false);

  React.useEffect(() => {
    const cookieTheme = readWorkspaceTheme();
    const hasThemeCookie = hasPersistedWorkspaceTheme();
    setTheme(cookieTheme);
    applyWorkspaceTheme(cookieTheme);

    // The cookie is the immediate, client-owned source of truth. Only use the
    // saved preference to establish it for a browser that does not have one.
    // This prevents an older workspace read from racing a recent toggle.
    if (hasThemeCookie) return;

    let isCurrent = true;
    void fetch('/api/workspace')
      .then((res) => res.ok ? res.json() : null)
      .then((workspace) => {
        const workspaceTheme = workspace?.user?.preferences?.theme;
        if (!isCurrent || hasOptimisticThemeRef.current || (workspaceTheme !== 'dark' && workspaceTheme !== 'light')) return;
        persistWorkspaceTheme(workspaceTheme);
        setTheme(workspaceTheme);
        applyWorkspaceTheme(workspaceTheme);
      })
      .catch(() => undefined);

    return () => {
      isCurrent = false;
    };
  }, [fetch]);

  React.useEffect(() => {
    applyWorkspaceTheme(theme);
  }, [theme]);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    hasOptimisticThemeRef.current = true;
    setTheme(nextTheme);
    applyWorkspaceTheme(nextTheme);
    persistWorkspaceTheme(nextTheme);
    void fetch('/api/workspace', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: { preferences: { theme: nextTheme } } }),
      // Theme preferences are a tiny, independent update. Keep the request
      // alive when a user immediately follows the toggle with navigation.
      keepalive: true,
    });
  };

  // Keyboard shortcut Ctrl+K
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsCommandOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleAtlasSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!atlasQuery.trim()) return;
    
    // Redirect to atlas chat with pre-filled query
    prepareWorkspaceDataCacheForRouteChange('/atlas');
    router.push(`/atlas?q=${encodeURIComponent(atlasQuery)}`);
    setAtlasQuery('');
  };

  const quickAccess = [
    { name: 'Financial Ledger', description: 'Review revenue, expenses, receivables, and transactions', href: '/finance', icon: CircleDollarSign },
    { name: 'Project Overview', description: 'Review delivery, milestones, timelines, and budgets', href: '/projects', icon: FolderKanban },
    { name: 'Miles AI', description: 'Ask Miles or run an intelligence workflow', href: '/atlas', icon: AtlasIcon },
  ];

  const commandResults = React.useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) return [];
    const tokens = normalizedQuery.split(/\s+/).filter(Boolean);

    return workspaceCommands
      .filter((item) => tokens.every((token) => commandSearchText(item).includes(token)))
      .sort((a, b) => {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();
        const aRank = aName === normalizedQuery ? 0 : aName.startsWith(normalizedQuery) ? 1 : aName.includes(normalizedQuery) ? 2 : 3;
        const bRank = bName === normalizedQuery ? 0 : bName.startsWith(normalizedQuery) ? 1 : bName.includes(normalizedQuery) ? 2 : 3;
        return aRank - bRank || a.name.localeCompare(b.name);
      });
  }, [searchQuery]);

  const executeCommand = (item: Pick<CommandItem, 'name' | 'href'>) => {
    setIsCommandOpen(false);
    setSearchQuery('');
    prepareWorkspaceDataCacheForRouteChange(item.href.split('?')[0]);
    router.push(item.href);
  };

  return (
    <>
      <header className="workspace-topbar workspace-topbar-centered w-full border-b border-zinc-800 bg-[#09090b]">
        {/* Left: Mobile Toggle & Brand indicator */}
        <div className="workspace-topbar-navigation">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuToggle}
            className="workspace-menu-toggle md:hidden text-zinc-400 hover:text-white"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </Button>

        </div>

        <div className="workspace-topbar-controls">
          {!isClient && atlasMenuEnabled && (
            <div className="workspace-topbar-atlas">
              <div className="workspace-topbar-search flex h-9 w-9 items-center justify-center gap-2.5 rounded-full border border-zinc-800 bg-zinc-900/40 transition-colors focus-within:border-zinc-700 focus-within:bg-zinc-900/80 md:w-full md:justify-start md:pl-3">
                <AtlasTopbarMenu workspacePlan={workspacePlan} canManagePlan={canManagePlan} />
                <form onSubmit={handleAtlasSubmit} className="hidden h-full min-w-0 flex-1 md:flex">
                  <input
                    type="text"
                    aria-label="Ask Miles AI"
                    placeholder="Ask Miles AI"
                    value={atlasQuery}
                    onChange={(e) => setAtlasQuery(e.target.value)}
                    className="!min-h-0 h-full min-w-0 flex-1 bg-transparent py-0 pr-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-0 font-sans"
                  />
                  <button type="submit" className="hidden" />
                </form>
              </div>
            </div>
          )}

          {(!atlasMenuEnabled || isClient) && <div className="workspace-topbar-atlas"><div className="workspace-topbar-search flex h-9 items-center justify-center gap-2 rounded-full border border-zinc-800 px-3 text-xs text-zinc-500" title="Miles AI is not enabled for this role" aria-label="Miles AI unavailable for this role"><AtlasIcon className="h-4 w-4" /><span className="hidden md:inline">Miles AI</span></div></div>}
          <div className="workspace-topbar-actions">
            <NotificationCenter />
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="h-11 w-11 rounded-xl text-zinc-400 hover:text-white border border-zinc-800 bg-zinc-950 flex items-center justify-center cursor-pointer transition-colors"
              title="Toggle theme profile"
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
              aria-pressed={theme === 'light'}
              data-skip-async-feedback
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            {!isClient && (
              <button
                type="button"
                onClick={() => setIsCommandOpen(true)}
                className="workspace-topbar-search-trigger grid h-11 w-11 place-items-center rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-400 transition-colors hover:text-white"
                aria-label="Open workspace search"
                title="Search workspace (Ctrl+K)"
              >
                <Search className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
        <div id="workspace-help-slot" className="workspace-topbar-help" />
      </header>

      {/* Command Menu Modal Dialog */}
      {isCommandOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[15vh]">
          {/* Backdrop */}
          <div
            className="workspace-overlay fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={() => {
              setIsCommandOpen(false);
              setSearchQuery('');
            }}
          />

          {/* Dialog Container */}
          <div
            className="workspace-command-dialog workspace-search-menu relative z-50 w-full max-w-[38.4rem] overflow-hidden rounded-2xl bg-[#0d0e12] shadow-2xl sm:min-h-[16.5rem]"
            role="dialog"
            aria-modal="true"
            aria-label="Workspace command menu"
          >
            <div className="my-3 flex h-[2.8rem] w-full min-w-0 items-center gap-3 px-4">
              <div className="workspace-command-search-control relative h-full min-w-0 flex-1" role="search">
                <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Search pages and features…"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && commandResults[0]) {
                      event.preventDefault();
                      executeCommand(commandResults[0]);
                    }
                    if (event.key === 'Escape') {
                      event.preventDefault();
                      setIsCommandOpen(false);
                      setSearchQuery('');
                    }
                  }}
                  className="workspace-command-search-input !min-h-0 h-full w-full min-w-0 text-sm text-white placeholder-zinc-500 focus:outline-none"
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setIsCommandOpen(false);
                  setSearchQuery('');
                }}
                className="h-[2.8rem] w-[2.8rem] shrink-0 rounded-xl border border-zinc-800 bg-zinc-950/60 text-zinc-500 hover:border-zinc-700 hover:bg-zinc-900 hover:text-white"
                aria-label="Close workspace search"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* List Results */}
            <div className="max-h-[528px] overflow-y-auto p-2">
              {searchQuery && commandResults.length === 0 ? (
                <div className="p-4 text-center text-xs text-zinc-500">
                  No matching commands found.
                </div>
              ) : searchQuery && commandResults.length > 0 ? (
                <div className="space-y-1">
                  {commandResults.map((item) => (
                    <button
                      type="button"
                      key={`${item.href}-${item.name}`}
                      onClick={() => executeCommand(item)}
                      className="workspace-command-item flex w-full items-center justify-between gap-4 rounded-xl px-3 py-3 text-left text-zinc-300 hover:bg-zinc-800 hover:text-white cursor-pointer transition-colors"
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold">{item.name}</span>
                        <span className="mt-0.5 block truncate text-xs text-zinc-500">{item.description}</span>
                      </span>
                      <span className="shrink-0 rounded bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-500 uppercase tracking-wider">
                        {item.category}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-4 p-2">
                  <div>
                    <h5 className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Quick access</h5>
                    <div className="grid gap-2 sm:grid-cols-3">
                      {quickAccess.map((item) => {
                        const Icon = item.icon;
                        return <button
                          type="button"
                          key={item.href}
                          onClick={() => executeCommand(item)}
                          className="workspace-command-item group flex min-h-[8.4rem] flex-col items-start rounded-xl border border-zinc-850 bg-zinc-950/60 p-3 text-left text-zinc-300 transition-colors hover:border-zinc-700 hover:bg-zinc-900 hover:text-white"
                        >
                          <span className="grid h-8 w-8 place-items-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 group-hover:text-white"><Icon className="h-4 w-4" /></span>
                          <span className="mt-3 text-xs font-bold">{item.name}</span>
                          <span className="mt-1 text-[9px] leading-relaxed text-zinc-500">{item.description}</span>
                        </button>;
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Topbar;
