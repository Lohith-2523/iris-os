'use client';

import * as React from 'react';
import { ChevronDown, CircleDot, FolderKanban, Search } from 'lucide-react';
import { workspaceFetch as fetch } from '@/lib/workspace-data-cache';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { PageSkeleton } from '@/components/ui/page-skeletons';
import { ClientEmptyState, ClientWorkspacePageHeader } from '@/components/clients/client-workspace-ui';
import { taskStatusLabel } from '@/lib/tasks/status-progress';

type Task = { id: string; title: string; description?: string | null; status: string; progress: number; deadline?: string | null; stage?: { name: string; color?: string | null } | null; assignedTo?: { name: string } | null };
type Project = { id: string; name: string; status: string; progress: number; riskLevel: string; startDate: string; endDate?: string | null; stages?: { id: string; name: string; color?: string | null }[]; tasks?: Task[] };

function badgeVariant(value: string) {
  if (['COMPLETED', 'APPROVED'].includes(value)) return 'risk-low' as const;
  if (['BLOCKED', 'OVERDUE', 'HIGH'].includes(value)) return 'risk-high' as const;
  if (['IN_PROGRESS', 'MEDIUM', 'NEEDS_CLIENT_APPROVAL'].includes(value)) return 'risk-medium' as const;
  return 'outline' as const;
}

export default function ClientProjectsPage() {
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [query, setQuery] = React.useState('');
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    let active = true;
    fetch('/api/projects?limit=100', { cache: 'no-store' }).then(async response => {
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Unable to load projects.');
      if (active) setProjects(payload || []);
    }).catch(reason => { if (active) setError(reason instanceof Error ? reason.message : 'Unable to load projects.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const filtered = React.useMemo(() => projects.filter(project => {
    const needle = query.trim().toLowerCase();
    return !needle || project.name.toLowerCase().includes(needle) || project.tasks?.some(task => task.title.toLowerCase().includes(needle));
  }), [projects, query]);

  if (loading) return <PageSkeleton variant="client-portal" />;

  return <div className="dashboard-canvas space-y-6">
    <ClientWorkspacePageHeader eyebrow="Client workspace" title="Projects & tasks" description="Track every project, its current progress, stages, deadlines, and the tasks your delivery team is working through." />
    <div className="relative max-w-md"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search projects or tasks" className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950 pl-10 pr-4 text-xs text-white outline-none focus:border-zinc-600" /></div>
    {error && <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">{error}</div>}
    <div className="space-y-4">
      {filtered.map(project => {
        const isExpanded = expanded[project.id] !== false;
        return <Card key={project.id} className="overflow-hidden"><button type="button" aria-expanded={isExpanded} onClick={() => setExpanded(current => ({ ...current, [project.id]: !isExpanded }))} className="flex w-full items-center gap-4 p-5 text-left hover:bg-zinc-900/30"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-zinc-800 bg-zinc-900/70"><FolderKanban className="h-5 w-5 text-zinc-300" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="truncate text-sm font-semibold text-white">{project.name}</h2><Badge variant={badgeVariant(project.status)}>{project.status.replaceAll('_', ' ')}</Badge></div><div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-zinc-500"><span>{project.tasks?.length || 0} tasks</span><span>{new Date(project.startDate).toLocaleDateString()} — {project.endDate ? new Date(project.endDate).toLocaleDateString() : 'Ongoing'}</span><span>{project.riskLevel} risk</span></div></div><div className="hidden w-40 sm:block"><div className="mb-1 flex justify-between font-mono text-[10px] text-zinc-500"><span>Progress</span><span>{project.progress}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-zinc-900"><div className="h-full rounded-full bg-zinc-300" style={{ width: `${project.progress}%` }} /></div></div><ChevronDown className={`h-4 w-4 shrink-0 text-zinc-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} /></button>
          {isExpanded && <CardContent className="border-t border-zinc-900 p-0"><div className="flex min-w-0 gap-2 overflow-x-auto border-b border-zinc-900 px-5 py-3">{project.stages?.map(stage => <span key={stage.id} className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900/50 px-2.5 py-1 text-[10px] font-semibold text-zinc-300"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: stage.color || '#a1a1aa' }} />{stage.name}</span>)}</div>{project.tasks?.map(task => <div key={task.id} className="grid gap-3 border-b border-zinc-900 px-5 py-4 last:border-0 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"><div className="min-w-0"><div className="flex items-center gap-2"><CircleDot className="h-3.5 w-3.5 shrink-0 text-zinc-600" /><p className="truncate text-xs font-semibold text-white">{task.title}</p>{task.stage && <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-zinc-800 px-2 py-0.5 text-[9px] text-zinc-400"><span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: task.stage.color || '#a1a1aa' }} />{task.stage.name}</span>}</div><p className="mt-1 truncate pl-5 text-[10px] text-zinc-500">{task.assignedTo?.name || 'Unassigned'}{task.deadline ? ` · Due ${new Date(task.deadline).toLocaleDateString()}` : ''}</p></div><div className="flex items-center gap-3 pl-5 md:pl-0"><span className="font-mono text-[10px] text-zinc-500">{task.progress}%</span><Badge variant={badgeVariant(task.status)}>{taskStatusLabel(task.status)}</Badge></div></div>)}{!project.tasks?.length && <ClientEmptyState>No tasks have been added to this project.</ClientEmptyState>}</CardContent>}
        </Card>;
      })}
      {!filtered.length && <Card><ClientEmptyState>No projects match this search.</ClientEmptyState></Card>}
    </div>
  </div>;
}
