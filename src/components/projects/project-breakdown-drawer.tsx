'use client';

import * as React from 'react';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  Edit2,
  ExternalLink,
  FileCheck2,
  Layers3,
  MessageSquareText,
  ReceiptText,
  Users,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MetricCard } from '@/components/ui/metric-card';
import { cn, formatCurrency } from '@/lib/utils';
import { workspaceRoleLabel } from '@/lib/workspace-role-label';
import { ChangeRequestManager } from '@/components/projects/change-request-manager';

type BreakdownTab = 'overview' | 'workflow' | 'tasks' | 'deliverables' | 'changes' | 'team';

interface ProjectBreakdownDrawerProps {
  project: any;
  onClose: () => void;
  onEdit?: () => void;
  onOpenTasks?: () => void;
  tasks?: any[];
  deliverables?: any[];
  invoices?: any[];
  changeRequests?: any[];
  canManageChangeRequests?: boolean;
  onChangeRequestUpdated?: (changeRequest: any) => void | Promise<void>;
}

const statusLabel = (value?: string) => value === 'TODO' ? 'TO-DO' : (value || 'NOT_STARTED').replaceAll('_', ' ');

const dateLabel = (value?: string | Date | null) => {
  if (!value) return 'Not set';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not set' : date.toLocaleDateString('en-GB');
};

const taskProgress = (tasks: any[]) => {
  if (!tasks.length) return 0;
  return Math.round(tasks.reduce((sum, task) => sum + Number(task.progress || (task.status === 'COMPLETED' ? 100 : 0)), 0) / tasks.length);
};

