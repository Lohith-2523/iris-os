'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, ExternalLink, Loader2 } from 'lucide-react';
import { workspaceFetch as fetch } from '@/lib/workspace-data-cache';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageSkeleton } from '@/components/ui/page-skeletons';
import { ChangeRequestManager } from '@/components/projects/change-request-manager';
import { ClientEmptyState, ClientWorkspacePageHeader } from '@/components/clients/client-workspace-ui';

type Deliverable = { id: string; title: string; url: string; description?: string | null; status: string; approvalNote?: string | null; project?: { name: string } | null; task?: { title: string; stage?: { name: string } | null } | null };
type ChangeRequest = { id: string; title: string; details: string; status: string; agencyResponse?: string | null; alternateProposal?: string | null; project?: { id: string; name: string } | null; task?: { id: string; title: string } | null };
type Project = { id: string; name: string };

export default function ClientDeliverablesPage() {
  const searchParams = useSearchParams();
  const requestedDeliverableId = searchParams.get('deliverableId');
  const requestedChangeRequestId = searchParams.get('changeRequestId');
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [clientId, setClientId] = React.useState('');
  const [deliverables, setDeliverables] = React.useState<Deliverable[]>([]);
  const [changeRequests, setChangeRequests] = React.useState<ChangeRequest[]>([]);
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [request, setRequest] = React.useState({ projectId: '', title: '', details: '' });
  const [busy, setBusy] = React.useState('');
  const [changeTarget, setChangeTarget] = React.useState<Deliverable | null>(null);
  const [changeNote, setChangeNote] = React.useState('');

  const load = React.useCallback(async () => {
    const [deliveryResponse, projectResponse, userResponse] = await Promise.all([
      fetch('/api/deliverables?deliverableLimit=100&changeLimit=100', { cache: 'no-store' }),
      fetch('/api/projects?limit=100', { cache: 'no-store' }),
      fetch('/api/user', { cache: 'no-store' }),
    ]);
    const [deliveryPayload, projectPayload, userPayload] = await Promise.all([deliveryResponse.json().catch(() => null), projectResponse.json().catch(() => null), userResponse.json().catch(() => null)]);
    if (!deliveryResponse.ok || !projectResponse.ok || !userResponse.ok) throw new Error(deliveryPayload?.error || projectPayload?.error || userPayload?.error || 'Unable to load deliverables.');
    setDeliverables(deliveryPayload.deliverables || []); setChangeRequests(deliveryPayload.changeRequests || []); setProjects(projectPayload || []); setClientId(userPayload.clientId || '');
  }, []);

  React.useEffect(() => { let active = true; load().catch(reason => { if (active) setError(reason instanceof Error ? reason.message : 'Unable to load deliverables.'); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [load]);
  React.useEffect(() => {
    const targetId = requestedDeliverableId ? `deliverable-${requestedDeliverableId}` : requestedChangeRequestId ? `change-request-${requestedChangeRequestId}` : '';
    if (!targetId || loading) return;
    const frame = window.requestAnimationFrame(() => {
      const directTarget = document.getElementById(targetId);
      if (directTarget) return directTarget.scrollIntoView({ block: 'center' });
      const deliverable = deliverables.find((item) => item.id === requestedDeliverableId);
      const link = deliverable ? Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href]')).find((item) => item.href === deliverable.url) : null;
      link?.closest('.rounded-xl')?.scrollIntoView({ block: 'center' });
      link?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [loading, requestedChangeRequestId, requestedDeliverableId, deliverables, changeRequests]);

  async function review(action: 'approve' | 'request_changes', id: string, note?: string) {
    setBusy(id); setError('');
    try {
      const response = await fetch('/api/deliverables', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, id, note }) });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Unable to update this deliverable.');
      setChangeTarget(null); setChangeNote(''); await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to update this deliverable.'); }
    finally { setBusy(''); }
  }

  async function submitRequest(event: React.FormEvent) {
    event.preventDefault(); setBusy('request'); setError('');
    try {
      const response = await fetch('/api/deliverables', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'create_change_request', clientId, projectId: request.projectId, title: request.title, note: request.details }) });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Unable to submit the change request.');
      setRequest({ projectId: '', title: '', details: '' }); await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to submit the change request.'); }
    finally { setBusy(''); }
  }

  if (loading) return <PageSkeleton variant="client-portal" />;
  const pending = deliverables.filter(item => item.status === 'NEEDS_CLIENT_APPROVAL');

  return <div className="dashboard-canvas space-y-6">
    <ClientWorkspacePageHeader eyebrow="Client workspace" title="Deliverables & approvals" description="Review submitted work, approve completed deliverables, request focused changes, and track project-level change requests." />
    {error && <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">{error}</div>}
    <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
      <Card><CardHeader><CardTitle>Deliverables awaiting review</CardTitle><CardDescription>{pending.length} item{pending.length === 1 ? '' : 's'} currently need your decision.</CardDescription></CardHeader><CardContent className="space-y-4">{deliverables.map(item => <div key={item.id} className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><a href={item.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-semibold text-white hover:underline">{item.title}<ExternalLink className="h-3.5 w-3.5" /></a><p className="mt-1 text-[10px] text-zinc-500">{item.project?.name || 'Project'}{item.task?.stage?.name ? ` · ${item.task.stage.name}` : ''}{item.task?.title ? ` · ${item.task.title}` : ''}</p></div><Badge variant={item.status === 'APPROVED' ? 'risk-low' : item.status === 'CHANGES_REQUESTED' ? 'risk-high' : item.status === 'NEEDS_CLIENT_APPROVAL' ? 'risk-medium' : 'outline'}>{item.status.replaceAll('_', ' ')}</Badge></div>{item.description && <p className="mt-3 text-xs leading-relaxed text-zinc-400">{item.description}</p>}{item.approvalNote && <p className="mt-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 text-xs text-zinc-300"><strong>Review note:</strong> {item.approvalNote}</p>}{item.status === 'NEEDS_CLIENT_APPROVAL' && <div className="mt-4 flex flex-wrap gap-2"><Button disabled={Boolean(busy)} onClick={() => void review('approve', item.id)}>{busy === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}Approve</Button><Button variant="outline" disabled={Boolean(busy)} onClick={() => { setChangeTarget(item); setChangeNote(''); }}>Request changes</Button></div>}</div>)}{!deliverables.length && <ClientEmptyState>No deliverables have been submitted yet.</ClientEmptyState>}</CardContent></Card>
      <div className="space-y-6"><Card><CardHeader><CardTitle>New change request</CardTitle><CardDescription>Propose a scoped change against one active project.</CardDescription></CardHeader><CardContent><form className="space-y-4" onSubmit={submitRequest}><select required value={request.projectId} onChange={event => setRequest(current => ({ ...current, projectId: event.target.value }))} className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-xs text-white"><option value="">Select a project</option>{projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select><input required minLength={2} maxLength={200} value={request.title} onChange={event => setRequest(current => ({ ...current, title: event.target.value }))} placeholder="Request title" className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-xs text-white" /><textarea required minLength={2} maxLength={2000} value={request.details} onChange={event => setRequest(current => ({ ...current, details: event.target.value }))} placeholder="Describe the change and desired outcome" className="min-h-32 w-full rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-xs text-white" /><Button type="submit" disabled={!clientId || busy === 'request'}>{busy === 'request' && <Loader2 className="h-4 w-4 animate-spin" />}Submit change request</Button></form></CardContent></Card><Card><CardHeader><CardTitle>Change request history</CardTitle><CardDescription>Current discussions and finalized scope changes.</CardDescription></CardHeader><CardContent><ChangeRequestManager requests={changeRequests} showProjectName /></CardContent></Card></div>
    </div>
    {changeTarget && <div className="fixed inset-0 z-[80] grid place-items-center bg-black/75 p-4 backdrop-blur-sm" role="presentation" onMouseDown={event => { if (event.currentTarget === event.target && !busy) setChangeTarget(null); }}><Card role="dialog" aria-modal="true" aria-labelledby="deliverable-change-title" className="w-full max-w-xl bg-zinc-950"><CardHeader><CardTitle id="deliverable-change-title">Request changes to {changeTarget.title}</CardTitle><CardDescription>Give the delivery team specific, actionable feedback.</CardDescription></CardHeader><CardContent className="space-y-4"><textarea required value={changeNote} onChange={event => setChangeNote(event.target.value)} placeholder="Describe what should change" className="min-h-36 w-full rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-xs text-white" /><div className="flex justify-end gap-3"><Button variant="ghost" disabled={Boolean(busy)} onClick={() => setChangeTarget(null)}>Cancel</Button><Button disabled={Boolean(busy) || changeNote.trim().length < 2} onClick={() => void review('request_changes', changeTarget.id, changeNote.trim())}>{busy === changeTarget.id && <Loader2 className="h-4 w-4 animate-spin" />}Send request</Button></div></CardContent></Card></div>}
  </div>;
}
