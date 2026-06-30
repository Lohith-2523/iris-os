'use client';

import * as React from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import {
  Kanban,
  List,
  Plus,
  Play,
  Activity,
  AlertTriangle,
  CheckCircle,
  Loader2,
  X,
  User,
  Clock,
  ExternalLink,
  MessageSquare,
  ArrowRight,
  ShieldAlert,
  Send,
  Layers
} from 'lucide-react';

export default function TasksPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlProjectId = searchParams.get('projectId');

  const [projects, setProjects] = React.useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = React.useState<string>('all');
  const [tasks, setTasks] = React.useState<any[]>([]);
  const [teamMembers, setTeamMembers] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [viewMode, setViewMode] = React.useState<'kanban' | 'list'>('kanban');
  const [kanbanGrouping, setKanbanGrouping] = React.useState<'status' | 'stage'>('status');

  // Selected Task Detail Modal State
  const [selectedTask, setSelectedTask] = React.useState<any | null>(null);

  // New Task Creation Form
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [createForm, setCreateForm] = React.useState({
    title: '',
    description: '',
    assignedToId: '',
    status: 'TODO',
    progress: 0,
    timeline: '1 Week',
    deadline: '',
    stageId: ''
  });

  // Task Interaction Form States
  const [newUpdateContent, setNewUpdateContent] = React.useState('');
  const [newCommentContent, setNewCommentContent] = React.useState('');
  
  // Carry Over State
  const [isCarryOverOpen, setIsCarryOverOpen] = React.useState(false);
  const [carryOverForm, setCarryOverForm] = React.useState({
    newAssigneeId: '',
    outputUrl: '',
    comment: ''
  });

  // Reset kanban grouping when "All Projects" is selected
  React.useEffect(() => {
    if (selectedProjectId === 'all') {
      setKanbanGrouping('status');
    }
  }, [selectedProjectId]);

  // Load basic dropdown lists
  const loadInitialData = React.useCallback(async () => {
    try {
      const projRes = await fetch('/api/projects');
      if (projRes.ok) {
        const data = await projRes.json();
        setProjects(data);
      }

      const teamRes = await fetch('/api/data?domain=team');
      if (teamRes.ok) {
        const data = await teamRes.json();
        setTeamMembers(data.filter((t: any) => t.role?.toLowerCase() !== 'client'));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Fetch tasks based on selected project
  const loadTasks = React.useCallback(async () => {
    setLoading(true);
    try {
      const url = selectedProjectId === 'all' ? '/api/tasks' : `/api/tasks?projectId=${selectedProjectId}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setTasks(data);

        // If modal task is open, refresh its data too
        if (selectedTask) {
          const freshTask = data.find((t: any) => t.id === selectedTask.id);
          if (freshTask) {
            setSelectedTask(freshTask);
          }
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId, selectedTask?.id]);

  React.useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  React.useEffect(() => {
    if (urlProjectId) {
      setSelectedProjectId(urlProjectId);
    }
  }, [urlProjectId]);

  React.useEffect(() => {
    loadTasks();
  }, [selectedProjectId, loadTasks]);

  // Create Task Handler
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.title || selectedProjectId === 'all') return;

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_task',
          clientId: projects.find(p => p.id === selectedProjectId)?.clientId,
          projectId: selectedProjectId,
          title: createForm.title,
          description: createForm.description,
          assignedToId: createForm.assignedToId || null,
          status: createForm.status,
          progress: createForm.progress,
          timeline: createForm.timeline,
          deadline: createForm.deadline || null,
          stageId: createForm.stageId || null
        })
      });

      if (res.ok) {
        setIsCreateOpen(false);
        setCreateForm({
          title: '',
          description: '',
          assignedToId: '',
          status: 'TODO',
          progress: 0,
          timeline: '1 Week',
          deadline: '',
          stageId: ''
        });
        loadTasks();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Add Task Update
  const handleAddUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUpdateContent || !selectedTask) return;

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_update',
          taskId: selectedTask.id,
          content: newUpdateContent
        })
      });

      if (res.ok) {
        setNewUpdateContent('');
        loadTasks();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Add Comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentContent || !selectedTask) return;

    try {
      const userEmail = localStorage.getItem('currentUserEmail') || 'lohith@apex.co';
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_comment',
          taskId: selectedTask.id,
          content: newCommentContent,
          userEmail
        })
      });

      if (res.ok) {
        setNewCommentContent('');
        loadTasks();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Perform carry over handover
  const handleCarryOver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !carryOverForm.newAssigneeId || !carryOverForm.outputUrl) return;

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'carry_over',
          taskId: selectedTask.id,
          newAssigneeId: carryOverForm.newAssigneeId,
          outputUrl: carryOverForm.outputUrl,
          carryOverComment: carryOverForm.comment
        })
      });

      if (res.ok) {
        const data = await res.json();
        setIsCarryOverOpen(false);
        setCarryOverForm({ newAssigneeId: '', outputUrl: '', comment: '' });
        
        // Open the newly spawned task details in workspace
        setSelectedTask(data.newTask);
        loadTasks();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Retrieve current active project's stages
  const activeProjectObj = projects.find(p => p.id === selectedProjectId);
  const activeProjectStages = activeProjectObj?.stages || [];

  // Categorize status tasks for Status Board
  const classifiedTasks = React.useMemo(() => {
    return {
      yetToStart: tasks.filter(t => t.status === 'TODO' && t.progress === 0),
      pendingActive: tasks.filter(t => (t.status === 'IN_PROGRESS' || t.status === 'TODO') && t.progress > 0),
      blocked: tasks.filter(t => t.status === 'BLOCKED'),
      completed: tasks.filter(t => t.status === 'COMPLETED'),
      unassigned: tasks.filter(t => !t.assignedToId),
      intervention: tasks.filter(t => t.status === 'BLOCKED' && t.blocker)
    };
  }, [tasks]);

  return (
    <div className="flex gap-6 h-[calc(100vh-80px)] overflow-hidden font-sans text-xs">
      {/* Left Sidebar project select list */}
      <div className="w-56 border-r border-zinc-900 pr-4 flex flex-col justify-between h-full py-2 shrink-0">
        <div className="space-y-4">
          <div>
            <span className="text-[9px] font-bold text-zinc-550 uppercase tracking-widest font-mono">Control Desk</span>
            <h2 className="text-sm font-bold text-white uppercase mt-0.5">Tasks Workspace</h2>
          </div>

          {/* Project dropdown selection */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-semibold uppercase tracking-wider text-zinc-500 block">Select Active Project</label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full text-[11px] bg-zinc-900 border border-zinc-800 p-2 text-white outline-none rounded-none font-medium focus:border-zinc-700"
            >
              <option value="all">-- All Agency Projects --</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Project Details quick view */}
          {selectedProjectId !== 'all' && (
            <div className="border border-zinc-900 p-3 bg-zinc-950/20 space-y-2">
              <span className="block text-[8px] text-zinc-650 uppercase font-bold">Project Details</span>
              {(() => {
                const currentProj = projects.find(p => p.id === selectedProjectId);
                if (!currentProj) return null;
                return (
                  <div className="space-y-2 text-[10px]">
                    <div>
                      <span className="text-zinc-555 block">Client:</span>
                      <span className="font-semibold text-zinc-300">{currentProj.client?.name}</span>
                    </div>
                    <div>
                      <span className="text-zinc-555 block">Budget:</span>
                      <span className="font-mono text-zinc-300 font-semibold">${(currentProj.budget || 0).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-zinc-555 block">Timeline:</span>
                      <span className="font-semibold text-zinc-400">{currentProj.timeline || 'N/A'}</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* View Toggles */}
          <div className="flex border border-zinc-900 rounded-none overflow-hidden text-[9px] uppercase font-bold shrink-0">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex-1 py-1.5 flex items-center justify-center gap-1 ${viewMode === 'kanban' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <Kanban className="h-3.5 w-3.5" />
              <span>Kanban</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex-1 py-1.5 flex items-center justify-center gap-1 ${viewMode === 'list' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <List className="h-3.5 w-3.5" />
              <span>List View</span>
            </button>
          </div>

          {/* Kanban grouping toggle */}
          {viewMode === 'kanban' && (
            <div className="space-y-1.5 pt-2">
              <label className="text-[9px] font-semibold uppercase tracking-wider text-zinc-500 block">Kanban Grouping Mode</label>
              <div className="flex border border-zinc-900 rounded-none overflow-hidden text-[9px] uppercase font-bold shrink-0">
                <button
                  type="button"
                  onClick={() => setKanbanGrouping('status')}
                  className={`flex-1 py-1.5 flex items-center justify-center gap-1 ${kanbanGrouping === 'status' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  <span>By Status</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedProjectId === 'all') {
                      alert('Please select a specific project from the dropdown to group tasks by project development stages.');
                      return;
                    }
                    setKanbanGrouping('stage');
                  }}
                  disabled={selectedProjectId === 'all'}
                  className={`flex-1 py-1.5 flex items-center justify-center gap-1 disabled:opacity-30 ${kanbanGrouping === 'stage' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  <Layers className="h-3 w-3" />
                  <span>By Stage</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Task Desk Buttons */}
        <div className="pt-4 border-t border-zinc-900/60">
          <Button
            disabled={selectedProjectId === 'all'}
            onClick={() => setIsCreateOpen(true)}
            className="w-full h-8 bg-white text-zinc-950 hover:bg-zinc-200 rounded-none font-semibold text-xs flex items-center justify-center gap-1.5 animate-fadeIn"
          >
            <Plus className="h-4 w-4" />
            <span>Create Task</span>
          </Button>
          {selectedProjectId === 'all' && (
            <span className="block text-[8px] text-zinc-600 text-center mt-1.5">Select a project to add tasks.</span>
          )}
        </div>
      </div>

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col overflow-hidden py-2 h-full">
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-zinc-500 gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Syncing tasks program...</span>
          </div>
        ) : viewMode === 'kanban' ? (
          /* KANBAN BOARD WITH CLASS-WISE COLUMNS OR STAGE-WISE COLUMNS */
          <div className="flex-1 flex gap-4 overflow-x-auto pb-4 scrollbar-none">
            {kanbanGrouping === 'status' ? (
              <>
                {/* Column 1: Yet to Start */}
                <KanbanColumn
                  title="Yet to Start"
                  count={classifiedTasks.yetToStart.length}
                  tasks={classifiedTasks.yetToStart}
                  onSelect={setSelectedTask}
                />

                {/* Column 2: Pending/Active */}
                <KanbanColumn
                  title="Active / Pending"
                  count={classifiedTasks.pendingActive.length}
                  tasks={classifiedTasks.pendingActive}
                  onSelect={setSelectedTask}
                />

                {/* Column 3: Blocked */}
                <KanbanColumn
                  title="Blocked / Delayed"
                  count={classifiedTasks.blocked.length}
                  tasks={classifiedTasks.blocked}
                  onSelect={setSelectedTask}
                  highlightColor="border-t-rose-500"
                />

                {/* Column 4: Client Intervention */}
                <KanbanColumn
                  title="Needs Intervention"
                  count={classifiedTasks.intervention.length}
                  tasks={classifiedTasks.intervention}
                  onSelect={setSelectedTask}
                  highlightColor="border-t-amber-500"
                />

                {/* Column 5: Completed */}
                <KanbanColumn
                  title="Completed"
                  count={classifiedTasks.completed.length}
                  tasks={classifiedTasks.completed}
                  onSelect={setSelectedTask}
                  highlightColor="border-t-emerald-500"
                />

                {/* Column 6: Unassigned */}
                <KanbanColumn
                  title="Unassigned"
                  count={classifiedTasks.unassigned.length}
                  tasks={classifiedTasks.unassigned}
                  onSelect={setSelectedTask}
                  highlightColor="border-t-zinc-650"
                />
              </>
            ) : (
              /* STAGE-WISE GROUPING */
              <>
                {/* Unassigned / Backlog Column */}
                <KanbanColumn
                  title="Project Backlog / Unassigned"
                  count={tasks.filter(t => !t.stageId).length}
                  tasks={tasks.filter(t => !t.stageId)}
                  onSelect={setSelectedTask}
                  highlightColor="border-t-zinc-650"
                />

                {/* Columns for each stage in position order */}
                {activeProjectStages.map((stage: any, idx: number) => {
                  const stageTasks = tasks.filter(t => t.stageId === stage.id);
                  return (
                    <KanbanColumn
                      key={stage.id}
                      title={`${idx + 1}. ${stage.name}`}
                      count={stageTasks.length}
                      tasks={stageTasks}
                      onSelect={setSelectedTask}
                      highlightColor="border-t-zinc-300"
                    />
                  );
                })}
              </>
            )}
          </div>
        ) : (
          /* REGULAR LIST VIEW TABLE */
          <div className="flex-1 overflow-y-auto border border-zinc-900 bg-zinc-950/10">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task Name</TableHead>
                  <TableHead>Associated Client</TableHead>
                  <TableHead>Project Scope</TableHead>
                  <TableHead>Project Stage</TableHead>
                  <TableHead>Specialist</TableHead>
                  <TableHead>Timeline</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead className="text-right">Routing Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map(task => (
                  <TableRow
                    key={task.id}
                    className="cursor-pointer hover:bg-zinc-900/30"
                    onClick={() => setSelectedTask(task)}
                  >
                    <TableCell className="font-semibold text-white">{task.title}</TableCell>
                    <TableCell className="text-zinc-400 font-semibold">{task.client?.name}</TableCell>
                    <TableCell className="text-zinc-500 font-medium">{task.project?.name || 'N/A'}</TableCell>
                    <TableCell className="text-zinc-450 font-mono">{task.stage?.name || 'Backlog'}</TableCell>
                    <TableCell className="text-zinc-400">{task.assignedTo?.name || 'Unassigned'}</TableCell>
                    <TableCell className="font-mono text-zinc-450">{task.timeline || 'N/A'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 font-mono text-[10px]">
                        <span>{task.progress}%</span>
                        <div className="h-1 w-10 bg-zinc-900 overflow-hidden">
                          <div style={{ width: `${task.progress}%` }} className="h-full bg-white" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant={task.status === 'COMPLETED' ? 'risk-low' : task.status === 'BLOCKED' ? 'risk-high' : 'outline'}
                        className="rounded-none uppercase font-mono tracking-wider text-[8px]"
                      >
                        {task.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* --- CREATE TASK MODAL --- */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-850 w-full max-w-md p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Create Client Task</h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-zinc-550 hover:text-white">
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Task Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Design Creative Banner Assets"
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  className="w-full text-xs bg-zinc-900 border border-zinc-800 px-3 py-2 text-white outline-none rounded-none focus:border-zinc-750"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Task Description</label>
                <textarea
                  rows={3}
                  placeholder="Provide deliverables detail..."
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className="w-full text-xs bg-zinc-900 border border-zinc-800 p-2.5 text-white outline-none rounded-none focus:border-zinc-750"
                />
              </div>

              {selectedProjectId !== 'all' && activeProjectStages.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Project Stage</label>
                  <select
                    value={createForm.stageId}
                    onChange={(e) => setCreateForm({ ...createForm, stageId: e.target.value })}
                    className="w-full text-xs bg-zinc-900 border border-zinc-800 px-3 py-2 text-white outline-none rounded-none focus:border-zinc-750"
                  >
                    <option value="">-- No Stage Assigned (Backlog) --</option>
                    {activeProjectStages.map((stage: any) => (
                      <option key={stage.id} value={stage.id}>
                        {stage.name} ({new Date(stage.startDate).toLocaleDateString()} to {new Date(stage.endDate).toLocaleDateString()})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid gap-4 grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Assign Specialist</label>
                  <select
                    value={createForm.assignedToId}
                    onChange={(e) => setCreateForm({ ...createForm, assignedToId: e.target.value })}
                    className="w-full text-xs bg-zinc-900 border border-zinc-800 px-3 py-2 text-white outline-none rounded-none focus:border-zinc-750"
                  >
                    <option value="">-- Unassigned --</option>
                    {teamMembers.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Initial Status</label>
                  <select
                    value={createForm.status}
                    onChange={(e) => setCreateForm({ ...createForm, status: e.target.value })}
                    className="w-full text-xs bg-zinc-900 border border-zinc-800 px-3 py-2 text-white outline-none rounded-none focus:border-zinc-750"
                  >
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="BLOCKED">Blocked</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-4 grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Task Timeline</label>
                  <input
                    type="text"
                    placeholder="e.g. 3 days, 1 week"
                    value={createForm.timeline}
                    onChange={(e) => setCreateForm({ ...createForm, timeline: e.target.value })}
                    className="w-full text-xs bg-zinc-900 border border-zinc-800 px-3 py-2 text-white outline-none rounded-none focus:border-zinc-750"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Target Deadline</label>
                  <input
                    type="date"
                    value={createForm.deadline}
                    onChange={(e) => setCreateForm({ ...createForm, deadline: e.target.value })}
                    className="w-full text-xs bg-zinc-900 border border-zinc-800 px-3 py-2 text-white outline-none rounded-none focus:border-zinc-750 font-mono"
                  />
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
                  type="submit"
                  className="bg-white text-zinc-950 hover:bg-zinc-200 rounded-none text-xs font-semibold px-6"
                >
                  Create Task
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- VIEW TASK DETAIL DRAWER --- */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex justify-end animate-fadeIn">
          <div className="flex-1" onClick={() => setSelectedTask(null)} />
          
          <div className="w-full max-w-lg bg-[#09090b] border-l border-zinc-800 p-6 flex flex-col h-full overflow-y-auto animate-slideIn text-xs">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-4 mb-4">
              <div>
                <span className="text-[8px] text-zinc-650 uppercase font-bold block">{selectedTask.project?.name || 'Client Deliverable'}</span>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mt-0.5">{selectedTask.title}</h3>
                <span className="text-[9px] text-zinc-550 font-semibold block">{selectedTask.client?.name}</span>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="text-zinc-500 hover:text-white border border-zinc-900 hover:border-zinc-800 p-1.5 transition-colors cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <div className="space-y-5 flex-1 pb-6">
              {/* Task Meta details */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-zinc-950/20 border border-zinc-900 text-[10px]">
                <div>
                  <span className="text-zinc-550 block font-semibold">Specialist:</span>
                  <span className="text-white font-medium">{selectedTask.assignedTo?.name || 'Unassigned'}</span>
                </div>
                <div>
                  <span className="text-zinc-550 block font-semibold">Timeline & Deadline:</span>
                  <span className="text-white font-medium">{selectedTask.timeline || 'N/A'} {selectedTask.deadline && `(Due: ${new Date(selectedTask.deadline).toLocaleDateString()})`}</span>
                </div>
                <div className="col-span-2 pt-2 border-t border-zinc-900 flex justify-between items-center">
                  <span className="text-zinc-555 font-semibold">Task Progress:</span>
                  <div className="flex items-center gap-1.5 font-mono text-white font-bold">
                    <span>{selectedTask.progress}%</span>
                    <Badge variant={selectedTask.status === 'COMPLETED' ? 'risk-low' : selectedTask.status === 'BLOCKED' ? 'risk-high' : 'outline'} className="rounded-none text-[8px] uppercase">
                      {selectedTask.status}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Task Stage Mapping (Manual Stage Move Selector) */}
              {selectedTask.projectId && (
                <div className="space-y-1.5 border border-zinc-900 p-3 bg-zinc-950/20">
                  <span className="text-[8px] text-zinc-600 uppercase font-bold block">Assigned Project Stage Gate</span>
                  <select
                    value={selectedTask.stageId || ''}
                    onChange={async (e) => {
                      const newStageId = e.target.value || null;
                      try {
                        const res = await fetch('/api/tasks', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            action: 'update_task',
                            id: selectedTask.id,
                            stageId: newStageId
                          })
                        });
                        if (res.ok) {
                          loadTasks();
                        }
                      } catch (err) {
                        console.error('Error shifting stage:', err);
                      }
                    }}
                    className="w-full text-[11px] bg-zinc-900 border border-zinc-850 p-2 text-white outline-none rounded-none focus:border-zinc-750 font-semibold cursor-pointer"
                  >
                    <option value="">-- No Stage Assigned (Backlog) --</option>
                    {projects.find(p => p.id === selectedTask.projectId)?.stages?.map((stage: any) => (
                      <option key={stage.id} value={stage.id}>
                        {stage.name} ({new Date(stage.startDate).toLocaleDateString()} to {new Date(stage.endDate).toLocaleDateString()})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {selectedTask.description && (
                <div className="space-y-1">
                  <span className="text-[8px] text-zinc-650 uppercase font-bold block">Deliverables description</span>
                  <p className="text-zinc-400 leading-relaxed bg-zinc-950 p-2.5 border border-zinc-900">{selectedTask.description}</p>
                </div>
              )}

              {/* Task chain explorer */}
              {(selectedTask.parentTask || (selectedTask.nextTasks && selectedTask.nextTasks.length > 0) || selectedTask.outputUrl) && (
                <div className="space-y-2 border border-zinc-900 p-3 bg-zinc-950/25">
                  <span className="text-[8px] text-red-500 font-bold uppercase tracking-wider block font-mono">Stage Handover Chain</span>
                  
                  {/* Task Chain Map */}
                  <div className="flex flex-col gap-2 pt-1 font-mono text-[9px] text-zinc-450">
                    {selectedTask.parentTask && (
                      <div className="flex items-center gap-1.5 text-zinc-550">
                        <span>Parent:</span>
                        <span className="underline cursor-pointer" onClick={() => setSelectedTask(selectedTask.parentTask)}>{selectedTask.parentTask.title}</span>
                        <CheckCircle className="h-3 w-3 text-emerald-500" />
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 font-bold text-white">
                      <span className="text-zinc-500">Current:</span>
                      <span>{selectedTask.title}</span>
                    </div>
                    {selectedTask.nextTasks?.map((nt: any) => (
                      <div key={nt.id} className="flex items-center gap-1.5 text-zinc-450">
                        <span>Next Stage:</span>
                        <span className="underline cursor-pointer text-zinc-400 hover:text-white" onClick={() => setSelectedTask(nt)}>{nt.title}</span>
                        <Badge className="text-[8px] p-0 px-1 border-zinc-700 bg-transparent text-zinc-450 rounded-none uppercase">{nt.status}</Badge>
                      </div>
                    ))}
                  </div>

                  {/* Output Deliverables URL */}
                  {selectedTask.outputUrl && (
                    <div className="pt-2 border-t border-zinc-900 mt-2 space-y-1.5">
                      <span className="block text-[8px] text-zinc-650 uppercase font-bold">Outputs / Deliverables</span>
                      <a
                        href={selectedTask.outputUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] text-zinc-350 hover:underline font-mono"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>{selectedTask.outputUrl}</span>
                      </a>
                      {selectedTask.carryOverComment && (
                        <p className="text-[10px] text-zinc-500 italic mt-1 bg-zinc-950 p-2 border border-zinc-900">
                          &ldquo;{selectedTask.carryOverComment}&rdquo;
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Quick Status / Progress Adjuster */}
              <div className="border border-zinc-900 p-3 bg-zinc-950/20 space-y-3">
                <span className="text-[8px] text-zinc-650 uppercase font-bold block">Status & Progress updates</span>
                <div className="grid gap-3 grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-[9px] text-zinc-555">Work Status</label>
                    <select
                      value={selectedTask.status}
                      onChange={async (e) => {
                        const newStatus = e.target.value;
                        const defaultProg = newStatus === 'COMPLETED' ? 100 : selectedTask.progress;
                        try {
                          await fetch('/api/tasks', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              action: 'update_task',
                              id: selectedTask.id,
                              status: newStatus,
                              progress: defaultProg
                            })
                          });
                          loadTasks();
                        } catch (err) {
                          console.error(err);
                        }
                      }}
                      className="w-full bg-zinc-900 border border-zinc-800 p-1.5 text-white outline-none rounded-none"
                    >
                      <option value="TODO">To Do</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="BLOCKED">Blocked</option>
                    </select>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-[9px] text-zinc-555">Progress Completion ({selectedTask.progress}%)</label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={selectedTask.progress}
                      onChange={async (e) => {
                        const nextProgress = parseInt(e.target.value, 10);
                        const nextStatus = nextProgress === 100 ? 'COMPLETED' : selectedTask.status;
                        try {
                          await fetch('/api/tasks', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              action: 'update_task',
                              id: selectedTask.id,
                              progress: nextProgress,
                              status: nextStatus
                            })
                          });
                          loadTasks();
                        } catch (err) {
                          console.error(err);
                        }
                      }}
                      className="w-full accent-white bg-zinc-900 border border-zinc-800 h-8 px-1"
                    />
                  </div>
                </div>

                {/* Blockers handler */}
                <div className="space-y-1.5 pt-2 border-t border-zinc-900">
                  <label className="text-[9px] text-zinc-555 block font-semibold">Active Blocker / Intervention notes</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. Awaiting client Facebook ad access approval..."
                      defaultValue={selectedTask.blocker || ''}
                      onBlur={async (e) => {
                        const blockerNotes = e.target.value;
                        const nextStatus = blockerNotes ? 'BLOCKED' : 'IN_PROGRESS';
                        try {
                          await fetch('/api/tasks', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              action: 'update_task',
                              id: selectedTask.id,
                              blocker: blockerNotes,
                              status: nextStatus
                            })
                          });
                          loadTasks();
                        } catch (err) {
                          console.error(err);
                        }
                      }}
                      className="flex-1 bg-zinc-900 border border-zinc-800 px-2 py-1 text-white placeholder-zinc-700 outline-none text-[11px]"
                    />
                  </div>
                </div>
              </div>

              {/* Carry Over Transition Button */}
              {selectedTask.status !== 'COMPLETED' && (
                <div className="border border-dashed border-zinc-800 p-3 bg-zinc-950/10 flex justify-between items-center">
                  <div>
                    <span className="block font-bold text-zinc-300">Successor carryover Handover</span>
                    <span className="block text-[9px] text-zinc-550 mt-0.5">Route completed deliverables to the next stage specialist</span>
                  </div>
                  <Button
                    onClick={() => {
                      setCarryOverForm({
                        newAssigneeId: '',
                        outputUrl: '',
                        comment: ''
                      });
                      setIsCarryOverOpen(true);
                    }}
                    className="h-7 bg-white text-zinc-950 hover:bg-zinc-200 text-[10px] rounded-none font-semibold flex items-center gap-1"
                  >
                    <span>Handover Stage</span>
                    <Play className="h-3 w-3 fill-zinc-950" />
                  </Button>
                </div>
              )}

              {/* Task Update Logs */}
              <div className="space-y-2 pt-2 border-t border-zinc-900">
                <span className="text-[8px] text-zinc-650 uppercase font-bold block">Specialist Activity Logs</span>
                <form onSubmit={handleAddUpdate} className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Log a progress updates note..."
                    value={newUpdateContent}
                    onChange={(e) => setNewUpdateContent(e.target.value)}
                    className="flex-1 bg-zinc-900 border border-zinc-800 px-2 py-1 text-white placeholder-zinc-700 outline-none text-[11px]"
                  />
                  <Button type="submit" size="sm" className="bg-zinc-100 text-zinc-950 hover:bg-white h-7 rounded-none px-3 font-semibold text-[10px]">
                    Log
                  </Button>
                </form>
                
                <div className="space-y-1.5 max-h-[120px] overflow-y-auto">
                  {selectedTask.updates?.map((u: any) => (
                    <div key={u.id} className="p-2 border border-zinc-900/60 bg-zinc-950/30 flex justify-between items-start">
                      <p className="text-zinc-300 pr-2">{u.content}</p>
                      <span className="font-mono text-[8px] text-zinc-600 shrink-0 mt-0.5">{new Date(u.createdAt).toLocaleDateString()}</span>
                    </div>
                  ))}
                  {(!selectedTask.updates || selectedTask.updates.length === 0) && (
                    <span className="text-zinc-650 italic text-[9px] block">No updates logged.</span>
                  )}
                </div>
              </div>

              {/* Internal Collaboration Comments */}
              <div className="space-y-2 pt-2 border-t border-zinc-900">
                <span className="text-[8px] text-zinc-650 uppercase font-bold block">Internal Discussion / Comments</span>
                <form onSubmit={handleAddComment} className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Type comments to assignees..."
                    value={newCommentContent}
                    onChange={(e) => setNewCommentContent(e.target.value)}
                    className="flex-1 bg-zinc-900 border border-zinc-800 px-2 py-1 text-white placeholder-zinc-700 outline-none text-[11px]"
                  />
                  <Button type="submit" size="sm" className="bg-zinc-100 text-zinc-950 hover:bg-white h-7 rounded-none px-3 font-semibold text-[10px] flex items-center gap-1">
                    <Send className="h-2.5 w-2.5" />
                    <span>Send</span>
                  </Button>
                </form>
                
                <div className="space-y-2 max-h-[140px] overflow-y-auto">
                  {selectedTask.comments?.map((c: any) => (
                    <div key={c.id} className="p-2 border border-zinc-900/60 bg-zinc-950/20 space-y-1.5">
                      <div className="flex justify-between items-center text-[9px]">
                        <span className="font-semibold text-zinc-350">{c.user?.name || 'Unknown User'} ({c.user?.role || 'User'})</span>
                        <span className="text-zinc-600 font-mono">{new Date(c.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-[10px] text-zinc-300">{c.content}</p>
                    </div>
                  ))}
                  {(!selectedTask.comments || selectedTask.comments.length === 0) && (
                    <span className="text-zinc-650 italic text-[9px] block">No comments posted.</span>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* --- CARRY OVER / HANDOVER MODAL --- */}
      {isCarryOverOpen && selectedTask && (
        <div className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-850 w-full max-w-sm p-6 shadow-2xl relative">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Carry-over Task Handover</h3>
              <button onClick={() => setIsCarryOverOpen(false)} className="text-zinc-550 hover:text-white">
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <form onSubmit={handleCarryOver} className="space-y-4">
              <div className="space-y-1">
                <span className="text-zinc-550 block font-semibold text-[10px]">CURRENT DELIVERABLE:</span>
                <span className="text-white block font-bold text-xs uppercase">{selectedTask.title}</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">Deliverables/Outputs Link *</label>
                <input
                  type="url"
                  required
                  placeholder="https://drive.google.com/file/... or Figma link"
                  value={carryOverForm.outputUrl}
                  onChange={(e) => setCarryOverForm({ ...carryOverForm, outputUrl: e.target.value })}
                  className="w-full text-xs bg-zinc-900 border border-zinc-800 px-3 py-2 text-white outline-none rounded-none focus:border-zinc-750 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">Assign Next-Stage Specialist *</label>
                <select
                  required
                  value={carryOverForm.newAssigneeId}
                  onChange={(e) => setCarryOverForm({ ...carryOverForm, newAssigneeId: e.target.value })}
                  className="w-full text-xs bg-zinc-900 border border-zinc-800 px-3 py-2 text-white outline-none rounded-none focus:border-zinc-750"
                >
                  <option value="">-- Choose specialist --</option>
                  {teamMembers
                    .filter(t => t.id !== selectedTask.assignedToId)
                    .map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.role})
                      </option>
                    ))
                  }
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">Handover Notes</label>
                <textarea
                  rows={3}
                  placeholder="Notes for the successor specialist..."
                  value={carryOverForm.comment}
                  onChange={(e) => setCarryOverForm({ ...carryOverForm, comment: e.target.value })}
                  className="w-full text-xs bg-zinc-900 border border-zinc-800 p-2.5 text-white outline-none rounded-none focus:border-zinc-750"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsCarryOverOpen(false)}
                  className="rounded-none text-xs text-zinc-500 hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-white text-zinc-950 hover:bg-zinc-200 rounded-none text-xs font-semibold px-4"
                >
                  Confirm Handover
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* Kanban column child component */
interface KanbanColumnProps {
  title: string;
  count: number;
  tasks: any[];
  onSelect: (task: any) => void;
  highlightColor?: string;
}

function KanbanColumn({ title, count, tasks, onSelect, highlightColor = 'border-t-zinc-850' }: KanbanColumnProps) {
  return (
    <div className={`w-72 shrink-0 border border-zinc-900 bg-zinc-950/5 flex flex-col max-h-full border-t-2 ${highlightColor}`}>
      <div className="p-3 border-b border-zinc-900/60 bg-zinc-950/30 flex justify-between items-center">
        <span className="font-semibold text-zinc-300 uppercase text-[9px] tracking-wider truncate mr-2" title={title}>{title}</span>
        <Badge variant="outline" className="rounded-none text-[8.5px] px-1.5 font-mono">
          {count}
        </Badge>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {tasks.map((task) => (
          <div
            key={task.id}
            onClick={() => onSelect(task)}
            className="border border-zinc-900 bg-zinc-950/50 hover:bg-zinc-900/10 hover:border-zinc-800 p-3 space-y-3 cursor-pointer transition-colors"
          >
            <div>
              <div className="flex justify-between items-start gap-1">
                <span className="block text-[8px] text-zinc-550 uppercase font-bold font-mono truncate">{task.client?.name}</span>
                {task.stage && (
                  <span className="text-[7.5px] bg-zinc-900 border border-zinc-850 px-1 text-zinc-450 truncate font-mono uppercase">
                    {task.stage.name}
                  </span>
                )}
              </div>
              <span className="block font-semibold text-white text-xs mt-0.5 tracking-wide leading-snug">{task.title}</span>
              {task.description && <span className="block text-[9px] text-zinc-500 mt-1 leading-normal truncate">{task.description}</span>}
            </div>

            {/* Micro progress bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[8px] text-zinc-650 font-mono">
                <span>Progress</span>
                <span>{task.progress}%</span>
              </div>
              <div className="h-0.5 bg-zinc-900 overflow-hidden w-full">
                <div
                  style={{ width: `${task.progress}%` }}
                  className={`h-full ${
                    task.status === 'COMPLETED'
                      ? 'bg-emerald-500'
                      : task.status === 'BLOCKED'
                      ? 'bg-rose-500'
                      : 'bg-white'
                  }`}
                />
              </div>
            </div>

            {/* Specialist & Timeline */}
            <div className="flex justify-between items-center text-[9px] text-zinc-650 pt-1 border-t border-zinc-900/50">
              <span className="truncate max-w-[120px]" title={task.assignedTo?.name || 'Unassigned'}>
                {task.assignedTo?.name || 'Unassigned'}
              </span>
              <span className="font-mono text-[8px]">{task.timeline || 'N/A'}</span>
            </div>
          </div>
        ))}
        {tasks.length === 0 && (
          <div className="py-6 text-center text-zinc-700 italic text-[9px]">Empty</div>
        )}
      </div>
    </div>
  );
}
