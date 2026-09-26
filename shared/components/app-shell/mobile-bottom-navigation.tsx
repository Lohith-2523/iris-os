'use client';

import Link from 'next/link';
import { CalendarDays, FolderKanban, Gauge, ListChecks, Menu, MessageSquare, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWorkspaceRuntime } from '@/components/demo/demo-mode-provider';

type Props = { role?: string; plan?: string; accessPermissions?: string[] | null; deliveryWorkspace?: boolean; onMore: () => void };
type Destination = { href: string; label: string; icon: typeof Gauge };

function destinationsFor(role: string, plan: string): Destination[] {
  if (role === 'client') return [
    ...(plan === 'BASIC' ? [] : [{ href: '/client-dashboard', label: 'Home', icon: Gauge }]),
    { href: '/client-leads', label: 'Leads', icon: Users },
    { href: '/calendar', label: 'Calendar', icon: CalendarDays },
    { href: '/messages', label: 'Messages', icon: MessageSquare },
  ];
  if (role === 'member') return [
    { href: '/teams-dashboard', label: 'Home', icon: Gauge },
    { href: '/tasks', label: 'Tasks', icon: ListChecks },
    { href: '/calendar', label: 'Calendar', icon: CalendarDays },
    { href: '/messages', label: 'Messages', icon: MessageSquare },
  ];
  return [
    { href: '/dashboard', label: 'Home', icon: Gauge },
    { href: '/clients', label: 'Clients', icon: Users },
    { href: '/projects', label: 'Projects', icon: FolderKanban },
    { href: '/calendar', label: 'Calendar', icon: CalendarDays },
  ];
}

export function MobileBottomNavigation({ role = '', plan = 'BASIC', accessPermissions, deliveryWorkspace = false, onMore }: Props) {
  const { pathname } = useWorkspaceRuntime();
  const normalizedRole = role.toLowerCase();
  const allowed = new Set(accessPermissions || []);
  const destinationRole = normalizedRole === 'sub_admin' && deliveryWorkspace ? 'member' : normalizedRole;
  const destinations = destinationsFor(destinationRole, plan).filter((item) => normalizedRole !== 'sub_admin' || deliveryWorkspace || allowed.has(item.href.split('/').filter(Boolean)[0]));

  return (
    <nav className="workspace-mobile-nav" aria-label="Primary workspace navigation">
      {destinations.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return <Link key={item.href} href={item.href} prefetch={false} aria-current={active ? 'page' : undefined} className={cn('workspace-mobile-nav-item', active && 'is-active')}><Icon aria-hidden="true" /><span>{item.label}</span></Link>;
      })}
      <button type="button" className="workspace-mobile-nav-item" onClick={onMore} aria-label="Open all workspace navigation"><Menu aria-hidden="true" /><span>More</span></button>
    </nav>
  );
}
