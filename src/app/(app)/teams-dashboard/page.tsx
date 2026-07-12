'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ClipboardList,
  Calendar as CalendarIcon,
  Play,
  Activity,
  AlertTriangle,
  Loader2,
  X,
  User,
  Clock,
  ExternalLink,
  MessageSquare,
  ArrowRight,
  ShieldAlert,
  Send,
  Video,
  MapPin,
  Lock,
  Users
} from 'lucide-react';
import { formatCurrency, formatPercent, formatUserMessage, obfuscateEmail } from '@/lib/utils';

interface Task {
  id: string;
  title: string;
  description?: string | null;
  status: 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED';
  progress: number;
  blocker?: string | null;
  update?: string | null;
  timeline?: string | null;
  deadline?: string | null;
  carryOverComment?: string | null;
  client?: { name: string } | null;
  project?: { name: string } | null;
  stage?: { id: string; name: string } | null;
  assignedTo?: { id: string; name: string; role: string } | null;
  updates?: { id: string; content: string; createdAt: string }[];
  comments?: { id: string; content: string; user: { name: string } }[];
}

interface CalendarEvent {
  id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  meetLink?: string | null;
  startTime: string;
  endTime: string;
  isRecurring: boolean;
  color: string;
  creatorId: string;
  attendees: string[];
}

