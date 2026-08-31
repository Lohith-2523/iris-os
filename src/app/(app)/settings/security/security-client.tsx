'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowLeft, KeyRound, Loader2, ShieldCheck, UserMinus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageSkeleton } from '@/components/ui/page-skeletons';
import type { SecurityUsersReadModel } from '@/server/domains/security-read-service';

type WorkspaceUser = { id: string; name: string; email: string; role: string; accessPermissions: string[] | null; accessRevokedAt: string | null };

export default function SecurityUsersClient({ initialData }: { initialData: SecurityUsersReadModel }) {
  const [data, setData] = React.useState<{ users: WorkspaceUser[]; plan: string; hasAddon: boolean; allowedPages: string[] } | null>(initialData);
  const [busyId, setBusyId] = React.useState('');
  const [error, setError] = React.useState('');
  const [offboardUser, setOffboardUser] = React.useState<WorkspaceUser | null>(null);
  const [feedback, setFeedback] = React.useState('');

  const load = React.useCallback(async () => {
    const response = await fetch('/api/security/users', { cache: 'no-store' });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Unable to load users');
    setData(payload);
  }, []);
  const mutate = async (body: Record<string, unknown>) => {
    setBusyId(String(body.userId || 'workspace'));
    setError('');
    try {
      const response = await fetch('/api/security/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Unable to update access');
      await load();
      return payload;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update access');
      return null;
    } finally { setBusyId(''); }
  };

  if (!data) return <PageSkeleton variant="security" />;
  const activeUsers = data.users.filter((user) => !user.accessRevokedAt);
  const subAdminCount = activeUsers.filter((user) => user.role === 'sub_admin').length;

  return <div className="space-y-6">
    <div className="flex items-center gap-4 border-b border-zinc-800 pb-5">
      <Link href="/settings" prefetch={false} className="rounded-xl border border-zinc-800 p-2 text-zinc-400 hover:text-white"><ArrowLeft className="h-5 w-5" /></Link>
      <div><h1 className="text-2xl font-bold text-white">Security & Roles</h1><p className="text-zinc-500">Manage roles, sub-admin page access, and team offboarding.</p></div>
    </div>
    {error && <div className="rounded-xl border border-rose-900/50 bg-rose-950/20 p-4 text-rose-300" role="alert">{error}</div>}
    <div className="grid gap-4 md:grid-cols-3">
      <Card><CardHeader><CardDescription>Total active users</CardDescription><CardTitle className="text-3xl">{activeUsers.length}</CardTitle></CardHeader></Card>
      <Card><CardHeader><CardDescription>Sub-admins</CardDescription><CardTitle className="text-3xl">{subAdminCount}</CardTitle></CardHeader></Card>
      <Card><CardHeader><CardDescription>Plan access</CardDescription><CardTitle className="text-xl">{data.plan}</CardTitle></CardHeader></Card>
    </div>
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Workspace users</CardTitle><CardDescription>The first sub-admin is included on Advanced. Additional sub-admins require the paid add-on.</CardDescription></CardHeader>
      <CardContent className="space-y-3">{data.users.map((user, index) => {
        const permissions = Array.isArray(user.accessPermissions) ? user.accessPermissions : [];
        return <div key={user.id} className="rounded-2xl border border-zinc-800 bg-zinc-950/30 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><div className="font-semibold text-white">{index + 1}. {user.name}</div><div className="text-zinc-500">{user.email}</div></div><div className="flex items-center gap-2"><Badge>{user.accessRevokedAt ? 'OFFBOARDED' : user.role.replace('_', ' ').toUpperCase()}</Badge>{busyId === user.id && <Loader2 className="h-4 w-4 animate-spin" />}</div></div>
          {!user.accessRevokedAt && user.role === 'member' && <Button className="mt-4" disabled={data.plan !== 'ADVANCED' || busyId === user.id} onClick={() => void mutate({ action: 'make_sub_admin', userId: user.id, permissions: ['dashboard', 'clients', 'projects', 'tasks', 'team'] })}><ShieldCheck className="mr-2 h-4 w-4" /> Make sub-admin</Button>}
          {!user.accessRevokedAt && user.role === 'sub_admin' && <div className="mt-4"><div className="mb-2 flex items-center gap-2 font-semibold text-white"><KeyRound className="h-4 w-4" /> Page access</div><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{data.allowedPages.map((page) => <label key={page} className="flex items-center gap-2 rounded-xl border border-zinc-800 p-3 capitalize"><input type="checkbox" checked={permissions.includes(page)} onChange={(event) => { const next = event.target.checked ? [...permissions, page] : permissions.filter((item) => item !== page); setData((current) => current ? { ...current, users: current.users.map((item) => item.id === user.id ? { ...item, accessPermissions: next } : item) } : current); void mutate({ action: 'update_permissions', userId: user.id, permissions: next }); }} />{page}</label>)}</div></div>}
          {!user.accessRevokedAt && ['member', 'sub_admin'].includes(user.role) && <Button variant="ghost" className="mt-4 text-rose-300" onClick={() => { setOffboardUser(user); setFeedback(''); }}><UserMinus className="mr-2 h-4 w-4" /> Offboard & revoke access</Button>}
        </div>;
      })}</CardContent>
    </Card>
    {offboardUser && <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4"><div className="w-full max-w-xl rounded-2xl border border-zinc-800 bg-zinc-950 p-6"><h2 className="text-xl font-bold text-white">Offboard {offboardUser.name}</h2><p className="mt-2 text-zinc-400">Access is revoked immediately and feedback is sent by email.</p><textarea className="mt-4 min-h-32 w-full rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-white" required value={feedback} onChange={(event) => setFeedback(event.target.value)} placeholder="Feedback and offboarding notes" /><div className="mt-4 flex justify-end gap-2"><Button variant="ghost" onClick={() => setOffboardUser(null)}>Cancel</Button><Button disabled={feedback.trim().length < 5 || busyId === offboardUser.id} className="bg-rose-700 text-white" onClick={async () => { const result = await mutate({ action: 'offboard', userId: offboardUser.id, feedback }); if (result) setOffboardUser(null); }}>{busyId === offboardUser.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Confirm offboarding</Button></div></div></div>}
  </div>;
}
