'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Bell, CalendarClock, CheckCheck, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DateTimeInput } from '@/components/ui/date-input';

type Notification = { id: string; type: string; title: string; body: string; href: string | null; actionLabel: string | null; readAt: string | null; createdAt: string };

export function NotificationCenter() {
  const router = useRouter();
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
  }, []);
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

  const openNotification = async (item: Notification) => {
    if (!item.readAt) await post({ action: 'mark_read', id: item.id });
    setOpen(false);
    if (item.href) router.push(item.href);
  };

  const createReminder = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const ok = await post({ action: 'create', type: 'REMINDER', title: reminder.title, body: `Reminder: ${reminder.title}`, href: reminder.href, actionLabel: 'Open', scheduledAt: new Date(reminder.scheduledAt).toISOString() });
    setSaving(false);
    if (ok) { setReminder({ title: '', scheduledAt: '', href: '/dashboard' }); setShowReminder(false); }
  };

  return <div className="relative">
    {popup && <div role="alert" className="fixed right-5 top-20 z-[100] w-[min(92vw,410px)] rounded-2xl border border-zinc-700 bg-zinc-950 p-4 text-white shadow-2xl">
      <div className="flex items-start justify-between gap-4"><div><div className="font-bold">{popup.title}</div><p className="mt-1 leading-relaxed text-zinc-400">{popup.body}</p></div><button type="button" onClick={() => setPopup(null)} aria-label="Dismiss notification" className="text-zinc-500 hover:text-white"><X className="h-4 w-4" /></button></div>
      <Button type="button" size="sm" className="mt-3" onClick={() => { setPopup(null); void openNotification(popup); }}>{popup.actionLabel}</Button>
    </div>}
    <button type="button" onClick={() => setOpen((value) => !value)} className="relative grid h-11 w-11 place-items-center rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white" aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}>
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && <span className="absolute -right-1 -top-1 min-w-6 rounded-full bg-white px-1.5 py-0.5 text-center text-xs font-bold text-zinc-950">{unreadCount > 99 ? '99+' : unreadCount}</span>}
    </button>
    {open && <div className="absolute right-0 top-14 z-[80] w-[min(92vw,460px)] overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl">
      <div className="flex items-center justify-between border-b border-zinc-800 p-4"><div><div className="font-bold text-white">Notifications</div><div className="text-zinc-500">Updates, approvals, messages, delays, and reminders</div></div><button onClick={() => setOpen(false)} aria-label="Close notifications"><X className="h-5 w-5" /></button></div>
      <div className="flex gap-2 border-b border-zinc-800 p-3"><Button size="sm" variant="outline" onClick={() => setShowReminder((value) => !value)}><CalendarClock className="mr-2 h-4 w-4" /> Add reminder</Button><Button size="sm" variant="ghost" onClick={() => void post({ action: 'mark_all_read' })}><CheckCheck className="mr-2 h-4 w-4" /> Mark all read</Button></div>
      {showReminder && <form className="space-y-3 border-b border-zinc-800 bg-zinc-900/30 p-4" onSubmit={createReminder}>
        <input required value={reminder.title} onChange={(event) => setReminder({ ...reminder, title: event.target.value })} placeholder="Reminder title" className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-white" />
        <div className="grid grid-cols-2 gap-3">
          <DateTimeInput required value={reminder.scheduledAt} onChange={(value) => setReminder({ ...reminder, scheduledAt: value })} className="grid grid-cols-[minmax(0,1fr)_8rem] gap-2" dateInputClassName="min-w-0 rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-white" timeInputClassName="rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-white" />
          <select value={reminder.href} onChange={(event) => setReminder({ ...reminder, href: event.target.value })} className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-white"><option value="/dashboard">Dashboard</option><option value="/agency-leads">Leads</option><option value="/tasks">Tasks</option><option value="/clients">Clients</option><option value="/calendar">Calendar</option></select>
        </div>
        <Button disabled={saving} type="submit">{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Schedule reminder</Button>
      </form>}
      <div className="max-h-[520px] overflow-y-auto">{items.length ? items.map((item) => <button key={item.id} onClick={() => void openNotification(item)} className={`block w-full border-b border-zinc-900 p-4 text-left hover:bg-zinc-900/60 ${item.readAt ? 'opacity-65' : 'bg-zinc-900/25'}`}><div className="flex items-start justify-between gap-3"><div className="font-semibold text-white">{item.title}</div><span className="rounded-full border border-zinc-800 px-2 py-0.5 text-xs text-zinc-400">{item.type}</span></div><div className="mt-1 leading-relaxed text-zinc-400">{item.body}</div><div className="mt-2 flex items-center justify-between text-zinc-600"><span>{new Date(item.createdAt).toLocaleString()}</span>{item.actionLabel && <span className="font-semibold text-zinc-300">{item.actionLabel} →</span>}</div></button>) : <div className="p-10 text-center text-zinc-500">You’re all caught up.</div>}</div>
    </div>}
  </div>;
}
