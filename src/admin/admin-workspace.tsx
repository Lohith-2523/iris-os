'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Activity, BadgeDollarSign, Bug, Headphones, LayoutDashboard, LogOut, Settings, ShieldCheck, TicketPercent, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProfileAvatar } from '@/components/ui/profile-avatar';
import { ProfilePicturePicker } from '@/components/onboarding/profile-picture-picker';
import type { AdminDashboardData } from '@/server/admin/dashboard';
import type { SuperadminIdentity } from '@/server/admin/auth';
import { createClient } from '@/lib/client';

export type AdminSection = 'overview' | 'users' | 'revenue' | 'support' | 'incidents' | 'coupons' | 'access' | 'settings';
const sections: Array<{ id: AdminSection; label: string; icon: typeof Activity }> = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'revenue', label: 'Revenue', icon: BadgeDollarSign },
  { id: 'support', label: 'Support', icon: Headphones },
  { id: 'incidents', label: 'Errors & bugs', icon: Bug },
  { id: 'coupons', label: 'Coupons', icon: TicketPercent },
  { id: 'access', label: 'Admin access', icon: ShieldCheck },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const inputClass = 'mt-1 h-9 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-zinc-600';
const labelClass = 'block text-xs font-medium text-zinc-400';
const formClass = 'space-y-5 p-5';

function money(amount: number, currency: string) {
  return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', { style: 'currency', currency }).format(amount / 100);
}
function bytes(value: number) {
  if (!value) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  return `${(value / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`;
}
function date(value: string | null) {
  return value ? new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Never';
}

