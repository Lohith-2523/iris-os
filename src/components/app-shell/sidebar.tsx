'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn, obfuscateEmail } from '@/lib/utils';
import { createClient } from '@/lib/client';
import { PrismIcon } from '@/components/ui/prism-icon';
import {
  LayoutDashboard,
  DollarSign,
  Users,
  FolderKanban,
  UserCheck,
  FileText,
  BarChart3,
  Sparkles,
  Zap,
  TrendingUp,
  Activity,
  Blocks,
  Settings,
  LogOut,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Megaphone,
  Calendar,
  FileSpreadsheet
} from 'lucide-react';

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  onCloseMobile?: () => void;
}

export function Sidebar({ className, onCloseMobile, ...props }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [orgName, setOrgName] = React.useState('Apex Creative');
  const [plan, setPlan] = React.useState('');
  const [user, setUser] = React.useState<{ name: string; email: string; role: string } | null>(null);
  const [, setSession] = React.useState<import('@supabase/supabase-js').Session | null>(null);
  const [isCollapsed, setIsCollapsed] = React.useState(true);
  const [theme, setTheme] = React.useState<'dark' | 'light'>('dark');

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('iris-theme') as 'dark' | 'light' | null;
      if (savedTheme) {
        setTheme(savedTheme);
      } else {
        setTheme(document.documentElement.classList.contains('light') ? 'light' : 'dark');
      }

      const handleThemeChange = (e: Event) => {
        const nextTheme = (e as CustomEvent).detail || (document.documentElement.classList.contains('light') ? 'light' : 'dark');
        setTheme(nextTheme);
      };

      window.addEventListener('theme-changed', handleThemeChange);
      return () => window.removeEventListener('theme-changed', handleThemeChange);
    }
  }, []);

  const loadOrg = async () => {
    try {
      const res = await fetch('/api/organization');
      if (res.ok) {
        const data = await res.json();
        setOrgName(data.name || 'Apex Creative');
        setPlan(data.plan || '');
        if (data.currency) {
          const currentLocal = localStorage.getItem('dashboardCurrency');
          if (currentLocal !== data.currency) {
            localStorage.setItem('dashboardCurrency', data.currency);
            window.dispatchEvent(new Event('currency-updated'));
          }
        }
      }
    } catch (e) {
      console.error('Error loading org in sidebar:', e);
    }
  };

  const loadUser = React.useCallback(async (emailParam?: string) => {
    try {
      const email = emailParam || localStorage.getItem('currentUserEmail') || sessionStorage.getItem('currentUserEmail') || 'lohith@apex.co';
      const res = await fetch(`/api/user?email=${encodeURIComponent(obfuscateEmail(email))}`);
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        const defaultName = email === 'lohith@apex.co' ? 'Lohith Sundar' : (localStorage.getItem('signup_name') || 'Executive User');
        setUser({ name: defaultName, email: email, role: 'ADMIN' });
      }
    } catch (e) {
      console.error('Error loading user in sidebar:', e);
      const targetEmail = emailParam || 'lohith@apex.co';
      const defaultName = targetEmail === 'lohith@apex.co' ? 'Lohith Sundar' : (localStorage.getItem('signup_name') || 'Executive User');
      setUser({ name: defaultName, email: targetEmail, role: 'ADMIN' });
    }
  }, []);

  React.useEffect(() => {
    Promise.resolve().then(() => {
      loadOrg();
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        loadUser(session.user.email);
      } else {
        loadUser();
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        loadUser(session.user.email);
      } else {
        setUser(null);
      }
    });

    // Listen to changes from settings update
    const handleOrgUpdate = () => loadOrg();
    const handleUserUpdate = () => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          loadUser(session.user.email);
        } else {
          loadUser();
        }
      });
    };

    window.addEventListener('organization-updated', handleOrgUpdate);
    window.addEventListener('user-updated', handleUserUpdate);
    
    return () => {
      subscription.unsubscribe();
      window.removeEventListener('organization-updated', handleOrgUpdate);
      window.removeEventListener('user-updated', handleUserUpdate);
    };
  }, [supabase.auth, loadUser]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('currentUserEmail');
    localStorage.removeItem('remember_me');
    sessionStorage.clear();
    document.cookie = "currentUserEmail=; path=/; max-age=0";
    document.cookie = "currentUserRole=; path=/; max-age=0";
    router.push('/login');
  };

  const navigationItems = React.useMemo(() => [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Finance', href: '/finance', icon: DollarSign },
    { name: 'Clients', href: '/clients', icon: Users },
    { name: 'Projects', href: '/projects', icon: FolderKanban },
    { name: 'Tasks', href: '/tasks', icon: Activity },
    { name: 'Calendar', href: '/calendar', icon: Calendar },
    { name: 'Team', href: '/team', icon: UserCheck },
    { name: 'Reporting', href: '/reporting', icon: FileText },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    { name: 'Agency Leads', href: '/agency-leads', icon: FileSpreadsheet },
    { name: 'Prism AI', href: '/prism', icon: PrismIcon, highlight: true },
    { name: 'Settings', href: '/settings', icon: Settings },
  ], []);

  const visibleItems = React.useMemo(() => {
    const roleLower = user?.role?.toLowerCase();
    if (roleLower === 'client') {
      return [
        { name: 'Client Dashboard', href: '/client-dashboard', icon: LayoutDashboard },
        { name: 'Calendar', href: '/calendar', icon: Calendar }
      ];
    }
    if (roleLower === 'member') {
      return [
        { name: 'Teams Dashboard', href: '/teams-dashboard', icon: LayoutDashboard }
      ];
    }
    return navigationItems;
  }, [user, navigationItems]);

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
        'flex h-full flex-col border-r border-zinc-800 bg-[#09090b] text-zinc-400 transition-all duration-300 relative shrink-0',
        isCollapsed ? 'w-20' : 'w-64',
        className
      )}
      {...props}
    >
      {/* Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-6 z-50 flex h-6 w-6 items-center justify-center rounded-full border border-zinc-800 bg-[#09090b] text-zinc-400 hover:text-white shadow-md cursor-pointer"
        title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
      >
        {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
      </button>

      <div className={cn("flex h-16 items-center border-b border-zinc-800", isCollapsed ? "justify-center px-2" : "justify-between px-6")}>
        <Link href={user?.role?.toLowerCase() === 'client' ? '/meta-portal' : user?.role?.toLowerCase() === 'member' ? '/teams-dashboard' : '/dashboard'} className="flex items-center gap-2" onClick={onCloseMobile}>
          {isCollapsed ? (
            <img 
              src={theme === 'light' ? "/iris-logo-black-transparent.png" : "/iris-logo-white-transparent.png"} 
              alt="Iris OS Logo" 
              className="h-8 w-8 object-contain" 
            />
          ) : (
            <div className="flex items-center gap-2">
              <img 
                src={theme === 'light' ? "/iris-logo-white-bg.png" : "/iris-logo-black-bg.png"} 
                alt="Iris OS Logo" 
                className="h-8 object-contain" 
              />
              <span className="block text-[10px] text-zinc-500 font-medium self-end pb-0.5">Enterprise Suite</span>
            </div>
          )}
        </Link>
      </div>

      {/* Brand Switcher / Org details */}
      <div className="px-2 py-3 border-b border-zinc-900 bg-zinc-950/40">
        <div className={cn(
          "flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 cursor-pointer",
          isCollapsed ? "p-1.5 justify-center" : "px-3 py-2"
        )}>
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded bg-zinc-100 text-zinc-800 border border-zinc-200 dark:bg-zinc-700 dark:text-white dark:border-none flex items-center justify-center text-[10px] font-bold shrink-0">
              {initials || 'AP'}
            </div>
            {!isCollapsed && <span className="text-xs font-semibold text-zinc-200 truncate">{orgName}</span>}
          </div>
          {!isCollapsed && <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />}
        </div>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-2 py-4">
        <nav className="space-y-1">
          {visibleItems.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onCloseMobile}
                title={isCollapsed ? item.name : undefined}
                className={cn(
                  'group flex items-center rounded-md transition-all duration-150',
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
        </nav>
      </div>

      {/* User Footer Profile */}
      <div className="border-t border-zinc-800 p-3 bg-zinc-950/20">
        {user ? (
          <div className={cn("flex items-center", isCollapsed ? "flex-col gap-2 justify-center" : "justify-between")}>
            <div className="flex items-center gap-2.5 truncate">
              <div className="h-7 w-7 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700 text-white font-bold text-[10px] shrink-0">
                {userInitials}
              </div>
              {!isCollapsed && (
                <div className="truncate">
                  <span className="block text-xs font-semibold text-white leading-none">
                    {user?.name || (typeof window !== 'undefined' && (localStorage.getItem('currentUserEmail') || sessionStorage.getItem('currentUserEmail')) === 'lohith@apex.co' ? 'Lohith Sundar' : (typeof window !== 'undefined' ? localStorage.getItem('signup_name') || 'Executive User' : 'Executive User'))}
                  </span>
                  <span className="text-[10px] text-zinc-500 mt-1 block truncate">
                    {user?.email || 'lohith@apex.co'} {plan ? `(${plan})` : ''}
                  </span>
                </div>
              )}
            </div>
            <button
              onClick={handleSignOut}
              className="h-8 w-8 rounded-md flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-900 cursor-pointer shrink-0"
              title="Sign Out"
            >
              <LogOut className="h-4.5 w-4.5" />
            </button>
          </div>
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
    </div>
  );
}

export default Sidebar;
