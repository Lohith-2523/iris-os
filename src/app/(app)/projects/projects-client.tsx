'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Plus,
  Calendar,
  AlertTriangle,
  Loader2,
  Users,
  ArrowRight,
  X,
  Layers,
  ArrowUp,
  ArrowDown,
  Edit2,
  Building2,
  BriefcaseBusiness,
  Gem,
  Globe2,
  Landmark,
  Megaphone,
  Rocket,
  Store,
  ChevronDown,
  ChevronRight,
  ListPlus,
  FolderKanban,
  ClipboardList,
  CircleDollarSign,
  TimerReset,
  type LucideIcon,
} from 'lucide-react';
import { ExpandableCard } from '@/components/ui/expandable-card';
import { formatCurrencyFor, getCurrencySymbol, cn } from '@/lib/utils';
import { workspaceRoleLabel } from '@/lib/workspace-role-label';
import { PageSkeleton } from '@/components/ui/page-skeletons';
import { DateInput } from '@/components/ui/date-input';
import { getDeliveryDelaySummary, isTaskDelayed } from '@/lib/delivery-delays';
import { agencyServiceLines } from '@/lib/agency-specializations';
import { ProjectBreakdownDrawer } from '@/components/projects/project-breakdown-drawer';
import type { ProjectsReadModel } from '@/server/read-models/workspace-pages';
import { useWorkspaceRuntime } from '@/components/demo/demo-mode-provider';
import { MetaLogo } from '@/components/integrations/meta-brand-lockup';
import { WORKSPACE_PROJECTS_PREVIEW_EVENT } from '@/lib/workspace-tour-config';

const clientIdentityIcons: LucideIcon[] = [
  Building2,
  BriefcaseBusiness,
  Gem,
  Globe2,
  Landmark,
  Megaphone,
  Rocket,
  Store,
];

const clientIdentityPalettes = [
  { light: '#5b21b6', lightName: '#4c1d95', dark: '#c4b5fd' },
  { light: '#0369a1', lightName: '#0c4a6e', dark: '#7dd3fc' },
  { light: '#0f766e', lightName: '#115e59', dark: '#5eead4' },
  { light: '#b45309', lightName: '#78350f', dark: '#fcd34d' },
  { light: '#be123c', lightName: '#881337', dark: '#fda4af' },
  { light: '#047857', lightName: '#064e3b', dark: '#6ee7b7' },
  { light: '#c2410c', lightName: '#7c2d12', dark: '#fdba74' },
  { light: '#4338ca', lightName: '#312e81', dark: '#a5b4fc' },
];

function getClientIdentity(clientId: string) {
  let hash = 2166136261;
  for (let index = 0; index < clientId.length; index += 1) {
    hash ^= clientId.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  const stableHash = hash >>> 0;
  return {
    Icon: clientIdentityIcons[(stableHash >>> 8) % clientIdentityIcons.length],
    palette: clientIdentityPalettes[stableHash % clientIdentityPalettes.length],
  };
}

const projectStatusLabel = (status?: string) => status === 'TODO'
  ? 'TO-DO'
  : String(status || 'NOT_STARTED')
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());

type QuickTaskDraft = {
  id: string;
  title: string;
  description: string;
  deadline: string;
  stageId: string;
  assignedToId: string;
  expanded: boolean;
};
const newQuickTaskDraft = (stageId = ''): QuickTaskDraft => ({
  id: crypto.randomUUID(),
  title: '',
  description: '',
  deadline: '',
  stageId,
  assignedToId: '',
  expanded: true,
});

