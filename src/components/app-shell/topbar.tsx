'use client';

import * as React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Search, Sparkles, Command, Menu, X, BrainCircuit, Play, ArrowRight, Sun, Moon } from 'lucide-react';
import { Button } from '../ui/button';
import { formatUserMessage } from '@/lib/utils';
import { PrismIcon } from '../ui/prism-icon';

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
  const [prismQuery, setPrismQuery] = React.useState('');
  const [commandResults, setCommandResults] = React.useState<CommandItem[]>([]);
  const [theme, setTheme] = React.useState<'dark' | 'light'>('dark');

  React.useEffect(() => {
    fetch('/api/workspace').then((res) => res.ok ? res.json() : null).then((workspace) => {
      if (workspace?.user?.preferences?.theme) setTheme(workspace.user.preferences.theme);
    }).catch(() => undefined);
  }, []);

  React.useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    void fetch('/api/workspace', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: { preferences: { theme: nextTheme } } }),
    });
    window.dispatchEvent(new CustomEvent('theme-changed', { detail: nextTheme }));
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

  const handlePrismSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prismQuery.trim()) return;
    
    // Redirect to prism chat with pre-filled query
    router.push(`/prism?q=${encodeURIComponent(prismQuery)}`);
    setPrismQuery('');
  };

  const navCommands = [
    { name: 'Go to Dashboard', category: 'Navigation', href: '/dashboard' },
    { name: 'Go to Finance Ledger', category: 'Navigation', href: '/finance' },
    { name: 'Go to Client Portfolio', category: 'Navigation', href: '/clients' },
    { name: 'Go to Project Delivery', category: 'Navigation', href: '/projects' },
    { name: 'Go to Prism AI Intelligence', category: 'Navigation', href: '/prism' },
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
      router.push(item.href);
    } else if (item.action) {
      alert(formatUserMessage(`Lohith, triggering action: ${item.name}`));
    }
  };

  return (
    <>
      <header className="flex h-16 w-full items-center justify-between border-b border-zinc-800 bg-[#09090b] px-6">
        {/* Left: Mobile Toggle & Brand indicator */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuToggle}
            className="md:hidden text-zinc-400 hover:text-white"
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Quick Portfolio Stats */}
          {!isClient && (
            <div className="hidden lg:flex items-center gap-6 text-xs border-r border-zinc-800 pr-6 mr-1">
              <div className="flex items-center gap-2">
                <span className="text-zinc-500 font-medium">Agency Health Score:</span>
                <span className="font-semibold text-white px-2 py-0.5 rounded-none bg-zinc-900 border border-zinc-800">84/100</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-zinc-500 font-medium">Active Leaks:</span>
                <span className="font-semibold notification-risk-alert text-rose-400 px-2 py-0.5 rounded-none bg-rose-950/20 border border-rose-900/30">2 Detected</span>
              </div>
            </div>
          )}
        </div>

        {/* Center: Ask Prism Form */}
        {!isClient && (
          <div className="flex-1 max-w-md mx-4 hidden md:block">
            <form onSubmit={handlePrismSubmit} className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <PrismIcon className="h-3.5 w-3.5" />
              </div>
              <input
                type="text"
                placeholder="Ask Prism AI (e.g. summarize health, forecast)..."
                value={prismQuery}
                onChange={(e) => setPrismQuery(e.target.value)}
                className="w-full rounded-md border border-zinc-800 bg-zinc-900/40 py-1.5 pl-9 pr-3 text-xs text-white placeholder-zinc-500 focus:border-zinc-700 focus:bg-zinc-900/80 focus:outline-none focus:ring-0 transition-all font-sans"
              />
              <button type="submit" className="hidden" />
            </form>
          </div>
        )}

        {/* Right: Search & Theme Toggle */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-9 w-9 text-zinc-400 hover:text-white border border-zinc-800 bg-zinc-950 flex items-center justify-center cursor-pointer transition-colors"
            title="Toggle theme profile"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

            {!isClient && (
              <div
                onClick={() => setIsCommandOpen(true)}
                className="flex h-9 w-40 items-center justify-between rounded-md border border-zinc-800 bg-zinc-950 px-3 text-xs text-zinc-500 hover:border-zinc-700 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Search className="h-3.5 w-3.5 text-zinc-500" />
                  <span>Search...</span>
                </div>
                <div className="flex items-center gap-0.5 rounded bg-zinc-900 px-1.5 py-0.5 text-[9px] border border-zinc-800 text-zinc-400 font-mono">
                  <Command className="h-2 w-2 mr-0.5" />
                  <span>K</span>
                </div>
              </div>
            )}
        </div>
      </header>

      {/* Command Menu Modal Dialog */}
      {isCommandOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={() => {
              setIsCommandOpen(false);
              setSearchQuery('');
              setCommandResults([]);
            }}
          />

          {/* Dialog Container */}
          <div className="relative z-50 w-full max-w-lg overflow-hidden rounded-lg border border-zinc-800 bg-[#0d0e12] shadow-2xl transition-all">
            <div className="flex items-center border-b border-zinc-800 px-4">
              <Search className="h-4 w-4 text-zinc-500 mr-2" />
              <input
                type="text"
                autoFocus
                placeholder="Type a route command or action (e.g. dashboard, sync)..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="h-12 w-full bg-transparent text-sm text-white placeholder-zinc-500 focus:outline-none"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setIsCommandOpen(false);
                  setSearchQuery('');
                  setCommandResults([]);
                }}
                className="h-8 w-8 text-zinc-500 hover:text-white"
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
                      className="flex items-center justify-between rounded-md px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white cursor-pointer transition-colors"
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
                          className="flex items-center gap-2 rounded-md px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-900 hover:text-white cursor-pointer transition-colors"
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
                        router.push('/prism');
                      }}
                      className="flex items-center justify-between rounded-md bg-zinc-900/40 border border-zinc-800/80 p-3 mx-1 hover:bg-zinc-900 cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <BrainCircuit className="h-4.5 w-4.5 text-zinc-300" />
                        <div>
                          <span className="block text-xs font-semibold text-white">Ask Prism Command Center</span>
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