export default function TeamsDashboardPage() {
  const [currentUser, setCurrentUser] = React.useState<any>(null);
  const [activeTab, setActiveTab] = React.useState<'tasks' | 'calendar'>('tasks');
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [calendarEvents, setCalendarEvents] = React.useState<CalendarEvent[]>([]);
  const [teamMembers, setTeamMembers] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [updatingTaskId, setUpdatingTaskId] = React.useState<string | null>(null);

  // Selected Task Detail Modal State
  const [selectedTask, setSelectedTask] = React.useState<Task | null>(null);
  const [newUpdateContent, setNewUpdateContent] = React.useState('');
  const [newCommentContent, setNewCommentContent] = React.useState('');

  // Carry Over Handover State
  const [isCarryOverOpen, setIsCarryOverOpen] = React.useState(false);
  const [carryOverForm, setCarryOverForm] = React.useState({
    newAssigneeId: '',
    outputUrl: '',
    comment: ''
  });

  // Calendar Date State - defaults to June/July 2026 based on DB seed
  const [currentDate, setCurrentDate] = React.useState<Date>(new Date('2026-07-02T12:00:00'));
  const [selectedEvent, setSelectedEvent] = React.useState<CalendarEvent | null>(null);

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      const email = localStorage.getItem('currentUserEmail') || sessionStorage.getItem('currentUserEmail') || 'david.k@apex.co';
      
      // 1. Fetch user profile
      const userRes = await fetch(`/api/user?email=${encodeURIComponent(obfuscateEmail(email))}`);
      if (!userRes.ok) throw new Error('User not found');
      const userData = await userRes.json();
      setCurrentUser(userData);

      // 2. Fetch tasks
      const tasksRes = await fetch('/api/tasks');
      if (tasksRes.ok) {
        const tasksData: Task[] = await tasksRes.json();
        // Filter tasks assigned to the current member
        const myTasks = tasksData.filter(t => t.assignedTo?.id === userData.id);
        setTasks(myTasks);

        // Refresh selected task if open
        if (selectedTask) {
          const fresh = myTasks.find(t => t.id === selectedTask.id);
          if (fresh) setSelectedTask(fresh);
        }
      }

      // 3. Fetch calendar events
      const calRes = await fetch(`/api/calendar?email=${encodeURIComponent(obfuscateEmail(email))}`);
      if (calRes.ok) {
        const calData = await calRes.json();
        setCalendarEvents(calData.events || []);
      }

      // 4. Fetch team members (for carry over re-assignment)
      const teamRes = await fetch('/api/data?domain=team');
      if (teamRes.ok) {
        const teamData = await teamRes.json();
        // Exclude current user from the re-assignee dropdown list
        setTeamMembers(teamData.filter((t: any) => t.id !== userData.id && t.role?.toLowerCase() !== 'client'));
      }
    } catch (e) {
      console.error('Error loading teams dashboard data:', e);
    } finally {
      setLoading(false);
    }
  }, [selectedTask?.id]);

  React.useEffect(() => {
    loadData();
  }, []);

  // Task Status Update (Drag & Drop or Manual)
  const handleUpdateStatus = async (taskId: string, newStatus: Task['status']) => {
    setUpdatingTaskId(taskId);
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_task',
          id: taskId,
          status: newStatus
        })
      });
      if (res.ok) {
        await loadData();
      }
    } catch (e) {
      console.error('Failed to update task status:', e);
    } finally {
      setUpdatingTaskId(null);
    }
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: Task['status']) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) {
      await handleUpdateStatus(taskId, targetStatus);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Add Task Log Update
  const handleAddUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !newUpdateContent.trim()) return;

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
        await loadData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Add Comment to Task
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !newCommentContent.trim() || !currentUser) return;

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_comment',
          taskId: selectedTask.id,
          content: newCommentContent,
          userEmail: currentUser.email
        })
      });
      if (res.ok) {
        setNewCommentContent('');
        await loadData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Carry Over / Handover Action
  const handleCarryOverSubmit = async (e: React.FormEvent) => {
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
        setIsCarryOverOpen(false);
        setSelectedTask(null);
        setCarryOverForm({ newAssigneeId: '', outputUrl: '', comment: '' });
        await loadData();
      } else {
        const err = await res.json();
        alert(formatUserMessage(err.error || 'Failed to complete carryover handover.'));
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Calendar Days Helper
  const calendarDays = React.useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const daysInMonth = lastDay.getDate();
    const startOffset = (firstDay.getDay() + 6) % 7; // Align to Monday start

    const temp = [];
    
    // Previous month padding
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startOffset - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthLastDay - i);
      temp.push({
        date: d,
        dayNum: d.getDate(),
        isCurrentMonth: false,
        dateStr: d.toISOString().slice(0, 10)
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      temp.push({
        date: d,
        dayNum: i,
        isCurrentMonth: true,
        dateStr: d.toISOString().slice(0, 10)
      });
    }

    // Next month padding to fill grid
    const totalCells = 35;
    const remaining = totalCells - temp.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      temp.push({
        date: d,
        dayNum: i,
        isCurrentMonth: false,
        dateStr: d.toISOString().slice(0, 10)
      });
    }

    return temp;
  }, [currentDate]);

  if (loading && !currentUser) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-zinc-500 text-xs flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Synchronizing teams workspace...</span>
        </div>
      </div>
    );
  }

  if (currentUser && currentUser.role?.toLowerCase() !== 'member') {
    return (
      <div className="flex h-[60vh] items-center justify-center p-6 text-center">
        <div className="max-w-md border border-zinc-900 bg-zinc-950/20 p-6 space-y-4">
          <Lock className="h-8 w-8 text-rose-500 mx-auto" />
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">Access Restricted</h2>
          <p className="text-xs text-zinc-500 font-sans leading-relaxed">
            The teams workspace is exclusively configured for internal specialists ('member' role). Your current role is '{currentUser.role}'.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-zinc-800/60 pb-5">
        <div>
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest font-mono">Teams Workspace</span>
          <h1 className="text-2xl font-bold tracking-tight text-white silver-text-gradient font-sans mt-0.5">
            Specialist Command Center
          </h1>
          <p className="text-xs text-zinc-500">
            Welcome back, {currentUser?.name}. Access your assigned project deliverables and schedule broadcast logs.
          </p>
        </div>

        {/* Tab Toggle buttons */}
        <div className="flex items-center gap-1.5 bg-zinc-950 p-1 border border-zinc-900 rounded-lg max-w-fit">
          <button
            onClick={() => setActiveTab('tasks')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'tasks' ? 'bg-white text-zinc-950 font-bold' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <ClipboardList className="h-3.5 w-3.5" />
            <span>My Kanban Tasks</span>
          </button>
          <button
            onClick={() => setActiveTab('calendar')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'calendar' ? 'bg-white text-zinc-950 font-bold' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <CalendarIcon className="h-3.5 w-3.5" />
            <span>Schedule Calendar</span>
          </button>
        </div>
      </div>

      {/* TASKS KANBAN PAGE VIEW */}
      {activeTab === 'tasks' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Header instructions banner */}
          <div className="flex items-start gap-2.5 bg-zinc-950/20 border border-zinc-900 p-3 text-xs leading-relaxed text-zinc-400 font-sans">
            <Activity className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
            <p>
              Drag and drop task cards between stages to update status parameters. Use the **Handover Stage** (carryover) option inside task details to sign-off and assign successors. Only members are authorized to carry over tasks.
            </p>
          </div>

          {/* Kanban Columns Grid */}
          <div className="grid gap-4 grid-cols-1 md:grid-cols-4 items-stretch overflow-x-auto min-h-[500px]">
            {([
              { id: 'TODO', label: 'Todo / Pending', border: 'border-zinc-900 bg-zinc-950/10' },
              { id: 'IN_PROGRESS', label: 'In Progress', border: 'border-amber-900/20 bg-amber-950/5' },
              { id: 'BLOCKED', label: 'Blocked', border: 'border-rose-900/20 bg-rose-950/5' },
              { id: 'COMPLETED', label: 'Completed', border: 'border-emerald-900/20 bg-emerald-950/5' }
            ] as const).map((col) => {
              const colTasks = tasks.filter(t => t.status === col.id);

              return (
                <div
                  key={col.id}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, col.id)}
                  className={`flex flex-col rounded-lg border p-3 ${col.border} min-h-[450px] transition-all`}
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between border-b border-zinc-900 pb-2 mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-white">
                      {col.label}
                    </span>
                    <Badge variant="outline" className="text-[9px] font-mono border-zinc-800 text-zinc-400">
                      {colTasks.length}
                    </Badge>
                  </div>

                  {/* Task Cards List */}
                  <div className="flex-1 flex flex-col gap-2 overflow-y-auto max-h-[600px] scrollbar-none">
                    {colTasks.length === 0 ? (
                      <div className="h-full flex items-center justify-center border border-dashed border-zinc-900/50 p-6 text-center text-[10px] text-zinc-650 italic rounded-md">
                        Drop tasks here
                      </div>
                    ) : (
                      colTasks.map((task) => (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, task.id)}
                          onClick={() => setSelectedTask(task)}
                          className="p-3 border border-zinc-900 bg-zinc-950 hover:bg-zinc-900/40 hover:border-zinc-800 transition-all select-none text-[11px] rounded-md cursor-grab active:cursor-grabbing text-left space-y-2.5"
                        >
                          <div>
                            <span className="block text-[8px] text-zinc-550 uppercase font-bold font-mono truncate">{task.client?.name || 'Intake'}</span>
                            <span className="block font-semibold text-white text-xs mt-0.5 truncate">{task.title}</span>
                            {task.project?.name && (
                              <span className="block text-[8px] text-zinc-500 font-mono mt-0.5 truncate">{task.project.name}</span>
                            )}
                          </div>

                          {/* Progress bar preview */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[8px] text-zinc-600 font-mono">
                              <span>Progress</span>
                              <span>{task.progress}%</span>
                            </div>
                            <div className="h-0.5 bg-zinc-900 overflow-hidden rounded-full">
                              <div
                                style={{ width: `${task.progress}%` }}
                                className={`h-full ${
                                  task.status === 'COMPLETED' ? 'bg-emerald-500' : task.status === 'BLOCKED' ? 'bg-rose-500' : 'bg-white'
                                }`}
                              />
                            </div>
                          </div>

                          <div className="flex justify-between items-center text-[8.5px] text-zinc-650 pt-1 border-t border-zinc-900/50">
                            <span>Deadline:</span>
                            <span className="font-mono text-zinc-400">{task.deadline ? new Date(task.deadline).toLocaleDateString() : 'N/A'}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CALENDAR TABS VIEW */}
      {activeTab === 'calendar' && (
        <div className="grid gap-6 md:grid-cols-3 animate-fadeIn">
          {/* Monthly Calendar Grid */}
          <div className="md:col-span-2 space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-zinc-400" />
                    <span>My Assigned Meetings Calendar (July 2026)</span>
                  </CardTitle>
                  <CardDescription>Click slots to view description and join links.</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="border border-zinc-850 bg-zinc-950/20 font-sans">
                  {/* Grid Headers */}
                  <div className="grid grid-cols-7 border-b border-zinc-850 bg-zinc-900/30 text-center text-[10px] font-bold text-zinc-400 py-2">
                    <div>Mon</div>
                    <div>Tue</div>
                    <div>Wed</div>
                    <div>Thu</div>
                    <div>Fri</div>
                    <div>Sat</div>
                    <div>Sun</div>
                  </div>

                  {/* Day cells grid */}
                  <div className="grid grid-cols-7 grid-rows-5 auto-rows-fr divide-x divide-y divide-zinc-850">
                    {calendarDays.map((cell, idx) => {
                      const dayEvents = calendarEvents.filter(ev => ev.startTime.startsWith(cell.dateStr));
                      
                      return (
                        <div
                          key={idx}
                          className={`min-h-[90px] p-2 flex flex-col justify-between hover:bg-zinc-900/20 transition-all cursor-pointer relative ${
                            !cell.isCurrentMonth ? 'text-zinc-650 opacity-40 bg-zinc-900/5' : 'text-zinc-300 bg-zinc-950/10'
                          }`}
                        >
                          <span className="text-[10px] font-bold text-zinc-400">
                            {cell.dayNum}
                          </span>

                          <div className="space-y-1 mt-1 overflow-y-auto max-h-[55px] scrollbar-none">
                            {dayEvents.map((ev) => (
                              <div
                                key={ev.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedEvent(ev);
                                }}
                                className={`p-1 text-[8px] flex items-center justify-between gap-1 border border-zinc-800 transition-all hover:brightness-125 rounded`}
                                style={{ backgroundColor: ev.color + '15', borderColor: ev.color + '30', color: ev.color }}
                              >
                                <span className="truncate font-semibold uppercase">{ev.title}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Schedule list sidebar panel */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold text-white">Event Agenda</CardTitle>
                <CardDescription>Scheduled calendar slots and briefings.</CardDescription>
              </CardHeader>
              <CardContent className="p-0 max-h-[500px] overflow-y-auto">
                <div className="divide-y divide-zinc-900 border-t border-zinc-900">
                  {calendarEvents.map((ev) => {
                    const startD = new Date(ev.startTime);
                    return (
                      <div key={ev.id} className="p-4 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-white block">{ev.title}</span>
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: ev.color }} />
                        </div>
                        <p className="text-[10px] text-zinc-550 line-clamp-2 leading-relaxed">{ev.description || 'No description provided.'}</p>
                        <div className="flex items-center justify-between pt-1 text-[9px] text-zinc-650 font-mono">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {startD.toLocaleDateString()} {startD.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedEvent(ev)}
                            className="h-5 p-0 text-white hover:text-zinc-300 text-[9px] font-bold"
                          >
                            Inspect
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  {calendarEvents.length === 0 && (
                    <div className="p-6 text-center text-zinc-500 text-xs italic">No scheduled meetings.</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* TASK DETAILS MODAL */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setSelectedTask(null)} />
          <Card className="relative z-10 w-full max-w-lg bg-[#0d0e12] border-zinc-800 shadow-2xl p-2 font-sans text-xs text-left">
            <CardHeader className="border-b border-zinc-900 pb-3 flex flex-row items-center justify-between">
              <div>
                <span className="text-[9px] font-bold text-red-500 uppercase tracking-widest font-mono">Task Details Card</span>
                <CardTitle className="text-sm font-bold text-white uppercase tracking-wider mt-0.5">
                  {selectedTask.title}
                </CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedTask(null)}
                className="h-6 w-6 p-0 text-zinc-500 hover:text-white"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4 pt-4 max-h-[80vh] overflow-y-auto">
              <div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 block">Description</span>
                <p className="text-zinc-350 mt-1 block leading-relaxed font-medium">{selectedTask.description || 'No description provided.'}</p>
              </div>

              {/* Progress and status */}
              <div className="grid gap-3 sm:grid-cols-2 pt-2 border-t border-zinc-900">
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 block">Status</span>
                  <select
                    value={selectedTask.status}
                    onChange={(e) => handleUpdateStatus(selectedTask.id, e.target.value as Task['status'])}
                    className="mt-1 bg-zinc-900 border border-zinc-800 text-white rounded px-2.5 py-1 text-xs focus:outline-none capitalize font-semibold cursor-pointer"
                  >
                    <option value="TODO">Todo</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="BLOCKED">Blocked</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </div>
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 block">Task Timeline</span>
                  <span className="text-white mt-1 block">{selectedTask.timeline || 'N/A'}</span>
                </div>
              </div>

              {/* Successor carryover Handover Button */}
              {selectedTask.status !== 'COMPLETED' && (
                <div className="border border-dashed border-zinc-800 p-3 bg-zinc-950/15 flex justify-between items-center rounded">
                  <div>
                    <span className="block font-bold text-zinc-300">Successor carryover Handover</span>
                    <span className="block text-[9px] text-zinc-550 mt-0.5">Mark completed and hand off child task successor.</span>
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
                    className="h-7 bg-white text-zinc-950 hover:bg-zinc-200 text-[10px] rounded font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <span>Handover Stage</span>
                    <Play className="h-3 w-3 fill-zinc-950" />
                  </Button>
                </div>
              )}

              {/* Specialist Updates logs */}
              <div className="space-y-2 pt-2 border-t border-zinc-900">
                <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 block">Specialist Activity Logs</span>
                <form onSubmit={handleAddUpdate} className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Log a progress update note..."
                    value={newUpdateContent}
                    onChange={(e) => setNewUpdateContent(e.target.value)}
                    className="flex-1 bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-xs text-white placeholder-zinc-700 outline-none rounded focus:border-zinc-700 font-sans"
                  />
                  <Button type="submit" size="sm" className="bg-zinc-100 text-zinc-950 hover:bg-white h-8 rounded px-4 font-semibold text-[11px] cursor-pointer">
                    Log Update
                  </Button>
                </form>
                
                <div className="space-y-1.5 max-h-[140px] overflow-y-auto">
                  {selectedTask.updates?.map((u: any) => (
                    <div key={u.id} className="p-2 border border-zinc-900/60 bg-zinc-950/20 text-[10.5px] leading-relaxed text-zinc-400 font-sans">
                      <div className="flex justify-between text-[9px] text-zinc-650 font-mono mb-1">
                        <span>Logged Update</span>
                        <span>{new Date(u.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p>{u.content}</p>
                    </div>
                  ))}
                  {(!selectedTask.updates || selectedTask.updates.length === 0) && (
                    <span className="text-zinc-600 italic block text-[10px] py-1">No updates logged.</span>
                  )}
                </div>
              </div>

              {/* Client Comments */}
              <div className="space-y-2 pt-2 border-t border-zinc-900">
                <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 block">Collaboration Comments</span>
                <form onSubmit={handleAddComment} className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Write a response comment..."
                    value={newCommentContent}
                    onChange={(e) => setNewCommentContent(e.target.value)}
                    className="flex-1 bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-xs text-white placeholder-zinc-700 outline-none rounded focus:border-zinc-700 font-sans"
                  />
                  <Button type="submit" size="sm" className="bg-zinc-150 text-zinc-900 hover:bg-zinc-200 h-8 rounded px-4 font-semibold text-[11px] cursor-pointer">
                    Comment
                  </Button>
                </form>

                <div className="space-y-1.5 max-h-[140px] overflow-y-auto">
                  {selectedTask.comments?.map((c: any) => (
                    <div key={c.id} className="p-2 border border-zinc-900/40 bg-zinc-950/20 text-[10.5px]">
                      <div className="flex items-center gap-1.5 font-semibold text-zinc-300 text-[10px] mb-1">
                        <User className="h-3 w-3 text-zinc-500" />
                        <span>{c.user?.name || 'User'}</span>
                      </div>
                      <p className="text-zinc-400 leading-relaxed font-sans">{c.content}</p>
                    </div>
                  ))}
                  {(!selectedTask.comments || selectedTask.comments.length === 0) && (
                    <span className="text-zinc-600 italic block text-[10px] py-1">No comments.</span>
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  variant="secondary"
                  onClick={() => setSelectedTask(null)}
                  className="h-8 px-4 font-semibold text-xs cursor-pointer"
                >
                  Close Panel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* CARRY OVER HANDOVER FORM MODAL */}
      {isCarryOverOpen && selectedTask && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsCarryOverOpen(false)} />
          <Card className="relative z-10 w-full max-w-md bg-[#0d0e12] border-zinc-800 shadow-2xl p-2 font-sans text-xs text-left">
            <CardHeader className="border-b border-zinc-900 pb-3 flex flex-row items-center justify-between">
              <div>
                <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest font-mono">Stage Carryover Chain</span>
                <CardTitle className="text-sm font-bold text-white uppercase tracking-wider mt-0.5">Handover Specialist</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCarryOverOpen(false)}
                className="h-6 w-6 p-0 text-zinc-500 hover:text-white"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleCarryOverSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">Deliverables / Output URL</label>
                  <input
                    type="url"
                    required
                    placeholder="https://canva.com/design/... or final assets link"
                    value={carryOverForm.outputUrl}
                    onChange={(e) => setCarryOverForm({ ...carryOverForm, outputUrl: e.target.value })}
                    className="w-full text-xs bg-zinc-900 border border-zinc-800 p-2.5 text-white outline-none rounded focus:border-zinc-700"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">Successor Assignee</label>
                  <select
                    required
                    value={carryOverForm.newAssigneeId}
                    onChange={(e) => setCarryOverForm({ ...carryOverForm, newAssigneeId: e.target.value })}
                    className="w-full text-xs bg-zinc-900 border border-zinc-800 p-2.5 text-white outline-none rounded focus:border-zinc-700 cursor-pointer font-sans"
                  >
                    <option value="">Select successor specialist...</option>
                    {teamMembers.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">Handover Notes</label>
                  <textarea
                    rows={3}
                    placeholder="Notes for the successor specialist..."
                    value={carryOverForm.comment}
                    onChange={(e) => setCarryOverForm({ ...carryOverForm, comment: e.target.value })}
                    className="w-full text-xs bg-zinc-900 border border-zinc-800 p-2.5 text-white outline-none rounded focus:border-zinc-700 resize-none font-sans"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsCarryOverOpen(false)}
                    className="rounded text-xs text-zinc-500 hover:text-white cursor-pointer"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-white text-zinc-950 hover:bg-zinc-200 rounded text-xs font-semibold px-4 cursor-pointer"
                  >
                    Confirm Handover
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* CALENDAR DETAILS MODAL */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setSelectedEvent(null)} />
          <Card className="relative z-10 w-full max-w-md bg-[#0d0e12] border-zinc-800 shadow-2xl p-2 font-sans text-xs text-left">
            <CardHeader className="border-b border-zinc-900 pb-3 flex flex-row items-center justify-between">
              <div>
                <span className="text-[9px] font-bold text-red-500 uppercase tracking-widest font-mono">Calendar Event Details</span>
                <CardTitle className="text-sm font-bold text-white uppercase tracking-wider mt-0.5">
                  {selectedEvent.title}
                </CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedEvent(null)}
                className="h-6 w-6 p-0 text-zinc-500 hover:text-white"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 block">Description</span>
                <p className="text-zinc-350 mt-1 block leading-relaxed font-sans">{selectedEvent.description || 'No description provided.'}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 pt-2 border-t border-zinc-900">
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 block">Schedule</span>
                  <span className="text-white mt-1 block font-mono text-[10px]">
                    {new Date(selectedEvent.startTime).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 block">Location</span>
                  <span className="text-white mt-1 block">{selectedEvent.location || 'N/A'}</span>
                </div>
              </div>

              {selectedEvent.meetLink && (
                <div className="pt-2 border-t border-zinc-900 flex justify-between items-center bg-zinc-955 border border-zinc-900 p-2.5 rounded">
                  <span className="text-[10px] font-semibold text-zinc-400 flex items-center gap-1">
                    <Video className="h-3.5 w-3.5 text-zinc-550" />
                    <span>Google Meet video call link:</span>
                  </span>
                  <a
                    href={selectedEvent.meetLink}
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-450 hover:underline flex items-center gap-0.5 text-[10px] font-bold font-mono"
                  >
                    <span>Join meeting</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <Button
                  variant="secondary"
                  onClick={() => setSelectedEvent(null)}
                  className="h-8 px-4 font-semibold text-xs cursor-pointer"
                >
                  Close Details
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