export default function ProjectsPage({ initialData }: { initialData: ProjectsReadModel }) {
  const searchParams = useSearchParams();
  const requestedProjectId = searchParams.get('projectId');
  const { router, fetch } = useWorkspaceRuntime();
  const initialServiceLines = agencyServiceLines(initialData.workspace.organization.agencyTypes);
  const [projects, setProjects] = React.useState<any[]>(initialData.projects);
  const [clients, setClients] = React.useState<any[]>(initialData.clients);
  const [teamMembers, setTeamMembers] = React.useState<any[]>(initialData.teamMembers);
  const [loading, setLoading] = React.useState(false);
  const [currencyState, setCurrencyState] = React.useState(initialData.workspace.organization.currency || 'USD');
  const [availableServiceLines, setAvailableServiceLines] = React.useState<string[]>(initialServiceLines);
  const [canManageChangeRequests, setCanManageChangeRequests] = React.useState(initialData.workspace.user.role.toLowerCase() === 'admin');
  const [expandedClientId, setExpandedClientId] = React.useState<string | null>(null);
  const [quickTaskProjectId, setQuickTaskProjectId] = React.useState('');
  const [quickTaskModalOpen, setQuickTaskModalOpen] = React.useState(false);
  const [quickTaskDrafts, setQuickTaskDrafts] = React.useState<QuickTaskDraft[]>([]);
  const [creatingQuickTasks, setCreatingQuickTasks] = React.useState(false);
  const [quickTaskError, setQuickTaskError] = React.useState('');
  const [showCreationStageEditor, setShowCreationStageEditor] = React.useState(false);
  const gridRef = React.useRef<HTMLDivElement>(null);

  // Detail Drawer State
  const [selectedProject, setSelectedProject] = React.useState<any | null>(null);
  const [isEditing, setIsEditing] = React.useState(false);

  React.useEffect(() => {
    if (!requestedProjectId) return;
    const project = projects.find((item) => item.id === requestedProjectId);
    if (!project) return;
    setExpandedClientId(project.clientId);
    setSelectedProject(project);
    setIsEditing(false);
  }, [projects, requestedProjectId]);
  const [editForm, setEditForm] = React.useState<any>({
    name: '',
    serviceLine: initialServiceLines[0] || '',
    budget: '',
    paymentType: 'RETAINER',
    paymentAmount: '',
    paymentFrequency: 'monthly',
    paymentStartDate: '',
    paymentTerms: '',
    timeline: '',
    startDate: '',
    endDate: '',
    status: 'IN_PROGRESS',
    riskLevel: 'LOW',
    metaIntegrationEnabled: false,
    memberIds: [] as string[],
    stages: [] as any[]
  });

  // Creation Modal State
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [formError, setFormError] = React.useState('');
  const [newProjectForm, setNewProjectForm] = React.useState({
    name: '',
    clientId: '',
    serviceLine: '',
    timeline: '3 Months',
    startDate: new Date().toISOString().split('T')[0],
    deadline: new Date(new Date().getTime() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    budget: '',
    paymentType: 'RETAINER',
    paymentAmount: '',
    paymentFrequency: 'monthly',
    paymentStartDate: new Date().toISOString().split('T')[0],
    paymentTerms: '',
    autoGenerateInvoice: false,
    metaIntegrationEnabled: false,
    status: 'IN_PROGRESS',
    riskLevel: 'LOW',
    memberIds: [] as string[],
    taskName: '',
    taskStagePosition: 0,
    taskDeadline: '',
    stages: [
      { name: 'Initial Stage', color: '#94A3B8' },
    ]
  });

  React.useEffect(() => {
    const showTourView = (event: Event) => {
      const view = (event as CustomEvent<{ view?: 'overview' | 'create' }>).detail?.view;
      if (view === 'overview') setIsCreateOpen(false);
      if (view === 'create') setIsCreateOpen(true);
    };
    window.addEventListener(WORKSPACE_PROJECTS_PREVIEW_EVENT, showTourView);
    return () => window.removeEventListener(WORKSPACE_PROJECTS_PREVIEW_EVENT, showTourView);
  }, []);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [projRes, clientsRes, teamRes, workspaceRes] = await Promise.all([
        fetch('/api/projects'),
        fetch('/api/data?domain=clients'),
        fetch('/api/data?domain=team'),
        fetch('/api/workspace'),
      ]);

      if (projRes.ok) {
        const data = await projRes.json();
        setProjects(data);

        // If a project is currently selected in the drawer, sync it without
        // making the loader depend on selection state.
        setSelectedProject((current: any) => {
          if (!current) return current;
          return data.find((project: any) => project.id === current.id) || current;
        });
      }

      if (clientsRes.ok) {
        const data = await clientsRes.json();
        setClients(data);
      }

      if (teamRes.ok) {
        const data = await teamRes.json();
        setTeamMembers(data.filter((t: any) => t.role?.toLowerCase() !== 'client'));
      }

      if (workspaceRes.ok) {
        const workspace = await workspaceRes.json();
        setCurrencyState(workspace.organization?.currency || 'USD');
        setCanManageChangeRequests(workspace.user?.role?.toLowerCase() === 'admin');
        const serviceLines = agencyServiceLines(workspace.organization?.agencyTypes);
        setAvailableServiceLines(serviceLines);
        setNewProjectForm((current) => ({
          ...current,
          serviceLine: serviceLines.includes(current.serviceLine) ? current.serviceLine : serviceLines[0] || '',
        }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initialize Edit form when detail drawer opens
  React.useEffect(() => {
    if (selectedProject) {
      setEditForm({
        name: selectedProject.name || '',
        serviceLine: selectedProject.serviceLine || '',
        budget: selectedProject.budget ? selectedProject.budget.toString() : '',
        paymentType: selectedProject.paymentType || 'RETAINER',
        paymentAmount: selectedProject.paymentAmount ? selectedProject.paymentAmount.toString() : '',
        paymentFrequency: selectedProject.paymentFrequency || 'monthly',
        paymentStartDate: selectedProject.paymentStartDate
          ? selectedProject.paymentStartDate.split('T')[0]
          : (selectedProject.startDate ? selectedProject.startDate.split('T')[0] : ''),
        paymentTerms: selectedProject.paymentTerms || '',
        timeline: selectedProject.timeline || '',
        startDate: selectedProject.startDate ? selectedProject.startDate.split('T')[0] : '',
        endDate: selectedProject.endDate ? selectedProject.endDate.split('T')[0] : '',
        status: selectedProject.status || 'IN_PROGRESS',
        riskLevel: selectedProject.riskLevel || 'LOW',
        metaIntegrationEnabled: Boolean(selectedProject.metaIntegrationEnabled),
        memberIds: selectedProject.members?.map((m: any) => m.userId) || [],
        stages: selectedProject.stages || []
      });
      setIsEditing(false);
    }
  }, [selectedProject]);

  // Input change handler for creation form with stage auto-division
  const handleCreationInputChange = (name: string, value: any) => {
    setNewProjectForm(prev => {
      const nextData = { ...prev, [name]: value };
      return nextData;
    });
  };

  // Stage modification helpers for creation form
  const addCreationStage = () => {
    setNewProjectForm(prev => {
      if (prev.stages.length >= 8) return prev;
      const newStages = [...prev.stages, { name: `Phase ${prev.stages.length + 1}`, color: '#94A3B8' }];
      return {
        ...prev,
        stages: newStages,
        taskStagePosition: Math.min(prev.taskStagePosition, newStages.length - 1),
      };
    });
  };

  const removeCreationStage = (idx: number) => {
    setNewProjectForm(prev => {
      if (prev.stages.length <= 1) return prev;
      const newStages = prev.stages.filter((_, i) => i !== idx);
      return {
        ...prev,
        stages: newStages,
        taskStagePosition: Math.min(prev.taskStagePosition, newStages.length - 1),
      };
    });
  };

  const moveCreationStage = (idx: number, direction: 'up' | 'down') => {
    setNewProjectForm(prev => {
      const nextIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (nextIdx < 0 || nextIdx >= prev.stages.length) return prev;
      const newStages = [...prev.stages];
      const temp = newStages[idx];
      newStages[idx] = newStages[nextIdx];
      newStages[nextIdx] = temp;
      return {
        ...prev,
        stages: newStages
      };
    });
  };

  // Input change handler for edit form with stage auto-division
  const handleEditInputChange = (name: string, value: any) => {
    setEditForm((prev: any) => {
      const nextData = { ...prev, [name]: value };
      return nextData;
    });
  };

  // Stage modification helpers for edit form
  const addEditStage = () => {
    setEditForm((prev: any) => {
      if (prev.stages.length >= 8) return prev;
      const newStages = [...prev.stages, { name: `Phase ${prev.stages.length + 1}`, color: '#94A3B8' }];
      return {
        ...prev,
        stages: newStages
      };
    });
  };

  const removeEditStage = (idx: number) => {
    setEditForm((prev: any) => {
      if (prev.stages.length <= 1) return prev;
      const newStages = prev.stages.filter((_: any, i: number) => i !== idx);
      return {
        ...prev,
        stages: newStages
      };
    });
  };

  const moveEditStage = (idx: number, direction: 'up' | 'down') => {
    setEditForm((prev: any) => {
      const nextIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (nextIdx < 0 || nextIdx >= prev.stages.length) return prev;
      const newStages = [...prev.stages];
      const temp = newStages[idx];
      newStages[idx] = newStages[nextIdx];
      newStages[nextIdx] = temp;
      return {
        ...prev,
        stages: newStages
      };
    });
  };

  // Create Project handler
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const { name, clientId, budget, paymentAmount, paymentStartDate } = newProjectForm;

    if (!name || !clientId) {
      setFormError('Project Name and Client Association are required.');
      return;
    }
    if (!availableServiceLines.includes(newProjectForm.serviceLine)) {
      setFormError('Select a specialization enabled in Agency Settings.');
      return;
    }
    if (!paymentAmount || Number(paymentAmount) <= 0 || !paymentStartDate) {
      setFormError('A positive client payment and invoice date are required.');
      return;
    }
    if (!newProjectForm.startDate) {
      setFormError('A project start date is required.');
      return;
    }

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          clientId,
          serviceLine: newProjectForm.serviceLine,
          timeline: newProjectForm.timeline,
          startDate: newProjectForm.startDate,
          endDate: newProjectForm.deadline || null,
          budget: budget ? parseFloat(budget) : null,
          paymentType: newProjectForm.paymentType,
          paymentAmount: Number(newProjectForm.paymentAmount),
          paymentFrequency: newProjectForm.paymentType === 'RETAINER' ? newProjectForm.paymentFrequency : null,
          paymentStartDate: newProjectForm.paymentStartDate,
          paymentTerms: newProjectForm.paymentTerms,
          autoGenerateInvoice: newProjectForm.autoGenerateInvoice,
          metaIntegrationEnabled: newProjectForm.metaIntegrationEnabled,
          status: newProjectForm.status,
          riskLevel: newProjectForm.riskLevel,
          memberIds: newProjectForm.memberIds,
          tasks: newProjectForm.taskName.trim() ? [{
            title: newProjectForm.taskName.trim(),
            stagePosition: newProjectForm.taskStagePosition,
            deadline: newProjectForm.taskDeadline || null,
          }] : [],
          stages: newProjectForm.stages
        })
      });

      if (res.ok) {
        const data = await res.json();
        setProjects((current) => [data.project, ...current.filter((project) => project.id !== data.project.id)]);
        if (data.invoiceWarning) {
          alert(data.invoiceWarning);
        }
        setIsCreateOpen(false);
        setNewProjectForm({
          name: '',
          clientId: '',
          serviceLine: availableServiceLines[0] || '',
          timeline: '3 Months',
          startDate: new Date().toISOString().split('T')[0],
          deadline: new Date(new Date().getTime() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          budget: '',
          paymentType: 'RETAINER',
          paymentAmount: '',
          paymentFrequency: 'monthly',
          paymentStartDate: new Date().toISOString().split('T')[0],
          paymentTerms: '',
          autoGenerateInvoice: false,
          metaIntegrationEnabled: false,
          status: 'IN_PROGRESS',
          riskLevel: 'LOW',
          memberIds: [],
          taskName: '',
          taskStagePosition: 0,
          taskDeadline: '',
          stages: [
            { name: 'Initial Stage', color: '#94A3B8' },
          ]
        });
        setShowCreationStageEditor(false);
      } else {
        const err = await res.json();
        setFormError(err.error || 'Failed to create project.');
      }
    } catch (e) {
      console.error(e);
      setFormError('Internal server error.');
    }
  };

  const openProjectCreationForClient = (clientId: string) => {
    setNewProjectForm((current) => ({
      ...current,
      clientId,
      stages: current.stages,
    }));
    setFormError('');
    setIsCreateOpen(true);
  };

  const openQuickTaskCreation = () => {
    if (!expandedClientId || !quickTaskProjectId) return;
    const project = projects.find((item) => item.id === quickTaskProjectId);
    setQuickTaskDrafts([newQuickTaskDraft(project?.stages?.[0]?.id || '')]);
    setQuickTaskError('');
    setQuickTaskModalOpen(true);
  };

  const createQuickTasks = async () => {
    if (!expandedClientId || !quickTaskProjectId || creatingQuickTasks) return;
    const validDrafts = quickTaskDrafts.filter((task) => task.title.trim());
    if (!validDrafts.length) {
      setQuickTaskError('Add at least one task title.');
      return;
    }
    if (quickTaskStages.length > 0 && validDrafts.some((task) => !task.stageId)) {
      setQuickTaskError('Choose a stage for every task.');
      return;
    }
    setCreatingQuickTasks(true);
    setQuickTaskError('');
    try {
      for (const task of validDrafts) {
        const response = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'create_task',
            clientId: expandedClientId,
            projectId: quickTaskProjectId,
            title: task.title.trim(),
            description: task.description.trim() || null,
            deadline: task.deadline || null,
            stageId: task.stageId || null,
            assignedToId: task.assignedToId || null,
            status: 'TODO',
            progress: 0,
          }),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || `Unable to create “${task.title}”.`);
        setQuickTaskDrafts((current) => current.filter((draft) => draft.id !== task.id));
      }
      setQuickTaskModalOpen(false);
      await loadData();
    } catch (error) {
      setQuickTaskError(error instanceof Error ? error.message : 'Unable to create tasks. Completed tasks were removed from this list.');
    } finally {
      setCreatingQuickTasks(false);
    }
  };

  // Edit/Update project details handler
  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;

    try {
      const res = await fetch('/api/projects', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProject.id,
          name: editForm.name,
          serviceLine: editForm.serviceLine,
          budget: editForm.budget,
          paymentType: editForm.paymentType,
          paymentAmount: editForm.paymentAmount,
          paymentFrequency: editForm.paymentType === 'RETAINER' ? editForm.paymentFrequency : null,
          paymentStartDate: editForm.paymentStartDate,
          paymentTerms: editForm.paymentTerms,
          timeline: editForm.timeline,
          startDate: editForm.startDate,
          endDate: editForm.endDate || null,
          status: editForm.status,
          riskLevel: editForm.riskLevel,
          metaIntegrationEnabled: editForm.metaIntegrationEnabled,
          memberIds: editForm.memberIds,
          stages: editForm.stages
        })
      });

      if (res.ok) {
        const data = await res.json();
        setSelectedProject(data.project);
        setProjects((current) => current.map((project) =>
          project.id === data.project.id ? data.project : project
        ));
        setIsEditing(false);
      } else {
        alert('Failed to update project details.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Helper stats
  const stats = React.useMemo(() => {
    const total = projects.length;
    const active = projects.filter(p => p.status === 'IN_PROGRESS').length;
    const hold = projects.filter(p => p.status === 'ON_HOLD').length;
    const contractedValue = projects.reduce((sum, p) => sum + (p.paymentAmount || 0), 0);
    const delayCount = projects.reduce((sum, project) => sum + getDeliveryDelaySummary(project).total, 0);

    return { total, active, hold, contractedValue, delayCount };
  }, [projects]);

  const sortedClients = React.useMemo(() => {
    if (!expandedClientId) return clients;
    const expanded = clients.find(c => c.id === expandedClientId);
    if (!expanded) return clients;
    const rest = clients.filter(c => c.id !== expandedClientId);
    return [expanded, ...rest];
  }, [clients, expandedClientId]);

  const quickTaskProject = React.useMemo(
    () => projects.find((project) => project.id === quickTaskProjectId),
    [projects, quickTaskProjectId],
  );
  const quickTaskStages = quickTaskProject?.stages || [];

  React.useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (expandedClientId && gridRef.current && !gridRef.current.contains(e.target as Node)) {
        const target = e.target as HTMLElement;
        if (target.closest('[role="dialog"]') || target.closest('.fixed')) {
          return;
        }
        setExpandedClientId(null);
      }
    };

    document.addEventListener('click', handleOutsideClick);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
    };
  }, [expandedClientId]);

  React.useEffect(() => {
    setQuickTaskProjectId('');
  }, [expandedClientId]);

  if (loading) return <PageSkeleton variant="projects" />;

  return (
    <div className="space-y-6 font-sans text-xs">
      {/* Top Banner Row */}
      <div className="flex flex-col gap-3 border-b border-zinc-900 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white silver-text-gradient">Projects Workspace</h1>
          <p className="text-[10px] text-zinc-550 mt-0.5">Core Agency Program & Program Allocation Management Hub</p>
        </div>
        <Button
          data-tour="create-project"
          onClick={() => {
            setIsCreateOpen(true);
          }}
          className="h-8 rounded-none bg-white text-zinc-950 hover:bg-zinc-200 text-xs font-semibold px-4 flex items-center gap-1.5"
        >
          <Plus className="h-4 w-4" />
          <span>New Project</span>
        </Button>
      </div>

      {/* KPI Cards */}
      <div data-tour="projects-overview" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-sky-900/40 shadow-[inset_0_-18px_28px_-28px_rgba(56,189,248,0.7)]">
          <CardHeader className="pb-1.5">
            <CardTitle className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-wider text-zinc-550"><FolderKanban className="h-4 w-4 text-sky-300" />Active Projects</CardTitle>
          </CardHeader>
          <CardContent className="flex items-baseline gap-2">
            <div className="text-xl font-bold font-mono tracking-tight text-sky-300">{stats.active}</div>
            <span className="text-[9px] text-white">out of {stats.total} total projects</span>
          </CardContent>
        </Card>
        
        <Card className="border-amber-900/40 shadow-[inset_0_-18px_28px_-28px_rgba(245,158,11,0.65)]">
          <CardHeader className="pb-1.5">
            <CardTitle className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-wider text-zinc-550"><ClipboardList className="h-4 w-4 text-amber-300" />Total Program Backlog</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold font-mono tracking-tight text-white">{projects.filter(p => p.status === 'NOT_STARTED').length} Projects</div>
          </CardContent>
        </Card>

        <Card className="border-emerald-900/40 shadow-[inset_0_-18px_28px_-28px_rgba(52,211,153,0.65)]">
          <CardHeader className="pb-1.5">
            <CardTitle className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-wider text-zinc-550"><CircleDollarSign className="h-4 w-4 text-emerald-300" />Project Contract Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold font-mono tracking-tight text-emerald-300">{formatCurrencyFor(stats.contractedValue, currencyState)}</div>
          </CardContent>
        </Card>

        <Card className={stats.delayCount > 0 ? 'border-rose-900/40 shadow-[inset_0_-18px_28px_-28px_rgba(244,63,94,0.65)]' : 'border-emerald-900/40 shadow-[inset_0_-18px_28px_-28px_rgba(52,211,153,0.55)]'}>
          <CardHeader className="pb-1.5">
            <CardTitle className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-wider text-zinc-550"><TimerReset className="h-4 w-4 text-rose-300" />Task delays</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2">
            <div className={`text-xl font-bold font-mono tracking-tight ${stats.delayCount > 0 ? 'text-rose-450' : 'text-emerald-450'}`}>
              {stats.delayCount} Delayed
            </div>
            {stats.delayCount > 0 && <AlertTriangle className="h-4 w-4 text-rose-500 animate-pulse" />}
          </CardContent>
        </Card>
      </div>

      {/* Client Portfolio Cards */}
      {loading ? (
        <div className="p-12 text-center text-zinc-500 flex items-center justify-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Synchronizing program desk...</span>
        </div>
      ) : clients.length === 0 ? (
        <div className="p-12 border border-dashed border-zinc-850 text-center text-zinc-650 italic rounded-xl">
          No clients onboarded. Click &ldquo;New Project&rdquo; or onboard clients first.
        </div>
      ) : (
        <div ref={gridRef} className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sortedClients.map((client) => {
            const isExpanded = expandedClientId === client.id;
            const clientProjects = projects.filter(p => p.clientId === client.id);
            const clientDelayCount = clientProjects.reduce((sum, project) => sum + getDeliveryDelaySummary(project).total, 0);
            const { Icon: ClientIcon, palette: clientPalette } = getClientIdentity(client.id);
            
            return (
              <Card 
                key={client.id} 
                onClick={() => {
                  if (!isExpanded) {
                    setExpandedClientId(client.id);
                  }
                }}
                style={{
                  '--client-identity-light': clientPalette.light,
                  '--client-identity-light-name': clientPalette.lightName,
                  '--client-identity-dark': clientPalette.dark,
                } as React.CSSProperties}
                className={cn(
                  "project-client-card transition-all duration-300 flex flex-col justify-between border border-zinc-800/80 border-l-8 overflow-hidden relative shadow-lg",
                  isExpanded 
                    ? "project-client-card-expanded col-span-1 md:col-span-2 row-span-2 h-[clamp(34rem,76dvh,44rem)] bg-zinc-900/50"
                    : "col-span-1 h-[350px] bg-zinc-900/20 hover:bg-zinc-900/40 cursor-pointer hover:border-zinc-750/80 hover:scale-[1.01] hover:shadow-indigo-500/5"
                )}
              >
                {isExpanded ? (
                  /* EXPANDED VIEW */
                  <div className="p-6 flex flex-col h-full relative" onClick={(e) => e.stopPropagation()}>
                    {/* Close button */}
                    <button
                      onClick={() => setExpandedClientId(null)}
                      className="absolute top-4 right-4 z-10 p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>

                    <div className="project-client-expanded-header pb-3 border-b border-zinc-800 flex justify-between items-start gap-3 pr-8">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="project-client-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border">
                          <ClientIcon className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <div className="min-w-0">
                          <h2 className="project-client-name truncate text-xl font-black tracking-tighter leading-tight">{client.name}</h2>
                          <p className="text-[9px] text-zinc-500 mt-0.5 font-bold uppercase tracking-wider">{clientProjects.length} {clientProjects.length === 1 ? 'project' : 'projects'}</p>
                        </div>
                      </div>
                      <div className="project-client-expanded-badges flex flex-wrap justify-end gap-2">
                        <Badge variant={client.status === 'ACTIVE' ? 'risk-low' : 'outline'} className="project-client-project-badge uppercase font-bold rounded-md">
                          {client.status}
                        </Badge>
                        <Badge variant={clientDelayCount ? 'risk-high' : 'risk-low'} className="project-client-project-badge uppercase font-bold rounded-md">
                          {clientDelayCount ? `${clientDelayCount} delays` : 'On schedule'}
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-3.5 flex-1 overflow-y-auto pr-2 mt-4 scrollbar-none">
                      {clientProjects.length === 0 ? (
                        <div className="py-12 border border-dashed border-zinc-850 text-center text-zinc-650 italic rounded-xl bg-zinc-900/10">
                          No campaigns/projects initiated yet. Click &ldquo;New Project&rdquo; to create one.
                        </div>
                      ) : (
                        clientProjects.map((proj) => {
                          const completedTasks = proj.tasks?.filter((t: any) => t.status === 'COMPLETED').length || 0;
                          const totalTasks = proj.tasks?.length || 0;
                          const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
                          return (
                            <div 
                              key={proj.id} 
                              className="project-client-project border border-zinc-800/80 bg-zinc-900/40 rounded-xl hover:bg-zinc-900/60 transition-all duration-200"
                            >
                              <div className="project-client-project-overview min-w-0 space-y-2">
                                <div className="project-client-project-heading flex min-w-0 flex-wrap items-center gap-2">
                                  <h4 className="project-client-project-title min-w-0 font-bold text-white tracking-wide">{proj.name}</h4>
                                  <Badge variant={proj.status === 'COMPLETED' ? 'risk-low' : proj.status === 'OVERDUE' || proj.status === 'ON_HOLD' ? 'risk-high' : 'outline'} className="project-client-project-badge uppercase font-bold rounded-md">
                                    {projectStatusLabel(proj.status)}
                                  </Badge>
                                </div>
                              </div>

                              <div className="project-client-project-progress min-w-0 space-y-1.5">
                                <div className="project-client-project-progress-copy flex justify-between gap-3 text-zinc-500">
                                  <span>Tasks Complete</span>
                                  <span className="shrink-0 font-mono font-semibold">{completedTasks} / {totalTasks} ({progressPercent}%)</span>
                                </div>
                                <div className="project-client-project-progress-track bg-zinc-950 rounded-full overflow-hidden w-full border border-zinc-900">
                                  <div
                                    style={{ width: `${progressPercent}%` }}
                                    className={`h-full rounded-full transition-all duration-300 ${proj.status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                                  />
                                </div>
                              </div>

                              <div className="project-client-project-actions flex w-full gap-2">
                                <Button
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedProject(proj);
                                  }}
                                  className="project-client-project-action flex-1 border-zinc-800 text-zinc-300 rounded-md hover:text-white"
                                >
                                  View Details
                                </Button>
                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(`/tasks?projectId=${proj.id}`);
                                  }}
                                  className="project-client-project-action flex-1 bg-white text-zinc-950 hover:bg-zinc-200 rounded-md font-semibold flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  <span>Manage Tasks</span>
                                  <ArrowRight className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                ) : (
                  /* COLLAPSED VIEW */
                  <div className="p-5 flex flex-col justify-between h-full space-y-4">
                    <div className="flex-1 flex flex-col items-center justify-center text-center space-y-2 pt-2">
                      <span className="project-client-icon flex h-11 w-11 items-center justify-center rounded-xl border">
                        <ClientIcon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <h3 className="project-client-name text-xl font-black tracking-tighter leading-tight select-none px-2 max-w-full truncate" title={client.name}>
                        {client.name}
                      </h3>
                      <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block truncate max-w-full">
                        {clientProjects.length} {clientProjects.length === 1 ? 'project' : 'projects'}
                      </span>
                      <div className="flex gap-1.5 justify-center mt-1 select-none">
                        <Badge variant={client.status === 'ACTIVE' ? 'risk-low' : 'outline'} className="text-[7.5px] uppercase font-bold rounded-md">
                          {client.status}
                        </Badge>
                        <Badge variant={clientDelayCount ? 'risk-high' : 'risk-low'} className="text-[7.5px] uppercase font-bold rounded-md">
                          {clientDelayCount ? `${clientDelayCount} delays` : 'On schedule'}
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="pt-2 border-t border-zinc-900/60 flex justify-between text-[9.5px] text-zinc-400">
                        <span>Active Campaigns:</span>
                        <span className="font-semibold text-white font-mono">{clientProjects.length}</span>
                      </div>
                      {clientProjects.length > 0 && (
                        <div className="flex justify-between items-center gap-1.5 text-[9.5px] text-zinc-455">
                          <span className="shrink-0">Focus:</span>
                          <span title={clientProjects[0].serviceLine || 'Paid Ads'} className="max-w-[300px] bg-zinc-955 border border-zinc-850 px-1.5 py-0.5 rounded text-[7.5px] text-zinc-300 font-mono uppercase truncate">
                            {clientProjects[0].serviceLine || 'Paid Ads'}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[9px] text-zinc-550 pt-2 border-t border-zinc-900/40 select-none">
                      <span>Click to expand campaigns</span>
                      <ArrowRight className="h-3.5 w-3.5 text-zinc-400 animate-pulse" />
                    </div>
                  </div>
                )}
              </Card>
            );
          })}

          {expandedClientId && (() => {
            const activeClient = clients.find((client) => client.id === expandedClientId);
            const activeProjects = projects.filter((project) => project.clientId === expandedClientId);
            return <>
              <Card className="col-span-1 flex min-h-[220px] flex-col justify-between border border-zinc-800/80 bg-zinc-900/20 p-6">
                <div><Plus className="h-5 w-5 text-zinc-400" /><h4 className="mt-4 text-base font-bold text-white">Create new project</h4><p className="mt-2 text-sm leading-5 text-zinc-500">Start a project for {activeClient?.name} with the client already selected.</p></div>
                <Button className="mt-6 min-w-36" onClick={() => openProjectCreationForClient(expandedClientId)}>Create project</Button>
              </Card>
              <Card className="col-span-1 flex min-h-[220px] flex-col justify-between border border-zinc-800/80 bg-zinc-900/20 p-6">
                <div><ListPlus className="h-5 w-5 text-zinc-400" /><h4 className="mt-4 text-base font-bold text-white">Create tasks quickly</h4><p className="mt-2 text-sm leading-5 text-zinc-500">Choose one of {activeClient?.name}’s projects, then add several tasks at once.</p></div>
                <div className="mt-5 space-y-2">
                  <select value={quickTaskProjectId} onChange={(event) => setQuickTaskProjectId(event.target.value)} className="h-10 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 text-sm text-white">
                    <option value="">Select project</option>
                    {activeProjects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
                  </select>
                  <Button variant="outline" className="w-full min-w-36" disabled={!quickTaskProjectId} onClick={openQuickTaskCreation}>Create tasks</Button>
                </div>
              </Card>
            </>;
          })()}
        </div>
      )}

      {quickTaskModalOpen && expandedClientId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Create tasks quickly">
          <Card className="flex max-h-[88dvh] w-full max-w-2xl flex-col overflow-hidden border-zinc-800 bg-zinc-950 shadow-2xl">
            <CardHeader className="flex-row items-start justify-between border-b border-zinc-800">
              <div><CardTitle className="text-lg">Create tasks quickly</CardTitle><CardDescription className="mt-1">Add multiple tasks without crowding the workspace.</CardDescription></div>
              <Button type="button" variant="ghost" size="icon" disabled={creatingQuickTasks} onClick={() => setQuickTaskModalOpen(false)} aria-label="Close quick task creation"><X className="h-4 w-4" /></Button>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 space-y-3 overflow-y-auto p-5">
              {quickTaskDrafts.map((task, index) => (
                <section key={task.id} className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/30">
                  <button type="button" className="flex min-h-12 w-full items-center justify-between gap-3 px-4 text-left" onClick={() => setQuickTaskDrafts((current) => current.map((draft) => draft.id === task.id ? { ...draft, expanded: !draft.expanded } : draft))}>
                    <span className="min-w-0 truncate font-semibold text-white">{task.title.trim() || `Task ${index + 1}`}</span>
                    {task.expanded ? <ChevronDown className="h-4 w-4 shrink-0 text-zinc-500" /> : <ChevronRight className="h-4 w-4 shrink-0 text-zinc-500" />}
                  </button>
                  {task.expanded && <div className="grid gap-3 border-t border-zinc-800 p-4 sm:grid-cols-2">
                    <label className="space-y-1.5 sm:col-span-2"><span className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500">Task name</span><input required value={task.title} onChange={(event) => setQuickTaskDrafts((current) => current.map((draft) => draft.id === task.id ? { ...draft, title: event.target.value } : draft))} className="h-10 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 text-white" /></label>
                    <label className="space-y-1.5"><span className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500">Stage</span><select required={quickTaskStages.length > 0} value={task.stageId} disabled={quickTaskStages.length === 0} onChange={(event) => setQuickTaskDrafts((current) => current.map((draft) => draft.id === task.id ? { ...draft, stageId: event.target.value } : draft))} className="h-10 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 text-white disabled:cursor-not-allowed disabled:text-zinc-600"><option value="">{quickTaskStages.length > 0 ? 'Select stage' : 'No stages available'}</option>{quickTaskStages.map((stage: any) => <option key={stage.id} value={stage.id}>{stage.name}</option>)}</select></label>
                    <label className="space-y-1.5"><span className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500">Assignee</span><select value={task.assignedToId} onChange={(event) => setQuickTaskDrafts((current) => current.map((draft) => draft.id === task.id ? { ...draft, assignedToId: event.target.value } : draft))} className="h-10 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 text-white"><option value="">Unassigned</option>{teamMembers.map((member) => <option key={member.id} value={member.id}>{member.name} · {workspaceRoleLabel(member.role)}</option>)}</select></label>
                    <label className="space-y-1.5"><span className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500">Deadline</span><DateInput value={task.deadline} onChange={(value) => setQuickTaskDrafts((current) => current.map((draft) => draft.id === task.id ? { ...draft, deadline: value } : draft))} className="h-10 rounded-md border border-zinc-800 bg-zinc-950 px-3 text-white" /></label>
                    <label className="space-y-1.5 sm:col-span-2"><span className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500">Description <span className="font-normal">(optional)</span></span><textarea rows={2} value={task.description} onChange={(event) => setQuickTaskDrafts((current) => current.map((draft) => draft.id === task.id ? { ...draft, description: event.target.value } : draft))} className="w-full resize-none rounded-md border border-zinc-800 bg-zinc-950 p-3 text-white" /></label>
                    {quickTaskDrafts.length > 1 && <Button type="button" variant="ghost" className="w-fit text-rose-400" onClick={() => setQuickTaskDrafts((current) => current.filter((draft) => draft.id !== task.id))}>Remove task</Button>}
                  </div>}
                </section>
              ))}
              {quickTaskError && <p role="alert" className="rounded-md border border-rose-900/50 bg-rose-950/20 p-3 text-sm text-rose-300">{quickTaskError}</p>}
              <Button type="button" variant="outline" onClick={() => setQuickTaskDrafts((current) => [...current.map((task) => ({ ...task, expanded: false })), newQuickTaskDraft(quickTaskStages[0]?.id || '')])}><Plus className="h-4 w-4" />Add another task</Button>
            </CardContent>
            <div className="flex justify-end gap-2 border-t border-zinc-800 p-5">
              <Button type="button" variant="ghost" onClick={() => setQuickTaskModalOpen(false)} disabled={creatingQuickTasks}>Cancel</Button>
              <Button type="button" data-duplicate-sensitive disabled={creatingQuickTasks || !quickTaskDrafts.some((task) => task.title.trim())} onClick={() => void createQuickTasks()} className="min-w-36">
                {creatingQuickTasks && <Loader2 className="h-4 w-4 animate-spin" />}{creatingQuickTasks ? 'Creating tasks…' : 'Create tasks'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* --- CREATE PROJECT MODAL --- */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-xl border border-zinc-850 bg-zinc-950 shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-900 bg-zinc-950/95 px-6 py-4 backdrop-blur-md">
              <div><h3 className="text-lg font-bold text-white">Create Project & Commercials</h3><p className="mt-1 text-[10px] text-zinc-500">Use the same delivery and billing setup used during client onboarding.</p></div>
              <button onClick={() => setIsCreateOpen(false)} aria-label="Close project creation" className="grid h-9 w-9 place-items-center rounded-full border border-zinc-800 text-zinc-500 hover:text-white">
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {formError && (
              <div className="mx-6 mt-4 rounded border border-rose-900/35 bg-rose-950/15 p-3 text-[11px] font-semibold text-rose-455">
                {formError}
              </div>
            )}

            <form data-tour="project-form" onSubmit={handleCreateProject} className="space-y-4 p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-555">Project Name <span className="text-rose-500" aria-hidden="true">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Vertex E-commerce Optimization"
                    value={newProjectForm.name}
                    onChange={(e) => handleCreationInputChange('name', e.target.value)}
                    className="w-full text-xs bg-zinc-900 border border-zinc-800 px-3 py-2 text-white outline-none rounded-none focus:border-zinc-700"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-555">Associate Client <span className="text-rose-500" aria-hidden="true">*</span></label>
                  <select
                    required
                    value={newProjectForm.clientId}
                    onChange={(e) => handleCreationInputChange('clientId', e.target.value)}
                    className="w-full text-xs bg-zinc-900 border border-zinc-800 px-3 py-2 text-white outline-none rounded-none focus:border-zinc-700"
                  >
                    <option value="">-- Select Client --</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="max-w-xl">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-555">Specialization</label>
                  <select
                    required
                    value={newProjectForm.serviceLine}
                    onChange={(e) => handleCreationInputChange('serviceLine', e.target.value)}
                    className="w-full text-xs bg-zinc-900 border border-zinc-800 px-3 py-2 text-white outline-none rounded-none focus:border-zinc-700"
                  >
                    {availableServiceLines.length === 0 && <option value="">Select specializations in Agency Settings</option>}
                    {availableServiceLines.map((serviceLine) => <option key={serviceLine} value={serviceLine}>{serviceLine}</option>)}
                  </select>
                  {availableServiceLines.length === 0 && <p className="text-[9px] text-amber-400">Select an agency specialization in Settings first.</p>}
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 rounded border border-zinc-850 bg-zinc-950/50 p-3">
                <span className="flex min-w-0 items-center gap-3">
                  <MetaLogo className="h-5 w-7.5" />
                  <span className="min-w-0"><span className="block text-[11px] font-semibold text-white">Enable Meta integration</span>
                  <span className="mt-1 block text-[9px] leading-relaxed text-zinc-500">Adds Meta ads, campaign metrics, and lead controls for this project&apos;s client.</span></span>
                </span>
                <button type="button" role="switch" aria-label="Enable Meta integration" aria-checked={newProjectForm.metaIntegrationEnabled} onClick={() => handleCreationInputChange('metaIntegrationEnabled', !newProjectForm.metaIntegrationEnabled)} className="meta-integration-switch-hitbox grid h-11 w-11 shrink-0 place-items-center rounded-full">
                  <span aria-hidden="true" className={`meta-integration-switch relative block h-5 w-9 overflow-hidden rounded-full border transition-colors ${newProjectForm.metaIntegrationEnabled ? 'border-white bg-white' : 'border-zinc-700 bg-zinc-900'}`}>
                    <span className={`pointer-events-none absolute left-0.5 top-0.5 h-3.5 w-3.5 rounded-full transition-transform duration-150 ease-out ${newProjectForm.metaIntegrationEnabled ? 'translate-x-[18px] bg-black' : 'translate-x-0 bg-zinc-500'}`} />
                  </span>
                </button>
              </div>

              <div data-tour="project-payment" className="space-y-3 border-y border-zinc-900 py-4">
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">Project Commercials</span>
                  <span className="text-[9px] text-zinc-600">Client billing is configured independently for every project.</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-555">Payment Type <span className="text-rose-500" aria-hidden="true">*</span></label>
                    <select
                      value={newProjectForm.paymentType}
                      onChange={(e) => handleCreationInputChange('paymentType', e.target.value)}
                      className="w-full text-xs bg-zinc-900 border border-zinc-800 px-3 py-2 text-white outline-none rounded-none focus:border-zinc-700"
                    >
                      <option value="RETAINER">Retainer</option>
                      <option value="ONE_TIME">One-time payment</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-555">Client Payment ({getCurrencySymbol(currencyState)}) <span className="text-rose-500" aria-hidden="true">*</span></label>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      required
                      placeholder="e.g. 5000"
                      value={newProjectForm.paymentAmount}
                      onChange={(e) => handleCreationInputChange('paymentAmount', e.target.value)}
                      className="w-full text-xs bg-zinc-900 border border-zinc-800 px-3 py-2 text-white outline-none rounded-none focus:border-zinc-700 font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-555">Frequency</label>
                    <select
                      value={newProjectForm.paymentFrequency}
                      onChange={(e) => handleCreationInputChange('paymentFrequency', e.target.value)}
                      disabled={newProjectForm.paymentType === 'ONE_TIME'}
                      className="w-full text-xs bg-zinc-900 border border-zinc-800 px-3 py-2 text-white outline-none rounded-none focus:border-zinc-700 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-555">Invoice Date <span className="text-rose-500" aria-hidden="true">*</span></label>
                    <DateInput
                      required
                      value={newProjectForm.paymentStartDate}
                      onChange={(value) => handleCreationInputChange('paymentStartDate', value)}
                      className="w-full text-xs bg-zinc-900 border border-zinc-800 px-3 py-2 text-white outline-none rounded-none focus:border-zinc-700 font-mono"
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-555">Payment Due</label>
                    <div className="border border-zinc-850 bg-zinc-950/50 px-3 py-2 text-xs text-zinc-300">
                      14 days after the invoice date
                    </div>
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-555">Terms and Conditions <span className="normal-case font-medium">(optional)</span></label>
                    <textarea
                      rows={2}
                      maxLength={1000}
                      placeholder="e.g. Payment is due within 30 days of the invoice date."
                      value={newProjectForm.paymentTerms}
                      onChange={(e) => handleCreationInputChange('paymentTerms', e.target.value)}
                      className="w-full text-xs bg-zinc-900 border border-zinc-800 p-2.5 text-white outline-none rounded-none focus:border-zinc-700"
                    />
                  </div>
                </div>
                <label className="flex cursor-pointer items-start gap-3 border border-zinc-850 bg-zinc-950/50 p-3">
                  <input
                    type="checkbox"
                    checked={newProjectForm.autoGenerateInvoice}
                    onChange={(event) => handleCreationInputChange('autoGenerateInvoice', event.target.checked)}
                    className="mt-0.5 h-3.5 w-3.5 accent-white"
                  />
                  <span>
                    <span className="block text-[11px] font-semibold text-white">Email the automatically generated invoice to the client</span>
                    <span className="mt-1 block text-[9px] leading-relaxed text-zinc-500">
                      The invoice is generated for the selected invoice date either way. Tick this only to send it to the client.
                    </span>
                  </span>
                </label>
              </div>

              <div data-tour="project-budget" className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-555">Internal Budget ({getCurrencySymbol(currencyState)})</label>
                  <input
                    type="number"
                    placeholder="e.g. 20000"
                    value={newProjectForm.budget}
                    onChange={(e) => handleCreationInputChange('budget', e.target.value)}
                    className="w-full text-xs bg-zinc-900 border border-zinc-800 px-3 py-2 text-white outline-none rounded-none focus:border-zinc-700"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-555">Start Date</label>
                  <DateInput
                    required
                    value={newProjectForm.startDate}
                    onChange={(value) => handleCreationInputChange('startDate', value)}
                    className="w-full text-xs bg-zinc-900 border border-zinc-800 px-3 py-2 text-white outline-none rounded-none focus:border-zinc-700 font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-555">Target Deadline</label>
                  <DateInput
                    value={newProjectForm.deadline}
                    onChange={(value) => handleCreationInputChange('deadline', value)}
                    className="w-full text-xs bg-zinc-900 border border-zinc-800 px-3 py-2 text-white outline-none rounded-none focus:border-zinc-700 font-mono"
                  />
                </div>
              </div>

              {/* Project Stages Section */}
              <div data-tour="project-stages" className="space-y-3 pt-3 border-t border-zinc-900">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500">Project stages</label>
                    <p className="mt-1 text-[10px] text-zinc-600">One default stage is ready. Open the editor to rename, colour, reorder, or add up to eight stages.</p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowCreationStageEditor((open) => !open)}>
                    {showCreationStageEditor ? 'Done customizing' : 'Customize stages'}
                  </Button>
                </div>
                {showCreationStageEditor && <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-950/35 p-3">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Stage names & colours</label>
                  <div className="flex gap-2">
                    <button
                      data-tour="add-stage"
                      type="button"
                      onClick={addCreationStage}
                      disabled={newProjectForm.stages.length >= 8}
                      className="h-6 px-2 bg-zinc-800 text-[10px] font-bold hover:bg-zinc-700 text-white rounded-none disabled:opacity-40"
                    >
                      + Add Stage
                    </button>
                  </div>
                </div>

                <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                  {newProjectForm.stages.map((stage, idx) => (
                    <div key={idx} className="flex gap-2 items-center bg-zinc-950 p-2 border border-zinc-900">
                      <span className="font-mono text-zinc-500 text-[10px] w-5 text-center">{idx + 1}</span>
                      <input
                        type="text"
                        placeholder="Stage Name"
                        value={stage.name}
                        onChange={(e) => {
                          const nameVal = e.target.value;
                          setNewProjectForm(prev => {
                            const newStages = prev.stages.map((s, i) => i === idx ? { ...s, name: nameVal } : s);
                            return { ...prev, stages: newStages };
                          });
                        }}
                        className="flex-1 text-xs bg-zinc-900 border border-zinc-800 px-2 py-1 text-white outline-none"
                      />
                      <label className="flex shrink-0 items-center gap-2 text-[10px] text-zinc-500">Colour<input type="color" value={stage.color} onChange={(event) => setNewProjectForm((prev) => ({ ...prev, stages: prev.stages.map((item, itemIndex) => itemIndex === idx ? { ...item, color: event.target.value } : item) }))} className="h-8 w-12 cursor-pointer rounded border border-zinc-800 bg-zinc-900 p-1" aria-label={`${stage.name || `Stage ${idx + 1}`} colour`} /></label>
                      <div className="flex gap-0.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => moveCreationStage(idx, 'up')}
                          disabled={idx === 0}
                          className="p-1 hover:bg-zinc-800 disabled:opacity-30"
                        >
                          <ArrowUp className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveCreationStage(idx, 'down')}
                          disabled={idx === newProjectForm.stages.length - 1}
                          className="p-1 hover:bg-zinc-800 disabled:opacity-30"
                        >
                          <ArrowDown className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeCreationStage(idx)}
                          disabled={newProjectForm.stages.length <= 1}
                          className="p-1 hover:bg-zinc-800 text-rose-455 disabled:opacity-30"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                </div>}
              </div>

              <div data-tour="project-task" className="space-y-2 border-t border-zinc-900 pt-3">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-300">Create task for project</label>
                <div className="grid gap-3 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]">
                  <input type="text" placeholder="e.g. Prepare campaign brief" value={newProjectForm.taskName} onChange={(event) => handleCreationInputChange('taskName', event.target.value)} className="w-full border border-zinc-800 bg-zinc-900 p-2.5 text-xs text-white outline-none focus:border-zinc-700" aria-label="Task name" />
                  <select value={newProjectForm.taskStagePosition} onChange={(event) => handleCreationInputChange('taskStagePosition', Number(event.target.value))} className="w-full border border-zinc-800 bg-zinc-900 p-2.5 text-xs text-white outline-none focus:border-zinc-700" aria-label="Task stage">
                    {newProjectForm.stages.map((stage, index) => <option key={index} value={index}>{index + 1}. {stage.name || `Stage ${index + 1}`}</option>)}
                  </select>
                  <DateInput value={newProjectForm.taskDeadline} onChange={(value) => handleCreationInputChange('taskDeadline', value)} className="w-full border border-zinc-800 bg-zinc-900 p-2.5 text-xs text-white outline-none focus:border-zinc-700" />
                </div>
                <p className="text-[10px] text-zinc-600">The first selected specialist below is assigned to this task automatically.</p>
              </div>

              {/* Members Selection */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-555">Project assignees</label>
                <div className="grid gap-2 sm:grid-cols-3 max-h-[120px] overflow-y-auto p-1 bg-zinc-950 border border-zinc-900">
                  {teamMembers.map(member => {
                    const isAllocated = newProjectForm.memberIds.includes(member.id);
                    return (
                      <button
                        type="button"
                        key={member.id}
                        onClick={() => {
                          const ids = newProjectForm.memberIds;
                          const newIds = ids.includes(member.id) 
                            ? ids.filter(id => id !== member.id) 
                            : [...ids, member.id];
                          setNewProjectForm({ ...newProjectForm, memberIds: newIds });
                        }}
                        className={`p-2 text-left border relative transition-all ${
                          isAllocated
                            ? 'border-white bg-zinc-900 text-white font-bold'
                            : 'border-zinc-900 text-zinc-450 hover:border-zinc-750'
                        }`}
                      >
                        <span className="block text-[11px] truncate">{member.name}</span>
                        <span className="block text-[8px] text-zinc-550 truncate mt-0.5">{workspaceRoleLabel(member.role)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-none text-xs text-zinc-500 hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  data-tour="save-project"
                  type="submit"
                  className="bg-white px-6 text-xs font-semibold text-zinc-950 hover:bg-zinc-200"
                >
                  Create Project
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- VIEW/EDIT PROJECT DETAIL DRAWER --- */}
      {selectedProject && isEditing && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex justify-end animate-fadeIn">
          <div className="flex-1" onClick={() => setSelectedProject(null)} />
          
          <div className="w-full max-w-3xl bg-[#09090b] border-l border-zinc-800 p-6 flex flex-col h-full overflow-y-auto animate-slideIn text-xs">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-4 mb-4">
              <div>
                <span className="text-[9px] font-bold text-zinc-550 uppercase tracking-widest font-mono">Project Ledger Workspace</span>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mt-0.5">{selectedProject.name}</h3>
                <span className="text-[10px] text-zinc-500 font-bold block">{selectedProject.client?.name}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-750 p-1.5 transition-colors flex items-center gap-1 font-semibold text-[10px] uppercase font-mono"
                >
                  <Edit2 className="h-3 w-3" />
                  <span>{isEditing ? 'Cancel Edit' : 'Edit Details'}</span>
                </button>
                <button
                  onClick={() => setSelectedProject(null)}
                  className="text-zinc-500 hover:text-white border border-zinc-900 hover:border-zinc-800 p-1.5 transition-colors cursor-pointer"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>
            </div>

            {isEditing ? (
              /* EDIT MODE */
              <form onSubmit={handleUpdateProject} className="space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-4 flex-1 overflow-y-auto pr-1 pb-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">Project Campaign Name</label>
                    <input
                      type="text"
                      required
                      value={editForm.name}
                      onChange={(e) => handleEditInputChange('name', e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white outline-none"
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">Specialization</label>
                      <select
                        required
                        value={editForm.serviceLine}
                        onChange={(e) => handleEditInputChange('serviceLine', e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 p-1.5 text-white outline-none"
                      >
                        {editForm.serviceLine && !availableServiceLines.includes(editForm.serviceLine) && (
                          <option value={editForm.serviceLine} disabled>{editForm.serviceLine} (not enabled in Settings)</option>
                        )}
                        {availableServiceLines.length === 0 && <option value="" disabled>Select specializations in Agency Settings</option>}
                        {availableServiceLines.map((serviceLine) => <option key={serviceLine} value={serviceLine}>{serviceLine}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">Internal Delivery Budget ({getCurrencySymbol(currencyState)})</label>
                      <input
                        type="number"
                        value={editForm.budget}
                        onChange={(e) => handleEditInputChange('budget', e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-3 border-y border-zinc-900 py-3">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 block">Project Commercials</label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-semibold text-zinc-500">Payment Type</label>
                        <select
                          value={editForm.paymentType}
                          onChange={(e) => handleEditInputChange('paymentType', e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-800 p-1.5 text-white outline-none"
                        >
                          <option value="RETAINER">Retainer</option>
                          <option value="ONE_TIME">One-time payment</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-semibold text-zinc-500">Client Payment ({getCurrencySymbol(currencyState)})</label>
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          required
                          value={editForm.paymentAmount}
                          onChange={(e) => handleEditInputChange('paymentAmount', e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white outline-none font-mono"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-semibold text-zinc-500">Frequency</label>
                        <select
                          value={editForm.paymentFrequency}
                          onChange={(e) => handleEditInputChange('paymentFrequency', e.target.value)}
                          disabled={editForm.paymentType === 'ONE_TIME'}
                          className="w-full bg-zinc-900 border border-zinc-800 p-1.5 text-white outline-none disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          <option value="monthly">Monthly</option>
                          <option value="quarterly">Quarterly</option>
                          <option value="yearly">Yearly</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-semibold text-zinc-500">Invoice Date</label>
                        <DateInput
                          required
                          value={editForm.paymentStartDate}
                          onChange={(value) => handleEditInputChange('paymentStartDate', value)}
                          className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white outline-none font-mono"
                        />
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <label className="text-[9px] font-semibold text-zinc-500">Payment Due</label>
                        <div className="border border-zinc-800 bg-zinc-950/50 px-3 py-1.5 text-zinc-300">
                          14 days after the invoice date
                        </div>
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <label className="text-[9px] font-semibold text-zinc-500">Terms and Conditions <span className="font-medium">(optional)</span></label>
                        <textarea
                          rows={2}
                          maxLength={1000}
                          placeholder="e.g. Payment is due within 30 days of the invoice date."
                          value={editForm.paymentTerms}
                          onChange={(e) => handleEditInputChange('paymentTerms', e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-800 p-2 text-white outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">Start Date</label>
                      <DateInput
                        value={editForm.startDate}
                        onChange={(value) => handleEditInputChange('startDate', value)}
                        className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white outline-none font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">Target Deadline</label>
                      <DateInput
                        value={editForm.endDate}
                        onChange={(value) => handleEditInputChange('endDate', value)}
                        className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">Project Status</label>
                      <select
                        value={editForm.status}
                        onChange={(e) => handleEditInputChange('status', e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 p-1.5 text-white outline-none"
                      >
                        <option value="NOT_STARTED">Not Started</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="ON_HOLD">On Hold</option>
                        <option value="OVERDUE">Overdue</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">Risk Threshold</label>
                      <select
                        value={editForm.riskLevel}
                        onChange={(e) => handleEditInputChange('riskLevel', e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 p-1.5 text-white outline-none"
                      >
                        <option value="LOW">Low Risk</option>
                        <option value="MEDIUM">Medium Risk</option>
                        <option value="HIGH">High Risk</option>
                      </select>
                    </div>
                  </div>

                  {/* Edit Specialists */}
                  <div className="space-y-2 pt-2 border-t border-zinc-900">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 block">Assigned Specialists</label>
                    <div className="grid gap-1.5 sm:grid-cols-2 max-h-[100px] overflow-y-auto bg-zinc-950 p-2 border border-zinc-900">
                      {teamMembers.map(member => {
                        const isAllocated = editForm.memberIds.includes(member.id);
                        return (
                          <button
                            type="button"
                            key={member.id}
                            onClick={() => {
                              const ids = editForm.memberIds;
                              const newIds = ids.includes(member.id) 
                                ? ids.filter((id: string) => id !== member.id) 
                                : [...ids, member.id];
                              handleEditInputChange('memberIds', newIds);
                            }}
                            className={`p-1.5 text-left border relative transition-all truncate text-[10px] ${
                              isAllocated
                                ? 'border-white bg-zinc-900 text-white font-bold'
                                : 'border-zinc-900 text-zinc-450 hover:border-zinc-850'
                            }`}
                          >
                            {member.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Edit Stages */}
                  <div className="space-y-2 pt-2 border-t border-zinc-900">
                    <div className="flex justify-between items-center">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 block">Project Stages (Max 8)</label>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={addEditStage}
                          disabled={editForm.stages.length >= 8}
                          className="h-5 px-1.5 bg-zinc-800 text-[9px] font-bold hover:bg-zinc-700 text-white rounded-none disabled:opacity-40"
                        >
                          + Add Stage
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                      {editForm.stages.map((stage: any, idx: number) => (
                        <div key={idx} className="flex gap-1.5 items-center bg-zinc-950 p-2 border border-zinc-900">
                          <span className="font-mono text-zinc-650 text-[9px] w-4 text-center">{idx + 1}</span>
                          <input
                            type="text"
                            placeholder="Stage Name"
                            value={stage.name}
                            onChange={(e) => {
                              const nameVal = e.target.value;
                              setEditForm((prev: any) => {
                                const newStages = prev.stages.map((s: any, i: number) => i === idx ? { ...s, name: nameVal } : s);
                                return { ...prev, stages: newStages };
                              });
                            }}
                            className="flex-1 text-[10px] bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 text-white outline-none"
                          />
                          <label className="flex shrink-0 items-center gap-1 text-[9px] text-zinc-500">Colour<input type="color" value={stage.color || '#94A3B8'} onChange={(event) => setEditForm((prev: any) => ({ ...prev, stages: prev.stages.map((item: any, itemIndex: number) => itemIndex === idx ? { ...item, color: event.target.value } : item) }))} className="h-7 w-10 cursor-pointer border border-zinc-800 bg-zinc-900 p-1" aria-label={`${stage.name || `Stage ${idx + 1}`} colour`} /></label>
                          <div className="flex gap-0.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => moveEditStage(idx, 'up')}
                              disabled={idx === 0}
                              className="p-0.5 hover:bg-zinc-800 disabled:opacity-30"
                            >
                              <ArrowUp className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveEditStage(idx, 'down')}
                              disabled={idx === editForm.stages.length - 1}
                              className="p-0.5 hover:bg-zinc-800 disabled:opacity-30"
                            >
                              <ArrowDown className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeEditStage(idx)}
                              disabled={editForm.stages.length <= 1}
                              className="p-0.5 hover:bg-zinc-800 text-rose-455 disabled:opacity-30"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-zinc-900 flex gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsEditing(false)}
                    className="flex-1 h-8 rounded-none text-xs text-zinc-500 hover:text-white"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 h-8 bg-white text-zinc-950 hover:bg-zinc-200 rounded-none text-xs font-semibold"
                  >
                    Save Changes
                  </Button>
                </div>
              </form>
            ) : (
              /* VIEW MODE */
              <div className="space-y-5 flex-1">
                {/* Commercial stats */}
                <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 bg-zinc-950/20 p-3 border border-zinc-900">
                  <div>
                    <span className="block text-[8px] text-zinc-650 uppercase font-bold">Payment Type</span>
                    <span className="font-bold text-white text-xs">
                      {selectedProject.paymentType === 'ONE_TIME' ? 'One-time' : 'Retainer'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[8px] text-zinc-650 uppercase font-bold">Client Payment</span>
                    <span className="font-mono font-bold text-white text-xs">
                      {formatCurrencyFor(selectedProject.paymentAmount || 0, currencyState)}
                      {selectedProject.paymentType !== 'ONE_TIME' && selectedProject.paymentFrequency
                        ? ` / ${selectedProject.paymentFrequency}`
                        : ''}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[8px] text-zinc-650 uppercase font-bold">Specialization</span>
                    <span className="font-semibold text-zinc-300">{selectedProject.serviceLine || 'PPC Campaign'}</span>
                  </div>
                  <div>
                    <span className="block text-[8px] text-zinc-650 uppercase font-bold">Status Badge</span>
                    <span className="font-bold text-white uppercase">{projectStatusLabel(selectedProject.status)}</span>
                  </div>
                </div>

                <div className="grid gap-3 grid-cols-2 border border-zinc-900 bg-zinc-950/20 p-3">
                  <div>
                    <span className="block text-[8px] text-zinc-650 uppercase font-bold">Invoice Date</span>
                    <span className="font-mono text-[10px] font-semibold text-zinc-300">
                      {selectedProject.paymentStartDate
                        ? new Date(selectedProject.paymentStartDate).toLocaleDateString()
                        : 'Not configured'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[8px] text-zinc-650 uppercase font-bold">Payment Due</span>
                    <span className="text-[10px] font-semibold text-zinc-300">
                      14 days after invoice date
                    </span>
                  </div>
                </div>

                {/* Timeline info */}
                <div className="space-y-1">
                  <span className="text-[8px] text-zinc-600 uppercase font-bold block">Project Timeline</span>
                  <div className="text-zinc-300 font-medium font-mono text-[10px]">
                    {selectedProject.startDate ? new Date(selectedProject.startDate).toLocaleDateString() : 'N/A'} to{' '}
                    {selectedProject.endDate ? new Date(selectedProject.endDate).toLocaleDateString() : 'N/A'}{' '}
                    {selectedProject.timeline && `(${selectedProject.timeline})`}
                  </div>
                </div>

                {/* Allocate Specialists */}
                <div className="space-y-2">
                  <span className="text-[8px] text-zinc-600 uppercase font-bold block">Assigned Specialists</span>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {selectedProject.members?.map((m: any) => (
                      <div key={m.id} className="flex items-center gap-2 p-2 border border-zinc-900 bg-zinc-950/40">
                        <div className="h-6 w-6 rounded bg-zinc-900 border border-zinc-850 flex items-center justify-center font-bold text-zinc-400 uppercase text-[9px]">
                          {m.user?.name[0]}
                        </div>
                        <div>
                          <span className="block font-semibold text-white">{m.user?.name}</span>
                          <span className="block text-[8px] text-zinc-550 mt-0.5">{workspaceRoleLabel(m.user?.role)}</span>
                        </div>
                      </div>
                    ))}
                    {(!selectedProject.members || selectedProject.members.length === 0) && (
                      <span className="text-zinc-650 italic text-[11px]">No specialists assigned to project.</span>
                    )}
                  </div>
                </div>

                {/* Project Stages */}
                <div className="space-y-2 border-t border-zinc-900 pt-4">
                  <span className="text-[8px] text-zinc-600 uppercase font-bold block">Development Stage Gates</span>
                  <div className="space-y-2">
                    {selectedProject.stages?.map((stage: any, idx: number) => {
                      const stageTaskCount = (selectedProject.tasks || []).filter((task: any) => task.stageId === stage.id).length;
                      return (
                      <div key={stage.id} className="p-2 border border-zinc-900 bg-zinc-950/30 flex justify-between items-center">
                        <div>
                          <span className="inline-flex items-center gap-2 rounded-full border px-2 py-1 text-[11px] font-semibold" style={{ borderColor: stage.color, color: stage.color, backgroundColor: `${stage.color}18` }}><span className="h-2 w-2 rounded-full" style={{ backgroundColor: stage.color }} />{idx + 1}. {stage.name}</span>
                          <Badge variant={stage.status === 'COMPLETED' ? 'risk-low' : 'outline'}>{stage.status === 'COMPLETED' ? 'Completed' : stage.status === 'IN_PROGRESS' ? 'In progress' : 'Not started'}</Badge>
                        </div>
                        <Badge variant="outline" className="text-[8px] font-mono rounded-none uppercase">
                          {stageTaskCount} Tasks
                        </Badge>
                      </div>
                    )})}
                    {(!selectedProject.stages || selectedProject.stages.length === 0) && (
                      <span className="text-zinc-650 italic block">No stages defined for project campaign.</span>
                    )}
                  </div>
                </div>

                {/* Deliverables Checklist */}
                <div className="space-y-2 border-t border-zinc-900 pt-4">
                  <span className="text-[8px] text-zinc-600 uppercase font-bold block">Program Deliverables & Tasks</span>
                  <div className="divide-y divide-zinc-900 max-h-[140px] overflow-y-auto pr-1">
                    {selectedProject.tasks?.map((task: any) => (
                      <div key={task.id} className="py-2 flex justify-between items-center text-xs">
                        <div>
                          <span className="font-medium text-white block">{task.title}</span>
                          <span className="text-[8px] text-zinc-500 mt-0.5 block font-semibold uppercase">
                            {task.stage ? `Stage: ${task.stage.name}` : 'No Stage'} | Assigned to: {task.assignedTo?.name || 'Unassigned'}
                          </span>
                        </div>
                        <Badge
                          variant={task.status === 'COMPLETED' ? 'risk-low' : task.status === 'BLOCKED' || isTaskDelayed(task) ? 'risk-high' : 'outline'}
                          className="rounded-none uppercase tracking-wider text-[8px]"
                        >
                          {isTaskDelayed(task) ? 'Delayed' : projectStatusLabel(task.status)}
                        </Badge>
                      </div>
                    ))}
                    {(!selectedProject.tasks || selectedProject.tasks.length === 0) && (
                      <span className="text-zinc-650 italic block pt-2">No tasks created under project scope yet.</span>
                    )}
                  </div>
                </div>

              </div>
            )}

            <div className="pt-4 border-t border-zinc-900 mt-4">
              <Button
                onClick={() => {
                  setSelectedProject(null);
                  router.push(`/tasks?projectId=${selectedProject.id}`);
                }}
                className="w-full h-9 bg-white text-zinc-950 hover:bg-zinc-200 font-semibold"
              >
                Open Full Task Workspace
              </Button>
            </div>
          </div>
        </div>
      )}

      {selectedProject && !isEditing && (
        <ProjectBreakdownDrawer
          project={selectedProject}
          currency={currencyState}
          canManageChangeRequests={canManageChangeRequests}
          onChangeRequestUpdated={() => loadData()}
          onClose={() => setSelectedProject(null)}
          onEdit={() => setIsEditing(true)}
          onOpenTasks={() => {
            const projectId = selectedProject.id;
            setSelectedProject(null);
            router.push(`/tasks?projectId=${projectId}`);
          }}
        />
      )}

    </div>
  );
}