export function ProjectBreakdownDrawer({
  project,
  onClose,
  onEdit,
  onOpenTasks,
  tasks: suppliedTasks,
  deliverables: suppliedDeliverables,
  invoices: suppliedInvoices,
  changeRequests: suppliedChangeRequests,
  canManageChangeRequests = false,
  onChangeRequestUpdated,
}: ProjectBreakdownDrawerProps) {
  const [activeTab, setActiveTab] = React.useState<BreakdownTab>('overview');
  const tasks = suppliedTasks || project.tasks || [];
  const deliverables = suppliedDeliverables || project.deliverables || [];
  const invoices = suppliedInvoices || project.invoices || [];
  const changeRequests = suppliedChangeRequests || project.changeRequests || [];
  const members = project.members || [];
  const stages = project.stages || [];
  const derivedProgress = taskProgress(tasks);
  const progress = Math.min(100, Math.max(0, Number(project.progress || derivedProgress)));
  const revenue = invoices.reduce((sum: number, invoice: any) => sum + Number(invoice.paidAmount || 0), 0);
  const receivables = invoices.reduce((sum: number, invoice: any) => {
    const balance = invoice.balanceDue ?? Math.max(0, Number(invoice.amount || 0) - Number(invoice.paidAmount || 0));
    return sum + Number(balance || 0);
  }, 0);

  React.useEffect(() => {
    setActiveTab('overview');
  }, [project.id]);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const tabs: Array<{ id: BreakdownTab; label: string; count?: number }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'workflow', label: 'Workflow', count: stages.length },
    { id: 'tasks', label: 'Tasks', count: tasks.length },
    { id: 'deliverables', label: 'Deliverables', count: deliverables.length },
    { id: 'changes', label: 'Change requests', count: changeRequests.length },
    { id: 'team', label: 'Team', count: members.length },
  ];

  const metrics = [
    { label: 'Revenue', value: formatCurrency(revenue), icon: CircleDollarSign },
    { label: 'Receivables', value: formatCurrency(receivables), icon: ReceiptText },
    { label: 'Team members', value: members.length.toString(), icon: Users },
    { label: 'Number of tasks', value: tasks.length.toString(), icon: ClipboardList },
    { label: 'Overall progress', value: `${progress}%`, icon: CheckCircle2 },
  ];

  return (
    <div
      className="project-breakdown-drawer-shell fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-label={`${project.name} project breakdown`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside className="project-breakdown-drawer flex h-full min-h-0 w-full max-w-[1120px] flex-col overflow-hidden border-l border-border bg-background text-foreground shadow-2xl animate-slideIn">
        <header className="project-breakdown-header flex shrink-0 flex-col items-start justify-between gap-4 border-b border-border px-5 py-5 sm:flex-row sm:px-7">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">Project breakdown</span>
              <Badge variant={project.status === 'COMPLETED' ? 'risk-low' : project.status === 'OVERDUE' || project.status === 'ON_HOLD' ? 'risk-high' : 'outline'}>
                {statusLabel(project.status)}
              </Badge>
            </div>
            <h2 className="break-words text-2xl font-bold tracking-tight sm:text-3xl">{project.name}</h2>
            <p className="mt-1 text-base text-muted-foreground">
              {project.client?.name || 'Client project'} · {project.serviceLine || 'Service delivery'}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
            {onEdit && (
              <Button type="button" variant="outline" onClick={onEdit} className="gap-2">
                <Edit2 className="h-4 w-4" /> Edit
              </Button>
            )}
            <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close project breakdown">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </header>

        <div className="project-breakdown-metrics-shell shrink-0 border-b border-border px-5 py-5 sm:px-7">
          <div className="project-breakdown-metrics grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {metrics.map(({ label, value, icon }) => (
              <MetricCard key={label} label={label} value={value} icon={icon} />
            ))}
          </div>
        </div>

        <nav className="project-breakdown-tabs flex shrink-0 gap-1 overflow-x-auto border-b border-border px-5 pt-3 sm:px-7" aria-label="Project breakdown sections">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'relative flex min-h-11 shrink-0 items-center gap-2 px-4 text-sm font-semibold transition-colors',
                activeTab === tab.id ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {tab.label}
              {tab.count !== undefined && <span className="rounded-full border border-border px-2 py-0.5 text-xs">{tab.count}</span>}
              {activeTab === tab.id && <span className="absolute inset-x-2 bottom-0 h-0.5 bg-foreground" />}
            </button>
          ))}
        </nav>

        <div className="project-breakdown-scroll min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-7">
          {activeTab === 'overview' && (
            <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
              <Card>
                <CardContent className="p-5">
                  <h3 className="text-lg font-semibold">Project summary</h3>
                  <div className="mt-5 grid gap-5 sm:grid-cols-2">
                    <Detail label="Service line" value={project.serviceLine || 'Not configured'} />
                    <Detail label="Risk level" value={statusLabel(project.riskLevel || 'LOW')} />
                    <Detail label="Start date" value={dateLabel(project.startDate)} icon={CalendarDays} />
                    <Detail label="Target date" value={dateLabel(project.endDate)} icon={CalendarDays} />
                    <Detail label="Timeline" value={project.timeline || 'Not configured'} />
                    <Detail label="Internal budget" value={project.budget ? formatCurrency(Number(project.budget)) : 'Not configured'} />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <h3 className="text-lg font-semibold">Delivery health</h3>
                  <div className="mt-6 flex items-end justify-between gap-4">
                    <div>
                      <p className="text-4xl font-bold">{progress}%</p>
                      <p className="mt-1 text-sm text-muted-foreground">Overall project progress</p>
                    </div>
                    <Badge variant={project.deliveryDelays?.total > 0 ? 'risk-high' : 'risk-low'}>
                      {project.deliveryDelays?.total > 0 ? `${project.deliveryDelays.total} delayed items` : 'On schedule'}
                    </Badge>
                  </div>
                  <div className="mt-5 h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-foreground transition-[width] duration-500" style={{ width: `${progress}%` }} />
                  </div>
                  <div className="mt-6 grid grid-cols-3 gap-3 border-t border-border pt-5 text-center">
                    <Detail label="Completed" value={tasks.filter((task: any) => task.status === 'COMPLETED').length.toString()} />
                    <Detail label="In progress" value={tasks.filter((task: any) => task.status === 'IN_PROGRESS').length.toString()} />
                    <Detail label="Awaiting approval" value={tasks.filter((task: any) => task.status === 'NEEDS_CLIENT_APPROVAL').length.toString()} />
                  </div>
                </CardContent>
              </Card>
              <Card className="lg:col-span-2">
                <CardContent className="grid gap-5 p-5 sm:grid-cols-2 lg:grid-cols-4">
                  <Detail label="Payment type" value={project.paymentType === 'ONE_TIME' ? 'One-time' : 'Retainer'} />
                  <Detail label="Payment amount" value={project.paymentAmount ? formatCurrency(Number(project.paymentAmount)) : 'Not configured'} />
                  <Detail label="Frequency" value={project.paymentFrequency || (project.paymentType === 'ONE_TIME' ? 'One-time' : 'Not configured')} />
                  <Detail label="Payment start" value={dateLabel(project.paymentStartDate)} />
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'workflow' && (
            <div className="space-y-4">
              {stages.map((stage: any, index: number) => {
                const stageTasks = tasks.filter((task: any) => task.stageId === stage.id);
                const stageDeliverables = deliverables.filter((item: any) => item.stageId === stage.id || item.task?.stage?.id === stage.id);
                const stageProgress = taskProgress(stageTasks);
                return (
                  <Card key={stage.id || index}>
                    <CardContent className="grid gap-5 p-5 lg:grid-cols-[auto_minmax(0,1fr)_180px] lg:items-center">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-muted font-bold">{index + 1}</div>
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-lg font-semibold">{stage.name}</h3>
                          <Badge variant="outline">{stageTasks.length} tasks</Badge>
                          <Badge variant="outline">{stageDeliverables.length} deliverables</Badge>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">{dateLabel(stage.startDate)} to {dateLabel(stage.endDate)}</p>
                      </div>
                      <div>
                        <div className="mb-2 flex justify-between text-sm"><span className="text-muted-foreground">Stage progress</span><span className="font-semibold">{stageProgress}%</span></div>
                        <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-foreground" style={{ width: `${stageProgress}%` }} /></div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {!stages.length && <EmptyState icon={Layers3} title="No project stages yet" description="Stages will appear here once the project workflow is configured." />}
            </div>
          )}

          {activeTab === 'tasks' && (
            <div className="space-y-3">
              {tasks.map((task: any, index: number) => (
                <Card key={task.id || index}>
                  <CardContent className="grid gap-4 p-4 sm:grid-cols-[auto_minmax(0,1fr)_160px] sm:items-center">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-muted text-sm font-bold">{index + 1}</span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{task.title}</h3><Badge variant="outline">{statusLabel(task.status)}</Badge></div>
                      <p className="mt-1 text-sm text-muted-foreground">{task.stage?.name || 'No stage'} · {task.assignedTo?.name || 'Unassigned'} · Due {dateLabel(task.deadline)}</p>
                    </div>
                    <div><div className="mb-2 flex justify-between text-sm"><span className="text-muted-foreground">Progress</span><span>{Number(task.progress || 0)}%</span></div><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-foreground" style={{ width: `${Number(task.progress || 0)}%` }} /></div></div>
                  </CardContent>
                </Card>
              ))}
              {!tasks.length && <EmptyState icon={ClipboardList} title="No tasks yet" description="Tasks created for this project will appear here." />}
            </div>
          )}

          {activeTab === 'deliverables' && (
            <div className="space-y-3">
                {deliverables.map((item: any, index: number) => (
                  <Card key={item.id || index}>
                    <CardContent className="flex items-start justify-between gap-4 p-5">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{item.title}</h3><Badge variant="outline">{statusLabel(item.status)}</Badge></div>
                        <p className="mt-2 text-sm text-muted-foreground">{item.description || item.task?.title || 'Project deliverable'}</p>
                        <p className="mt-2 text-sm text-muted-foreground">Submitted by {item.submittedByName || 'Project team'}</p>
                      </div>
                      {item.url && <a href={item.url} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold underline underline-offset-4">Open <ExternalLink className="h-4 w-4" /></a>}
                    </CardContent>
                  </Card>
                ))}
                {!deliverables.length && <EmptyState icon={FileCheck2} title="No deliverables submitted" description="Links and files submitted against this project will appear here." />}
            </div>
          )}

          {activeTab === 'changes' && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-4">
                <MessageSquareText className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                <div><h3 className="font-semibold">Project change control</h3><p className="mt-1 text-sm text-muted-foreground">Review client proposals, discuss alternatives, and finalize the agreed scope. Atlas updates the task plan when a request is finalized.</p></div>
              </div>
              <ChangeRequestManager requests={changeRequests} canManage={canManageChangeRequests} onUpdated={onChangeRequestUpdated} />
            </div>
          )}

          {activeTab === 'team' && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {members.map((member: any, index: number) => {
                const person = member.user || member;
                return (
                  <Card key={member.id || person.id || index}>
                    <CardContent className="flex items-center gap-4 p-5">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-muted font-bold">{person.name?.slice(0, 1)?.toUpperCase() || 'T'}</span>
                      <div className="min-w-0"><p className="truncate font-semibold">{person.name || 'Team member'}</p><p className="mt-1 truncate text-sm text-muted-foreground">{workspaceRoleLabel(person.role || member.role) || 'Project team'}</p></div>
                    </CardContent>
                  </Card>
                );
              })}
              {!members.length && <div className="sm:col-span-2 lg:col-span-3"><EmptyState icon={Users} title="No team members assigned" description="Assigned project specialists will appear here." /></div>}
            </div>
          )}
        </div>

        {onOpenTasks && (
          <footer className="project-breakdown-footer flex shrink-0 justify-end border-t border-border px-5 py-4 sm:px-7">
            <Button type="button" onClick={onOpenTasks} className="gap-2">Open full task workspace <ArrowRight className="h-4 w-4" /></Button>
          </footer>
        )}
      </aside>
    </div>
  );
}

function Detail({ label, value, icon: Icon }: { label: string; value: string; icon?: React.ComponentType<{ className?: string }> }) {
  return <div className="min-w-0"><p className="flex items-center gap-2 text-sm text-muted-foreground">{Icon && <Icon className="h-4 w-4" />}{label}</p><p className="mt-1 break-words font-semibold">{value}</p></div>;
}

function EmptyState({ icon: Icon, title, description }: { icon: React.ComponentType<{ className?: string }>; title: string; description: string }) {
  return <Card><CardContent className="flex min-h-44 flex-col items-center justify-center p-8 text-center"><Icon className="h-8 w-8 text-muted-foreground" /><h3 className="mt-4 font-semibold">{title}</h3><p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p></CardContent></Card>;
}
