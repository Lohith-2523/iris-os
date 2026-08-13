'use client';

import * as React from 'react';
import { workspaceFetch as fetch } from '@/lib/workspace-data-cache';
import { useRouter, usePathname } from 'next/navigation';
import { Search, Sparkles, Command, Menu, X, BrainCircuit, Play, ArrowRight, Sun, Moon } from 'lucide-react';
import { Button } from '../ui/button';
import { formatUserMessage } from '@/lib/utils';
import { AtlasIcon } from '../ui/atlas-icon';
import { prepareWorkspaceDataCacheForRouteChange } from '@/lib/workspace-data-cache';
import { NotificationCenter } from '@/components/notifications/notification-center';
import {
  applyWorkspaceTheme,
  hasPersistedWorkspaceTheme,
  persistWorkspaceTheme,
  readWorkspaceTheme,
  type WorkspaceTheme,
} from '@/lib/workspace-theme';

interface TopbarProps {
  onMenuToggle: () => void;
}

interface CommandItem {
  name: string;
  category: string;
  href?: string;
  action?: string;
}

export function Topbar({ onMenuToggle }: TopbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isClient = pathname === '/client-dashboard';
  const [isCommandOpen, setIsCommandOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [atlasQuery, setAtlasQuery] = React.useState('');
  const [commandResults, setCommandResults] = React.useState<CommandItem[]>([]);
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
    void fetch('/api/workspace', { cache: 'no-store' })
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
  }, []);

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

  const navCommands = [
    { name: 'Go to Dashboard', category: 'Navigation', href: '/dashboard' },
    { name: 'Go to Finance Ledger', category: 'Navigation', href: '/finance' },
    { name: 'Go to Client Portfolio', category: 'Navigation', href: '/clients' },
    { name: 'Go to Project Delivery', category: 'Navigation', href: '/projects' },
    { name: 'Go to Atlas AI Intelligence', category: 'Navigation', href: '/atlas' },
    { name: 'Go to Settings Console', category: 'Navigation', href: '/settings' },
    { name: 'Export Latest Financial Report', category: 'Action', action: 'export-report' },
    { name: 'Review Contractor Profit Leak', category: 'Action', action: 'view-leak' },
  ];

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (!val.trim()) {
      setCommandResults([]);
      return;
    }

    const filtered = navCommands.filter((c) =>
      c.name.toLowerCase().includes(val.toLowerCase())
    );
    setCommandResults(filtered);
  };

  const executeCommand = (item: CommandItem) => {
    setIsCommandOpen(false);
    setSearchQuery('');
    setCommandResults([]);
    if (item.href) {
      prepareWorkspaceDataCacheForRouteChange(item.href);
      router.push(item.href);
    } else if (item.action) {
      alert(formatUserMessage(`Lohith, triggering action: ${item.name}`));
    }
  };

  return (
    <>
      <header className="workspace-topbar flex h-16 w-full items-center justify-between border-b border-zinc-800 bg-[#09090b] px-6">
        {/* Left: Mobile Toggle & Brand indicator */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuToggle}
            className="md:hidden text-zinc-400 hover:text-white"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </Button>

        </div>

        {/* Center: Ask Atlas Form */}
        {!isClient && (
          <div className="flex-1 max-w-md mx-4 hidden md:block">
            <form onSubmit={handleAtlasSubmit} className="workspace-topbar-search flex h-9 items-center gap-2.5 rounded-full border border-zinc-800 bg-zinc-900/40 pl-3 transition-all focus-within:border-zinc-700 focus-within:bg-zinc-900/80">
              <AtlasIcon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
              <input
                type="text"
                aria-label="Ask Atlas AI"
                placeholder="Ask Atlas AI"
                value={atlasQuery}
                onChange={(e) => setAtlasQuery(e.target.value)}
                className="!min-h-0 h-full min-w-0 flex-1 bg-transparent py-0 pr-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-0 font-sans"
              />
              <button type="submit" className="hidden" />
            </form>
          </div>
        )}

        {/* Right: Search & Theme Toggle */}
        <div className="flex items-center gap-3">
          <NotificationCenter />
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-9 w-9 text-zinc-400 hover:text-white border border-zinc-800 bg-zinc-950 flex items-center justify-center cursor-pointer transition-colors"
            title="Toggle theme profile"
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            aria-pressed={theme === 'light'}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

            {!isClient && (
              <button
                type="button"
                onClick={() => setIsCommandOpen(true)}
                className="workspace-topbar-search-trigger flex h-9 w-40 items-center justify-between rounded-full border border-zinc-800 bg-zinc-950 px-3 text-xs text-zinc-500 hover:border-zinc-700 cursor-pointer transition-colors"
                aria-label="Open workspace search"
              >
                <div className="flex items-center gap-2">
                  <Search className="h-3.5 w-3.5 text-zinc-500" />
                  <span>Search...</span>
                </div>
                <div className="flex items-center gap-0.5 rounded bg-zinc-900 px-1.5 py-0.5 text-[9px] border border-zinc-800 text-zinc-400 font-mono">
                  <Command className="h-2 w-2 mr-0.5" />
                  <span>K</span>
                </div>
              </button>
            )}
        </div>
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
              setCommandResults([]);
            }}
          />

          {/* Dialog Container */}
          <div
            className="workspace-command-dialog relative z-50 w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-800 bg-[#0d0e12] shadow-2xl transition-all"
            role="dialog"
            aria-modal="true"
            aria-label="Workspace command menu"
          >
            <div className="flex items-center gap-3 border-b border-zinc-800 p-3">
              <div className="workspace-command-search-field flex h-10 min-w-0 flex-1 items-center rounded-lg border border-zinc-800 bg-zinc-950 px-3">
                <Search className="mr-2 h-4 w-4 shrink-0 text-zinc-500" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Type a route command or action (e.g. dashboard, sync)..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="workspace-command-search-input !min-h-0 h-full w-full bg-transparent text-sm text-white placeholder-zinc-500 focus:outline-none"
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setIsCommandOpen(false);
                  setSearchQuery('');
                  setCommandResults([]);
                }}
                className="h-8 w-8 shrink-0 text-zinc-500 hover:text-white"
                aria-label="Close workspace search"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* List Results */}
            <div className="max-h-[300px] overflow-y-auto p-2">
              {searchQuery && commandResults.length === 0 ? (
                <div className="p-4 text-center text-xs text-zinc-500">
                  No matching commands found.
                </div>
              ) : searchQuery && commandResults.length > 0 ? (
                <div className="space-y-1">
                  {commandResults.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => executeCommand(item)}
                      className="workspace-command-item flex items-center justify-between rounded-xl px-3 py-2.5 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white cursor-pointer transition-colors"
                    >
                      <span>{item.name}</span>
                      <span className="rounded bg-zinc-900 border border-zinc-800 px-1.5 py-0.2 text-[9px] text-zinc-500 uppercase tracking-wider">
                        {item.category}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4 p-2">
                  <div>
                    <h5 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider px-2 mb-1.5">Suggestions</h5>
                    <div className="space-y-1">
                      {navCommands.slice(0, 4).map((item, idx) => (
                        <div
                          key={idx}
                          onClick={() => executeCommand(item)}
                          className="workspace-command-item flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs text-zinc-300 hover:bg-zinc-900 hover:text-white cursor-pointer transition-colors"
                        >
                          <Play className="h-3 w-3 text-zinc-500" />
                          <span>{item.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h5 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider px-2 mb-1.5">AI Operations</h5>
                    <div
                      onClick={() => {
                        setIsCommandOpen(false);
                        prepareWorkspaceDataCacheForRouteChange('/atlas');
                        router.push('/atlas');
                      }}
                      className="flex items-center justify-between rounded-md bg-zinc-900/40 border border-zinc-800/80 p-3 mx-1 hover:bg-zinc-900 cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <BrainCircuit className="h-4.5 w-4.5 text-zinc-300" />
                        <div>
                          <span className="block text-xs font-semibold text-white">Ask Atlas Command Center</span>
                          <span className="block text-[10px] text-zinc-500 mt-0.5">Solve profit leaks and check team capacity charts.</span>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-zinc-500" />
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
