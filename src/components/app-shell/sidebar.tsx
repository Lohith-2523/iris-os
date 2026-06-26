'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/client';
import {
  LayoutDashboard,
  DollarSign,
  Users,
  FolderKanban,
  UserCheck,
  FileText,
  BarChart3,
  Palette,
  Sparkles,
  Zap,
  TrendingUp,
  Activity,
  Blocks,
  Settings,
  LogOut,
  ChevronDown,
  Megaphone
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

  const loadOrg = async () => {
    try {
      const res = await fetch('/api/organization');
      if (res.ok) {
        const data = await res.json();
        setOrgName(data.name || 'Apex Creative');
        setPlan(data.plan || '');
      }
    } catch (e) {
      console.error('Error loading org in sidebar:', e);
    }
  };

  const loadUser = React.useCallback(async (emailParam?: string) => {
    try {
      const email = emailParam || localStorage.getItem('currentUserEmail') || 'lohith@apex.co';
      const res = await fetch(`/api/user?email=${encodeURIComponent(email)}`);
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        setUser({ name: 'Lohith Kumar', email: email, role: 'ADMIN' });
      }
    } catch (e) {
      console.error('Error loading user in sidebar:', e);
      setUser({ name: 'Lohith Kumar', email: emailParam || 'lohith@apex.co', role: 'ADMIN' });
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
    document.cookie = "currentUserEmail=; path=/; max-age=0";
    router.push('/login');
  };

  const navigationItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Finance', href: '/finance', icon: DollarSign },
    { name: 'Clients', href: '/clients', icon: Users },
    { name: 'Projects', href: '/projects', icon: FolderKanban },
    { name: 'Team', href: '/team', icon: UserCheck },
    { name: 'Reporting', href: '/reporting', icon: FileText },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    {
      name: 'Design Hub',
      href: '/design-hub',
      icon: Palette,
      badge: 'Canva',
    },
    { name: 'Meta Portal', href: '/meta-portal', icon: Megaphone },
    { name: 'Prism AI', href: '/prism', icon: Sparkles, highlight: true },
    { name: 'Automations', href: '/automations', icon: Zap },
    { name: 'Forecasting', href: '/forecasting', icon: TrendingUp },
    { name: 'Operations', href: '/operations', icon: Activity },
    { name: 'Integrations', href: '/integrations', icon: Blocks },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const visibleItems = React.useMemo(() => {
    if (user?.role?.toLowerCase() === 'client') {
      return navigationItems.filter(item => item.name === 'Meta Portal');
    }
    return navigationItems;
  }, [user]);

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
        'flex h-full w-64 flex-col border-r border-zinc-800 bg-[#09090b] text-zinc-400',
        className
      )}
      {...props}
    >
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between px-6 border-b border-zinc-800">
        <Link href={user?.role?.toLowerCase() === 'client' ? '/meta-portal' : '/dashboard'} className="flex items-center gap-2" onClick={onCloseMobile}>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 font-bold text-black shadow-md border border-zinc-200">
            I
          </div>
          <div>
            <span className="text-sm font-bold tracking-tight text-white">IrisOS</span>
            <span className="block text-[10px] text-zinc-500 font-medium">Enterprise Suite</span>
          </div>
        </Link>
      </div>

      {/* Brand Switcher / Org details */}
      <div className="px-4 py-3 border-b border-zinc-900 bg-zinc-950/40">
        <div className="flex items-center justify-between rounded-md border border-zinc-800 px-3 py-2 bg-zinc-900/50 hover:bg-zinc-900 cursor-pointer">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded bg-zinc-700 flex items-center justify-center text-[10px] text-white font-bold">
              {initials || 'AP'}
            </div>
            <span className="text-xs font-semibold text-zinc-200 truncate">{orgName}</span>
          </div>
          <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
        </div>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <nav className="space-y-1">
          {visibleItems.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onCloseMobile}
                className={cn(
                  'group flex items-center justify-between rounded-md px-3 py-2 text-xs font-medium transition-all duration-150',
                  isActive
                    ? item.highlight
                      ? 'bg-zinc-900 text-white border-l-2 border-l-zinc-300'
                      : 'bg-zinc-900 text-white border-l-2 border-l-white'
                    : 'hover:bg-zinc-950 hover:text-zinc-200',
                  item.highlight && !isActive && 'text-zinc-300 font-semibold'
                )}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={cn(
                      'h-4 w-4 shrink-0 transition-colors',
                      isActive
                        ? item.highlight
                          ? 'text-zinc-200'
                          : 'text-white'
                        : 'text-zinc-500 group-hover:text-zinc-300',
                      item.highlight && !isActive && 'text-zinc-300'
                    )}
                  />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
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
      <div className="border-t border-zinc-800 p-4 bg-zinc-950/20">
        {user ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 truncate">
              <div className="h-7 w-7 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700 text-white font-bold text-[10px]">
                {userInitials}
              </div>
              <div className="truncate">
                <span className="block text-xs font-semibold text-white leading-none">
                  {user?.name || 'Lohith Kumar'}
                </span>
                <span className="text-[10px] text-zinc-500 mt-1 block truncate">
                  {user?.email || 'lohith@apex.co'} {plan ? `(${plan})` : ''}
                </span>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="h-8 w-8 rounded-md flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-900 cursor-pointer"
            >
              <LogOut className="h-4.5 w-4.5" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="text-zinc-500 text-[10px] text-center mb-1">Signed out of Supabase</div>
            <div className="flex gap-2">
              <Link
                href="/login"
                className="flex-1 rounded border border-zinc-800 bg-zinc-900 text-zinc-300 px-3 py-1.5 text-[10px] font-semibold hover:bg-zinc-800 hover:text-white transition-colors cursor-pointer text-center"
              >
                Sign In
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Sidebar;
