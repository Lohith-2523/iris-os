'use client';

import * as React from 'react';
import { CheckCircle2, FileText, FolderKanban, ListChecks, PackageCheck } from 'lucide-react';
import { workspaceFetch as fetch } from '@/lib/workspace-data-cache';
import { Badge } from '@/components/ui/badge';
import { PageSkeleton } from '@/components/ui/page-skeletons';
import { taskStatusLabel } from '@/lib/tasks/status-progress';
import { ClientEmptyState, ClientMetricCard, ClientPanel, ClientWorkspaceBanner } from '@/components/clients/client-workspace-ui';
import { resolveWorkspaceBannerPosition, resolveWorkspaceBannerZoom, type WorkspaceBannerPosition } from '@/lib/workspace-banner';

type Project = { id: string; name: string; status: string; progress: number };
type Task = { id: string; title: string; status: string; progress: number; project?: { id: string; name: string } | null };
type Deliverable = { id: string; title: string; url: string; status: string; createdAt: string; project?: { name: string } | null };
type ChangeRequest = { id: string; title: string; status: string; project?: { name: string } | null };
type Invoice = { id: string; invoiceNumber: string; project?: { name: string } | null };
type DocumentRow = { id: string; title: string; kind: string; status: string };
type UserPayload = { role: string; name: string; client?: { id: string; name: string; brandColor?: string; workspaceBannerDataUrl?: string | null; workspaceBannerPosition?: WorkspaceBannerPosition; workspaceBannerZoom?: number } | null };

function statusTone(status: string) {
  if (['COMPLETED', 'APPROVED', 'EXECUTED', 'FULLY_PAID', 'FINALIZED'].includes(status)) return 'risk-low' as const;
  if (['BLOCKED', 'CHANGES_REQUESTED', 'OVERDUE'].includes(status)) return 'risk-high' as const;
  if (['IN_PROGRESS', 'NEEDS_CLIENT_APPROVAL', 'PARTIALLY_SIGNED', 'DISCUSSION'].includes(status)) return 'risk-medium' as const;
  return 'outline' as const;
}

