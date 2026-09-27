'use client';

import * as React from 'react';
import { Bell, CalendarClock, CheckCheck, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DateTimeInput } from '@/components/ui/date-input';
import { useWorkspaceRuntime } from '@/components/demo/demo-mode-provider';

type Notification = { id: string; type: string; title: string; body: string; href: string | null; actionLabel: string | null; readAt: string | null; createdAt: string };

const notificationTone = (type: string) => {
  if (type === 'ISSUE') return { priority: 'Critical', title: 'text-rose-300', glow: 'shadow-[inset_0_-18px_24px_-24px_rgba(244,63,94,0.95)]' };
  if (type === 'DELAY' || type === 'APPROVAL') return { priority: 'High', title: 'text-amber-300', glow: 'shadow-[inset_0_-18px_24px_-24px_rgba(245,158,11,0.9)]' };
  if (type === 'MESSAGE' || type === 'REMINDER') return { priority: 'Medium', title: 'text-sky-300', glow: 'shadow-[inset_0_-18px_24px_-24px_rgba(56,189,248,0.85)]' };
  return { priority: 'Low', title: 'text-zinc-200', glow: 'shadow-[inset_0_-18px_24px_-24px_rgba(161,161,170,0.7)]' };
};

export function NotificationCenter() {
  const runtime = useWorkspaceRuntime();
  const router = runtime.router;
  const fetch = runtime.fetch;
  const [open, setOpen] = React.useState(false);
  const [items, setItems] = React.useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [showReminder, setShowReminder] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [popup, setPopup] = React.useState<Notification | null>(null);
  const [reminder, setReminder] = React.useState({ title: '', scheduledAt: '', href: '/dashboard' });
  const initialized = React.useRef(false);
  const knownNotificationIds = React.useRef(new Set<string>());

  const load = React.useCallback(async () => {
    const response = await fetch('/api/notifications', { cache: 'no-store' });
    if (!response.ok) return;
    const payload = await response.json();
    const nextItems: Notification[] = payload.notifications || [];
    if (initialized.current) {
      const countersignNotification = nextItems.find(item => !item.readAt && item.actionLabel === 'Countersign now' && !knownNotificationIds.current.has(item.id));
      if (countersignNotification) setPopup(countersignNotification);
    } else initialized.current = true;
    knownNotificationIds.current = new Set(nextItems.map(item => item.id));
    setItems(nextItems);
    setUnreadCount(payload.unreadCount || 0);
  }, [fetch]);
  React.useEffect(() => { void load(); const timer = window.setInterval(() => void load(), 30_000); return () => window.clearInterval(timer); }, [load]);
  React.useEffect(() => {
    if (!popup) return;
    const timer = window.setTimeout(() => setPopup(null), 10_000);
    return () => window.clearTimeout(timer);
  }, [popup]);

  const post = async (body: Record<string, unknown>) => {
    const response = await fetch('/api/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (response.ok) await load();
    return response.ok;
  };

  const openNotification = (item: Notification) => {
    setOpen(false);
    setPopup(null);
    if (item.href) router.push(item.href);
    if (!item.readAt) void post({ action: 'mark_read', id: item.id });
  };

  const createReminder = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const ok = await post({ action: 'create', type: 'REMINDER', title: reminder.title, body: `Reminder: ${reminder.title}`, href: reminder.href, actionLabel: 'Open', scheduledAt: new Date(reminder.scheduledAt).toISOString() });
    setSaving(false);
    if (ok) { setReminder({ title: '', scheduledAt: '', href: '/dashboard' }); setShowReminder(false); }
  };

  const renderNotification = (item: Notification) => {
    const tone = notificationTone(item.type);
    return <button
      key={item.id}
      data-priority={tone.priority.toLowerCase()}
      onClick={() => openNotification(item)}
      className={`block w-full border-b border-zinc-900 px-4 py-3 text-left transition-colors hover:bg-zinc-900/60 ${item.readAt ? 'opacity-60' : 'bg-zinc-900/25'}`}
    >
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.readAt ? 'bg-zinc-700' : 'bg-white'}`} />
        <div className="min-w-0 flex-1">
          <div className={`truncate font-semibold ${tone.title}`}>{item.title}</div>
          <div className="mt-1 line-clamp-2 text-xs leading-relaxed text-zinc-400">{item.body}</div>
          <div className="mt-1 text-xs text-zinc-600">{new Date(item.createdAt).toLocaleString()}</div>
          {item.href && <div className="mt-2 text-[10px] font-bold uppercase tracking-wider text-zinc-300">{item.actionLabel || 'Open item'} →</div>}
        </div>
      </div>
    </button>;
  };

  return <div className="relative">
    {popup && <div role="alert" data-priority={notificationTone(popup.type).priority.toLowerCase()} className={`fixed right-5 top-20 z-[100] w-[min(92vw,410px)] rounded-2xl border border-zinc-700 bg-zinc-950 p-4 text-white shadow-2xl ${notificationTone(popup.type).glow}`}>
      <div className="flex items-start justify-between gap-4"><div className={`font-bold ${notificationTone(popup.type).title}`}>{popup.title}</div><button type="button" onClick={() => setPopup(null)} aria-label="Dismiss notification" className="text-zinc-500 hover:text-white"><X className="h-4 w-4" /></button></div>
      <Button type="button" size="sm" className="mt-3" onClick={() => openNotification(popup)}>{popup.actionLabel || 'Open item'}</Button>
    </div>}
    <button type="button" onClick={() => setOpen((value) => !value)} className="relative grid h-11 w-11 place-items-center rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white" aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}>
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && <span className="absolute -right-1 -top-1 min-w-6 rounded-full bg-white px-1.5 py-0.5 text-center text-xs font-bold text-zinc-950">{unreadCount > 99 ? '99+' : unreadCount}</span>}
    </button>
    {open && <div className="absolute right-0 top-14 z-[80] w-[min(92vw,460px)] overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl">
      <div className="flex items-center justify-between border-b border-zinc-800 p-4"><div className="font-bold text-white">Notifications</div><button onClick={() => setOpen(false)} aria-label="Close notifications"><X className="h-5 w-5" /></button></div>
      <div className="flex gap-2 border-b border-zinc-800 p-3"><Button size="sm" variant="outline" onClick={() => setShowReminder((value) => !value)}><CalendarClock className="mr-2 h-4 w-4" /> Add reminder</Button><Button size="sm" variant="ghost" onClick={() => void post({ action: 'mark_all_read' })}><CheckCheck className="mr-2 h-4 w-4" /> Mark all read</Button></div>
      {showReminder && <form className="space-y-3 border-b border-zinc-800 bg-zinc-900/30 p-4" onSubmit={createReminder}>
        <input required value={reminder.title} onChange={(event) => setReminder({ ...reminder, title: event.target.value })} placeholder="Reminder title" className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-white" />
        <div className="grid gap-3">
          <DateTimeInput required value={reminder.scheduledAt} onChange={(value) => setReminder({ ...reminder, scheduledAt: value })} className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(11rem,1.5fr)_minmax(7.5rem,.75fr)]" dateInputClassName="h-12 min-w-0 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white" timeInputClassName="h-12 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-3 text-sm text-white" />
          <select value={reminder.href} onChange={(event) => setReminder({ ...reminder, href: event.target.value })} className="h-12 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-3 text-white"><option value="/dashboard">Dashboard</option><option value="/agency-leads">Leads</option><option value="/tasks">Tasks</option><option value="/clients">Clients</option><option value="/calendar">Calendar</option></select>
        </div>
        <Button data-duplicate-sensitive disabled={saving} type="submit">{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Schedule reminder</Button>
      </form>}
      <div className="max-h-[520px] overflow-y-auto">{items.length ? items.map(renderNotification) : <div className="p-10 text-center text-zinc-500">You’re all caught up.</div>}</div>
    </div>}
  </div>;
}