function Pill({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex rounded-full border border-zinc-800 bg-zinc-900 px-2 py-0.5 text-[11px] font-medium text-zinc-300">{children}</span>;
}
function Panel({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return <section className="rounded-xl border border-zinc-800/80 bg-zinc-950/70 shadow-sm"><header className="border-b border-zinc-800/80 px-5 py-4"><h2 className="font-medium text-zinc-100">{title}</h2>{description && <p className="mt-1 text-xs text-zinc-500">{description}</p>}</header>{children}</section>;
}
function Empty({ children }: { children: React.ReactNode }) { return <div className="px-5 py-12 text-center text-sm text-zinc-500">{children}</div>; }

export function AdminWorkspace({ section, data, admin }: { section: AdminSection; data: AdminDashboardData; admin: SuperadminIdentity }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const mutate = async (body: unknown) => {
    setBusy(true); setMessage('');
    const response = await fetch('/api/admin/manage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const result = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) { setMessage(result.error || 'Update failed.'); return false; }
    setMessage('Saved.'); router.refresh(); return true;
  };
  const title = sections.find((item) => item.id === section)?.label ?? 'Overview';

  return <div className="min-h-screen bg-[#09090b] text-zinc-100">
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-zinc-800 bg-[#0c0c0e] lg:flex lg:flex-col">
      <div className="flex h-20 flex-col items-start justify-center gap-1 border-b border-zinc-800 px-5 py-2">
        <Link href="/admin" aria-label="Superadmin overview">
          <Image src="/iris-logo-black-bg.png" alt="Iris OS Logo" width={113} height={43} className="h-[43px] w-auto object-contain" />
        </Link>
        <p className="pl-0.5 text-[10px] uppercase leading-none tracking-[0.18em] text-zinc-500">Superadmin</p>
      </div>
      <nav className="flex-1 space-y-1 p-3">{sections.map(({ id, label, icon: Icon }) => <Link key={id} href={id === 'overview' ? '/admin' : `/admin/${id}`} className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm ${section === id ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'}`}><Icon className="h-4 w-4" />{label}</Link>)}</nav>
      <Link href="/admin/settings" className="flex items-center gap-3 border-t border-zinc-800 p-4 hover:bg-zinc-900/70" aria-label="Open superadmin settings">
        <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full"><ProfileAvatar src={admin.avatarUrl} name={admin.name} /></div>
        <div className="min-w-0"><p className="truncate text-sm font-medium text-zinc-200">{admin.name}</p><p className="truncate text-xs text-zinc-500">{admin.email}</p></div>
        <Settings className="ml-auto h-4 w-4 shrink-0 text-zinc-600" />
      </Link>
    </aside>
    <main className="lg:pl-64">
      <header className="sticky top-0 z-10 border-b border-zinc-800 bg-[#09090b]/90 px-4 py-4 backdrop-blur md:px-8"><div className="mx-auto max-w-7xl"><div className="flex items-center justify-between"><div><h1 className="text-xl font-semibold">{title}</h1><p className="text-xs text-zinc-500">Updated {date(data.generatedAt)}</p></div>{message && <p role="status" className="text-xs text-zinc-300">{message}</p>}</div><nav className="mt-4 flex gap-2 overflow-x-auto lg:hidden">{sections.map(({ id, label }) => <Link key={id} href={id === 'overview' ? '/admin' : `/admin/${id}`} className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs ${section === id ? 'bg-zinc-200 text-zinc-950' : 'bg-zinc-900 text-zinc-400'}`}>{label}</Link>)}</nav></div></header>
      <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
        {section === 'overview' && <Overview data={data} />}
        {section === 'users' && <UsersView data={data} />}
        {section === 'revenue' && <RevenueView data={data} />}
        {section === 'support' && <SupportView data={data} mutate={mutate} busy={busy} />}
        {section === 'incidents' && <IncidentsView data={data} mutate={mutate} busy={busy} />}
        {section === 'coupons' && <CouponsView data={data} mutate={mutate} busy={busy} />}
        {section === 'access' && <AccessView data={data} admin={admin} mutate={mutate} busy={busy} />}
        {section === 'settings' && <SettingsView admin={admin} mutate={mutate} busy={busy} />}
      </div>
    </main>
  </div>;
}

function Overview({ data }: { data: AdminDashboardData }) {
  const cards = [
    ['Total users', data.metrics.totalUsers.toLocaleString(), 'All provisioned accounts'],
    ['Active users', data.metrics.activeUsers.toLocaleString(), 'Accounts with current access'],
    ['Superadmins', data.metrics.totalAdmins.toLocaleString(), `${data.metrics.customerAdminCount} customer workspace admins`],
    ['Open support', data.support.filter((item) => item.status !== 'RESOLVED').length.toLocaleString(), 'All support form categories'],
  ];
  return <><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, value, note]) => <div key={label} className="rounded-xl border border-zinc-800 bg-zinc-950 p-5"><p className="text-xs text-zinc-500">{label}</p><p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p><p className="mt-2 text-xs text-zinc-600">{note}</p></div>)}</div>
    <div className="grid gap-6 xl:grid-cols-2"><Panel title="Recorded revenue" description="Verified platform payments, separated by currency">{data.revenue.length ? <div className="divide-y divide-zinc-800">{data.revenue.map((row) => <div className="flex items-center justify-between px-5 py-4" key={row.currency}><div><p className="text-lg font-medium">{money(row.gross - row.refunded, row.currency)}</p><p className="text-xs text-zinc-500">{row.payments} payments Ã‚&middot; {money(row.refunded, row.currency)} refunded</p></div><Pill>{row.currency}</Pill></div>)}</div> : <Empty>No verified payments recorded yet.</Empty>}</Panel>
    <Panel title="Operational queue"><div className="grid grid-cols-3 divide-x divide-zinc-800 p-5 text-center"><div><p className="text-2xl font-semibold">{data.incidents.filter(i => i.status !== 'RESOLVED').length}</p><p className="text-xs text-zinc-500">Open incidents</p></div><div><p className="text-2xl font-semibold">{data.support.filter(i => i.status === 'OPEN').length}</p><p className="text-xs text-zinc-500">New requests</p></div><div><p className="text-2xl font-semibold">{data.coupons.filter(i => i.enabled).length}</p><p className="text-xs text-zinc-500">Active coupons</p></div></div></Panel></div></>;
}

function UsersView({ data }: { data: AdminDashboardData }) {
  const [tab, setTab] = useState<'active' | 'total'>('active');
  const [query, setQuery] = useState('');
  const [plan, setPlan] = useState('ALL');
  const [role, setRole] = useState('ALL');
  const plans = Array.from(new Set(data.users.map(user => user.organization.plan))).sort();
  const roles = Array.from(new Set(data.users.map(user => user.role))).sort();
  const users = data.users.filter(user => {
    if (tab === 'active' && !user.isActiveAccount) return false;
    if (plan !== 'ALL' && user.organization.plan !== plan) return false;
    if (role !== 'ALL' && user.role !== role) return false;
    const needle = query.trim().toLowerCase();
    return !needle || [user.name, user.email, user.organization.name].some(value => value.toLowerCase().includes(needle));
  });
  return <Panel title="Customer users" description="Filter accounts by access, plan, role, user, or workspace.">
    <div className="border-b border-zinc-800 p-5">
      <div className="flex gap-2" role="tablist" aria-label="User account status">
        <button type="button" role="tab" aria-selected={tab === 'active'} onClick={() => setTab('active')} className={`rounded-md px-3 py-2 text-sm ${tab === 'active' ? 'bg-zinc-100 text-zinc-950' : 'bg-zinc-900 text-zinc-400'}`}>Active users <span className="ml-1 opacity-70">{data.metrics.activeUsers}</span></button>
        <button type="button" role="tab" aria-selected={tab === 'total'} onClick={() => setTab('total')} className={`rounded-md px-3 py-2 text-sm ${tab === 'total' ? 'bg-zinc-100 text-zinc-950' : 'bg-zinc-900 text-zinc-400'}`}>Total users <span className="ml-1 opacity-70">{data.metrics.totalUsers}</span></button>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-[minmax(220px,1fr)_180px_180px]">
        <label className={labelClass}>Search<input className={inputClass} value={query} onChange={event => setQuery(event.target.value)} placeholder="Name, email, or workspace" /></label>
        <label className={labelClass}>Plan<select className={inputClass} value={plan} onChange={event => setPlan(event.target.value)}><option value="ALL">All plans</option>{plans.map(value => <option key={value}>{value}</option>)}</select></label>
        <label className={labelClass}>Role<select className={inputClass} value={role} onChange={event => setRole(event.target.value)}><option value="ALL">All roles</option>{roles.map(value => <option key={value}>{value}</option>)}</select></label>
      </div>
    </div>
    <div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-left text-sm"><thead className="text-xs text-zinc-500"><tr>{['User', 'Status', 'Workspace', 'Plan', 'Role', 'Last active', 'Traffic', 'Storage', 'Joined'].map(h => <th className="px-4 py-3 font-medium" key={h}>{h}</th>)}</tr></thead><tbody className="divide-y divide-zinc-800">{users.map(user => <tr key={user.id}><td className="px-4 py-3"><div className="flex items-center gap-3"><div className="h-8 w-8 shrink-0 overflow-hidden rounded-full"><ProfileAvatar src={user.avatarUrl} name={user.name} /></div><div><p className="font-medium">{user.name}</p><p className="text-xs text-zinc-500">{user.email}</p></div></div></td><td className="px-4 py-3"><Pill>{user.isActiveAccount ? 'ACTIVE' : user.accessRevokedAt ? 'REVOKED' : 'OFFBOARDED'}</Pill></td><td className="px-4 py-3 text-zinc-400">{user.organization.name}</td><td className="px-4 py-3"><Pill>{user.organization.plan}</Pill></td><td className="px-4 py-3 text-zinc-400">{user.role}</td><td className="px-4 py-3 text-zinc-400">{date(user.lastActiveAt)}</td><td className="px-4 py-3">{user.traffic.toLocaleString()} views</td><td className="px-4 py-3"><p>{bytes(user.storageBytes)}</p><p className="text-xs text-zinc-500">{user.storedFiles} files</p></td><td className="px-4 py-3 text-zinc-400">{date(user.createdAt)}</td></tr>)}</tbody></table>{!users.length && <Empty>No users match these filters.</Empty>}</div>
  </Panel>;
}

function RevenueView({ data }: { data: AdminDashboardData }) {
  return <div className="space-y-6"><Panel title="Revenue by plan and currency" description="Gross, refunds, and net amounts from verified checkout payments"><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-xs text-zinc-500"><tr>{['Plan', 'Currency', 'Payments', 'Gross', 'Refunded', 'Net'].map(h => <th className="px-5 py-3 font-medium" key={h}>{h}</th>)}</tr></thead><tbody className="divide-y divide-zinc-800">{data.planRevenue.map(row => <tr key={`${row.plan}-${row.currency}`}><td className="px-5 py-3"><Pill>{row.plan}</Pill></td><td className="px-5 py-3">{row.currency}</td><td className="px-5 py-3">{row.payments}</td><td className="px-5 py-3">{money(row.gross,row.currency)}</td><td className="px-5 py-3">{money(row.refunded,row.currency)}</td><td className="px-5 py-3 font-medium">{money(row.gross-row.refunded,row.currency)}</td></tr>)}</tbody></table>{!data.planRevenue.length && <Empty>No platform payments recorded yet.</Empty>}</div></Panel>
  <Panel title="Recent payments"><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="text-xs text-zinc-500"><tr>{['Payment', 'Plan', 'Total', 'Refunded', 'Organization', 'Date'].map(h => <th className="px-5 py-3 font-medium" key={h}>{h}</th>)}</tr></thead><tbody className="divide-y divide-zinc-800">{data.payments.map(row => <tr key={row.paymentId}><td className="px-5 py-3 font-mono text-xs">{row.paymentId}</td><td className="px-5 py-3">{row.plan}</td><td className="px-5 py-3">{money(row.totalAmount,row.currency)}</td><td className="px-5 py-3">{money(row.refundedAmount,row.currency)}</td><td className="px-5 py-3 font-mono text-xs text-zinc-500">{row.orgId}</td><td className="px-5 py-3 text-zinc-400">{date(row.createdAt)}</td></tr>)}</tbody></table></div></Panel></div>;
}

type Mutate = (body: unknown) => Promise<boolean>;
function SupportView({ data, mutate, busy }: { data: AdminDashboardData; mutate: Mutate; busy: boolean }) {
  return <Panel title="Support inbox" description="Help, bug, feedback, and feature request forms in one queue">{data.support.length ? <div className="divide-y divide-zinc-800">{data.support.map(item => <article key={item.id} className="p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex gap-2"><Pill>{item.type}</Pill><Pill>{item.status}</Pill></div><h3 className="mt-3 font-medium">{item.subject}</h3><p className="text-xs text-zinc-500">{item.name} Ã‚&middot; {item.email} Ã‚&middot; {date(item.createdAt)}</p></div><select disabled={busy} value={item.status} onChange={e => void mutate({ action: 'support-status', id: item.id, status: e.target.value })} className={inputClass + ' mt-0 w-auto'}><option>OPEN</option><option>IN_PROGRESS</option><option>RESOLVED</option></select></div><p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-zinc-300">{item.details}</p>{item.page && <p className="mt-2 text-xs text-zinc-600">Page: {item.page}</p>}</article>)}</div> : <Empty>No support entries.</Empty>}</Panel>;
}

function IncidentsView({ data, mutate, busy }: { data: AdminDashboardData; mutate: Mutate; busy: boolean }) {
  return <Panel title="Backend incidents" description="Sanitized unhandled server errors, grouped by route and type">{data.incidents.length ? <div className="divide-y divide-zinc-800">{data.incidents.map(item => <article key={item.id} className="flex flex-wrap items-center justify-between gap-4 p-5"><div><div className="flex gap-2"><Pill>{item.status}</Pill><Pill>{item.occurrences} occurrences</Pill></div><h3 className="mt-3 font-medium">{item.summary}</h3><p className="mt-1 font-mono text-xs text-zinc-500">{item.source}</p><p className="mt-2 text-xs text-zinc-600">First {date(item.firstSeenAt)} Ã‚&middot; Last {date(item.lastSeenAt)}</p></div><select disabled={busy} value={item.status} onChange={e => void mutate({ action: 'incident-status', id: item.id, status: e.target.value })} className={inputClass + ' mt-0 w-auto'}><option>OPEN</option><option>INVESTIGATING</option><option>RESOLVED</option></select></article>)}</div> : <Empty>No backend incidents captured.</Empty>}</Panel>;
}

function CouponFields({ coupon }: { coupon?: AdminDashboardData['coupons'][number] }) {
  return <>
    <label className={labelClass}>Label<input className={inputClass} name="label" defaultValue={coupon?.label} required /></label>
    {coupon && <label className={labelClass}>Status<select className={inputClass} name="enabled" defaultValue={String(coupon.enabled)}><option value="true">Enabled</option><option value="false">Disabled</option></select></label>}
    <label className={labelClass}>Plan<select className={inputClass} name="plan" defaultValue={coupon?.plan ?? 'ANY'}><option>ANY</option><option>PRO</option><option>ADVANCED</option></select></label>
    <label className={labelClass}>{coupon ? 'New code (optional)' : 'Coupon code'}<input className={inputClass} name="code" required={!coupon} minLength={4} autoComplete="off" /></label>
    <label className={labelClass}>Starts<input className={inputClass} name="startsAt" type="datetime-local" required defaultValue={coupon?.startsAt.slice(0, 16) ?? new Date().toISOString().slice(0, 16)} /></label>
    <label className={labelClass}>Ends (optional)<input className={inputClass} name="endsAt" type="datetime-local" defaultValue={coupon?.endsAt?.slice(0, 16)} /></label>
    <label className={labelClass}>Maximum uses (optional)<input className={inputClass} name="maxUses" type="number" min="1" defaultValue={coupon?.maxUses ?? ''} /></label>
  </>;
}

function CouponsView({ data, mutate, busy }: { data: AdminDashboardData; mutate: Mutate; busy: boolean }) {
  return <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
    <Panel title="Create coupon" description="Codes are hashed and shown only while you enter them">
      <form className={formClass} onSubmit={async event => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const saved = await mutate({ action: 'create-coupon', code: form.get('code'), label: form.get('label'), plan: form.get('plan'), startsAt: new Date(String(form.get('startsAt'))).toISOString(), endsAt: form.get('endsAt') ? new Date(String(form.get('endsAt'))).toISOString() : null, maxUses: form.get('maxUses') ? Number(form.get('maxUses')) : null });
        if (saved) event.currentTarget.reset();
      }}>
        <CouponFields />
        <div className="pt-1"><Button loading={busy} type="submit">Create coupon</Button></div>
      </form>
    </Panel>
    <Panel title="Managed coupons" description="Includes the three existing access coupons and successful plan activations">
      {data.coupons.length ? <div className="divide-y divide-zinc-800">{data.coupons.map(coupon => <details key={coupon.id} className="group p-5">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4"><div><div className="flex gap-2"><Pill>{coupon.enabled ? 'ENABLED' : 'DISABLED'}</Pill><Pill>{coupon.plan}</Pill></div><p className="mt-2 font-medium">{coupon.label} <span className="font-mono text-xs text-zinc-500">{coupon.codeHint}</span></p><p className="mt-1 text-xs text-zinc-500">{coupon.uses}{coupon.maxUses ? ` / ${coupon.maxUses}` : ''} uses Ã‚&middot; {date(coupon.startsAt)} to {coupon.endsAt ? date(coupon.endsAt) : 'No end date'}</p></div><span className="text-xs text-zinc-500">Edit</span></summary>
        <form className="mt-5 grid gap-5 border-t border-zinc-800 pt-5 sm:grid-cols-2" onSubmit={event => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          void mutate({ action: 'update-coupon', id: coupon.id, label: form.get('label'), enabled: form.get('enabled') === 'true', plan: form.get('plan'), startsAt: new Date(String(form.get('startsAt'))).toISOString(), endsAt: form.get('endsAt') ? new Date(String(form.get('endsAt'))).toISOString() : null, maxUses: form.get('maxUses') ? Number(form.get('maxUses')) : null, ...(form.get('code') ? { code: form.get('code') } : {}) });
        }}>
          <CouponFields coupon={coupon} />
          <div className="self-end pt-1"><Button loading={busy} type="submit">Save changes</Button></div>
        </form>
      </details>)}</div> : <Empty>No managed coupons.</Empty>}
    </Panel>
  </div>;
}

function AccessView({ data, admin, mutate, busy }: { data: AdminDashboardData; admin: SuperadminIdentity; mutate: Mutate; busy: boolean }) {
  return <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
    <Panel title="Invite superadmin" description="Only verified @irisos.app accounts can enter">
      {admin.role === 'OWNER' ? <form className={formClass} onSubmit={async event => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        if (await mutate({ action: 'invite', email: form.get('email'), role: form.get('role'), expiresInDays: Number(form.get('days')) })) event.currentTarget.reset();
      }}>
        <label className={labelClass}>Iris OS email<input className={inputClass} name="email" type="email" pattern="[^@]+@irisos\.app" required /></label>
        <label className={labelClass}>Role<select className={inputClass} name="role"><option>VIEWER</option><option>EDITOR</option></select></label>
        <label className={labelClass}>Invite expires in<input className={inputClass} name="days" type="number" min="1" max="30" defaultValue="7" required /></label>
        <div className="pt-1"><Button loading={busy}>Grant invitation</Button></div>
      </form> : <Empty>Owner access is required to manage invitations.</Empty>}
    </Panel>
    <Panel title="Superadmin access" description="Organization roles never grant access to this workspace"><div className="divide-y divide-zinc-800">{data.admins.map(item => <div key={item.email} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4"><div><p className="font-medium">{item.email}</p><div className="mt-2 flex gap-2"><Pill>{item.role}</Pill><Pill>{item.status}</Pill></div>{item.expiresAt && <p className="mt-2 text-xs text-zinc-600">Invitation expires {date(item.expiresAt)}</p>}</div>{admin.role === 'OWNER' && item.role !== 'OWNER' && item.status !== 'REVOKED' && <Button variant="outline" size="sm" loading={busy} onClick={() => void mutate({ action: 'revoke-admin', email: item.email })}>Revoke</Button>}</div>)}</div></Panel>
  </div>;
}

function SettingsView({ admin, mutate, busy }: { admin: SuperadminIdentity; mutate: Mutate; busy: boolean }) {
  const [name, setName] = useState(admin.name);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(admin.avatarUrl);
  const [imageBusy, setImageBusy] = useState(false);
  return <div className="grid gap-6 xl:grid-cols-2">
    <Panel title="Profile" description="Shown in the superadmin workspace">
      <form className={formClass} onSubmit={event => { event.preventDefault(); void mutate({ action: 'update-profile', name, avatarDataUrl: avatarUrl }); }}>
        <ProfilePicturePicker value={avatarUrl} onChange={setAvatarUrl} name={name} disabled={busy} onBusyChange={setImageBusy} />
        <label className={labelClass}>Display name<input className={inputClass} value={name} onChange={event => setName(event.target.value)} required maxLength={80} /></label>
        <label className={labelClass}>Email<input className={inputClass} value={admin.email} readOnly /></label>
        <div className="pt-1"><Button type="submit" loading={busy} disabled={imageBusy}>Save profile</Button></div>
      </form>
    </Panel>
    <Panel title="Session" description={`Signed in with ${admin.role.toLowerCase()} access`}>
      <div className="space-y-5 p-5"><p className="text-sm leading-6 text-zinc-400">Sign out of the superadmin workspace on this device.</p><Button variant="outline" onClick={async () => { await createClient().auth.signOut(); window.location.assign('/admin/login'); }}><LogOut className="mr-2 h-4 w-4" />Sign out</Button></div>
    </Panel>
  </div>;
}