export default function ClientDashboardPage() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [user, setUser] = React.useState<UserPayload | null>(null);
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [deliverables, setDeliverables] = React.useState<Deliverable[]>([]);
  const [changeRequests, setChangeRequests] = React.useState<ChangeRequest[]>([]);
  const [invoices, setInvoices] = React.useState<Invoice[]>([]);
  const [documents, setDocuments] = React.useState<DocumentRow[]>([]);
  const [bannerDataUrl, setBannerDataUrl] = React.useState<string | null>(null);
  const [bannerPosition, setBannerPosition] = React.useState<WorkspaceBannerPosition>({ x: 50, y: 50 });
  const [bannerZoom, setBannerZoom] = React.useState(1);

  React.useEffect(() => {
    let active = true;
    async function load() {
      try {
        const responses = await Promise.all([
          fetch('/api/user', { cache: 'no-store' }),
          fetch('/api/projects?limit=100', { cache: 'no-store' }),
          fetch('/api/tasks?limit=100', { cache: 'no-store' }),
          fetch('/api/deliverables?deliverableLimit=100&changeLimit=100', { cache: 'no-store' }),
          fetch('/api/invoices?documentType=INVOICE&limit=100', { cache: 'no-store' }),
          fetch('/api/generated-documents?clientWorkspace=true&limit=100', { cache: 'no-store' }),
        ]);
        if (responses.some((response) => !response.ok)) throw new Error('The client workspace could not be loaded.');
        const [userData, projectData, taskData, deliveryData, invoiceData, documentData] = await Promise.all(responses.map((response) => response.json()));
        if (!active) return;
        setUser(userData); setBannerDataUrl(userData.client?.workspaceBannerDataUrl || null); setBannerPosition(resolveWorkspaceBannerPosition(userData.client?.workspaceBannerPosition)); setBannerZoom(resolveWorkspaceBannerZoom(userData.client?.workspaceBannerZoom)); setProjects(projectData || []); setTasks(taskData || []);
        setDeliverables(deliveryData.deliverables || []); setChangeRequests(deliveryData.changeRequests || []);
        setInvoices(invoiceData || []); setDocuments(documentData.documents || []);
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : 'The client workspace could not be loaded.');
      } finally { if (active) setLoading(false); }
    }
    void load();
    return () => { active = false; };
  }, []);

  if (loading) return <PageSkeleton variant="client-portal" />;
  if (user?.role?.toLowerCase() !== 'client') return <div className="mx-auto max-w-xl py-20 text-center text-sm text-zinc-400">This workspace is available to client accounts.</div>;

  const activeProjects = projects.filter((project) => !['COMPLETED', 'CANCELLED'].includes(project.status));
  const pendingApprovals = deliverables.filter((item) => item.status === 'NEEDS_CLIENT_APPROVAL');
  const allDocuments = invoices.length + documents.length;
  const firstName = user.name?.split(' ')[0] || user.client?.name || 'there';
  const brandColor = user.client?.brandColor && /^#[0-9A-Fa-f]{6}$/.test(user.client.brandColor) ? user.client.brandColor : '#8B5CF6';
  const documentPreview = [
    ...documents.map((item) => ({ id: item.id, title: item.title, meta: item.kind, type: item.status })),
    ...invoices.map((item) => ({ id: item.id, title: item.invoiceNumber, meta: item.project?.name || 'Project invoice', type: 'INVOICE' })),
  ].slice(0, 4);

  const saveBanner = async (workspaceBannerDataUrl: string | null) => {
    if (!user.client?.id) throw new Error('This client workspace is not linked correctly.');
    const nextPosition = { x: 50, y: 50 };
    const response = await fetch('/api/clients', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId: user.client.id, workspaceBannerDataUrl, workspaceBannerPosition: nextPosition, workspaceBannerZoom: 1 }) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'The banner could not be saved.');
    setBannerDataUrl(workspaceBannerDataUrl);
    setBannerPosition(nextPosition);
    setBannerZoom(1);
  };

  const saveBannerLayout = async (workspaceBannerPosition: WorkspaceBannerPosition, workspaceBannerZoom: number) => {
    if (!user.client?.id) throw new Error('This client workspace is not linked correctly.');
    const response = await fetch('/api/clients', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId: user.client.id, workspaceBannerPosition, workspaceBannerZoom }) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'The banner layout could not be saved.');
    setBannerPosition(workspaceBannerPosition);
    setBannerZoom(workspaceBannerZoom);
  };

  return <div className="client-overview dashboard-canvas space-y-6" style={{ '--client-accent': brandColor } as React.CSSProperties}>
    <ClientWorkspaceBanner name={firstName} backgroundDataUrl={bannerDataUrl} position={bannerPosition} zoom={bannerZoom} accentColor={brandColor} onBackgroundChange={saveBanner} onLayoutChange={saveBannerLayout} />
    {error && <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">{error}</div>}
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Client workspace summary">
      <ClientMetricCard tone="projects" icon={FolderKanban} label="Projects" value={projects.length} detail={`${activeProjects.length} active`} href="/client-projects" accentColor={brandColor} />
      <ClientMetricCard tone="tasks" icon={ListChecks} label="Tasks" value={tasks.length} detail={`${tasks.filter((task) => task.status === 'IN_PROGRESS').length} in progress`} href="/client-projects" accentColor={brandColor} />
      <ClientMetricCard tone="documents" icon={FileText} label="Documents" value={allDocuments} detail="Invoices, proposals and contracts" href="/client-documents" accentColor={brandColor} />
      <ClientMetricCard tone="approvals" icon={CheckCircle2} label="Pending approvals" value={pendingApprovals.length} detail="Waiting for your review" href="/client-deliverables" accentColor={brandColor} />
    </section>
    <section className="grid items-stretch gap-4 lg:grid-cols-3">
      <ClientPanel title="Active projects" href="/client-projects" className="h-full">
        {activeProjects.slice(0, 4).map((project) => <div key={project.id} className="border-b border-zinc-900 px-5 py-4 last:border-0"><div className="flex items-center justify-between gap-4"><div className="min-w-0"><p className="truncate text-xs font-semibold text-white">{project.name}</p><p className="mt-1 text-[10px] text-zinc-500">{project.status.replaceAll('_', ' ')}</p></div><span className="font-mono text-[10px] text-zinc-400">{project.progress}%</span></div><div className="mt-3 h-1 overflow-hidden rounded-full bg-zinc-900"><div className="h-full rounded-full" style={{ width: `${project.progress}%`, backgroundColor: brandColor }} /></div></div>)}
        {!activeProjects.length && <ClientEmptyState>No active projects.</ClientEmptyState>}
      </ClientPanel>
      <ClientPanel title="Pending approvals" href="/client-deliverables" className="h-full">
        {pendingApprovals.slice(0, 4).map((item) => <a key={item.id} href={item.url} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-4 border-b border-zinc-900 px-5 py-4 last:border-0 hover:bg-zinc-900/30"><div className="min-w-0"><p className="truncate text-xs font-semibold text-white">{item.title}</p><p className="mt-1 truncate text-[10px] text-zinc-500">{item.project?.name || 'Project deliverable'}</p></div><Badge variant="risk-medium">Review</Badge></a>)}
        {!pendingApprovals.length && <ClientEmptyState>You are all caught up.</ClientEmptyState>}
      </ClientPanel>
      <ClientPanel title="Documents" href="/client-documents" className="h-full">
        {documentPreview.map((item) => <div key={`${item.type}:${item.id}`} className="flex items-center gap-3 border-b border-zinc-900 px-5 py-4 last:border-0"><div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-zinc-800 bg-zinc-900/60"><FileText className="h-4 w-4 text-zinc-400" /></div><div className="min-w-0"><p className="truncate text-xs font-semibold text-white">{item.title}</p><p className="mt-1 text-[10px] text-zinc-500">{item.meta.replaceAll('_', ' ')}</p></div></div>)}
        {!allDocuments && <ClientEmptyState>No documents have been shared yet.</ClientEmptyState>}
      </ClientPanel>
    </section>
    <section className="grid items-stretch gap-4 lg:grid-cols-3">
      <ClientPanel title="Latest deliverables" href="/client-deliverables" className="h-full">
        {deliverables.slice(0, 4).map((item) => <a key={item.id} href={item.url} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-4 border-b border-zinc-900 px-5 py-4 last:border-0 hover:bg-zinc-900/30"><div className="min-w-0"><p className="truncate text-xs font-semibold text-white">{item.title}</p><p className="mt-1 text-[10px] text-zinc-500">{new Date(item.createdAt).toLocaleDateString()}</p></div><Badge variant={statusTone(item.status)}>{item.status.replaceAll('_', ' ')}</Badge></a>)}
        {!deliverables.length && <ClientEmptyState>No deliverables yet.</ClientEmptyState>}
      </ClientPanel>
      <ClientPanel title="Current task progression" href="/client-projects" className="h-full">
        {tasks.filter((task) => task.status !== 'COMPLETED').slice(0, 4).map((task) => <div key={task.id} className="border-b border-zinc-900 px-5 py-4 last:border-0"><div className="flex items-center justify-between gap-4"><div className="min-w-0"><p className="truncate text-xs font-semibold text-white">{task.title}</p><p className="mt-1 truncate text-[10px] text-zinc-500">{task.project?.name || taskStatusLabel(task.status)}</p></div><span className="font-mono text-[10px] text-zinc-400">{task.progress}%</span></div><div className="mt-3 h-1 overflow-hidden rounded-full bg-zinc-900"><div className="h-full rounded-full" style={{ width: `${task.progress}%`, backgroundColor: brandColor }} /></div></div>)}
        {!tasks.length && <ClientEmptyState>No current tasks.</ClientEmptyState>}
      </ClientPanel>
      <ClientPanel title="Change request" href="/client-deliverables" linkLabel="Open requests" className="h-full">
        {changeRequests.slice(0, 3).map((request) => <div key={request.id} className="flex items-center justify-between gap-4 border-b border-zinc-900 px-5 py-4 last:border-0"><div className="min-w-0"><p className="truncate text-xs font-semibold text-white">{request.title}</p><p className="mt-1 truncate text-[10px] text-zinc-500">{request.project?.name || 'Project request'}</p></div><Badge variant={statusTone(request.status)}>{request.status.replaceAll('_', ' ')}</Badge></div>)}
        {!changeRequests.length && <ClientEmptyState><PackageCheck className="mx-auto mb-2 h-5 w-5 text-zinc-600" />No change requests are open.</ClientEmptyState>}
      </ClientPanel>
    </section>
  </div>;
}
