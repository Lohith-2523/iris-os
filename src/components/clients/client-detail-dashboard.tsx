'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { formatCurrency, formatPercent, formatUserMessage } from '@/lib/utils';
import {
  ArrowLeft,
  Plus,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Activity,
  User,
  DollarSign,
  Building,
  Target,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  Globe,
  Cpu,
  Code,
  Calendar,
  Layers,
  Edit2
} from 'lucide-react';

const Facebook = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

const Instagram = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

interface ClientDetailDashboardProps {
  client: any;
  teamMembers: any[];
  onBack: () => void;
}

export default function ClientDetailDashboard({ client, teamMembers, onBack }: ClientDetailDashboardProps) {
  const [tasks, setTasks] = React.useState<any[]>([]);
  const [metaCampaigns, setMetaCampaigns] = React.useState<any[]>([]);
  const [metaLeads, setMetaLeads] = React.useState<any[]>([]);
  const [loadingTasks, setLoadingTasks] = React.useState(true);
  const [loadingMeta, setLoadingMeta] = React.useState(true);

  // Task Creation Form States
  const [isTaskModalOpen, setIsTaskModalOpen] = React.useState(false);
  const [taskForm, setTaskForm] = React.useState({
    title: '',
    description: '',
    assignedToId: '',
    status: 'TODO',
    progress: 0
  });

  // Task Edit Inline States
  const [editingTaskId, setEditingTaskId] = React.useState<string | null>(null);
  const [editForm, setEditForm] = React.useState({
    status: 'TODO',
    progress: 0,
    blocker: '',
    update: ''
  });

  // Fetch Client Tasks & Meta Data
  const loadData = React.useCallback(async () => {
    setLoadingTasks(true);
    try {
      const res = await fetch(`/api/tasks?clientId=${client.id}`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch (e) {
      console.error('Error loading tasks:', e);
    } finally {
      setLoadingTasks(false);
    }

    setLoadingMeta(true);
    try {
      const res = await fetch('/api/meta-portal');
      if (res.ok) {
        const data = await res.json();
        // Filter campaigns and leads based on client's adAccountId
        const adAccountId = client.adAccountId || 'none';
        const filteredCampaigns = (data.campaigns || []).filter((camp: any) =>
          camp.campaignId.startsWith(adAccountId)
        );
        const filteredLeads = (data.leads || []).filter((l: any) =>
          l.adId && l.adId.startsWith(adAccountId)
        );
        setMetaCampaigns(filteredCampaigns);
        setMetaLeads(filteredLeads);
      }
    } catch (e) {
      console.error('Error loading meta-portal data:', e);
    } finally {
      setLoadingMeta(false);
    }
  }, [client.id, client.adAccountId]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Create Task Handler
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskForm.title) return;

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_task',
          clientId: client.id,
          title: taskForm.title,
          description: taskForm.description,
          assignedToId: taskForm.assignedToId || null,
          status: taskForm.status,
          progress: taskForm.progress,
        })
      });

      if (res.ok) {
        setIsTaskModalOpen(false);
        setTaskForm({ title: '', description: '', assignedToId: '', status: 'TODO', progress: 0 });
        loadData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Update Task Handler
  const handleUpdateTask = async (taskId: string) => {
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_task',
          id: taskId,
          status: editForm.status,
          progress: editForm.progress,
          blocker: editForm.blocker,
          update: editForm.update
        })
      });

      if (res.ok) {
        setEditingTaskId(null);
        loadData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Delete Task Handler
  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_task', id: taskId })
      });
      if (res.ok) {
        loadData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Find assigned team member details
  const assignedSpecialist = teamMembers.find(t => t.id === client.metadata?.assignedTeamMemberId);

  // Dynamic Service Specific Computations
  const totalSpend = React.useMemo(() => {
    return metaCampaigns.reduce((sum, camp) => {
      return sum + (camp.ads || []).reduce((adSum: number, ad: any) => adSum + ad.spend, 0);
    }, 0);
  }, [metaCampaigns]);

  const totalLeads = React.useMemo(() => {
    return metaCampaigns.reduce((sum, camp) => {
      return sum + (camp.ads || []).reduce((adSum: number, ad: any) => adSum + ad.leadsCount, 0);
    }, 0);
  }, [metaCampaigns]);

  const avgCpl = totalLeads > 0 ? totalSpend / totalLeads : 0;

  return (
    <div className="space-y-6 font-sans text-xs">
      {/* Top Navigation Row */}
      <div className="flex items-center justify-between border-b border-zinc-800/60 pb-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="h-8 w-8 text-zinc-400 hover:text-white"
          >
            <ArrowLeft className="h-4.5 w-4.5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white silver-text-gradient">{client.name} Workspace</h1>
            <p className="text-[10px] text-zinc-500 mt-0.5">Admin Management Terminal | {client.domain}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={client.status === 'ACTIVE' ? 'risk-low' : 'outline'}>
            Status: {client.status}
          </Badge>
          <Badge variant={client.healthScore >= 80 ? 'risk-low' : client.healthScore >= 50 ? 'risk-medium' : 'risk-high'}>
            Health: {client.healthScore}/100 ({client.healthStatus})
          </Badge>
        </div>
      </div>

      {/* Main Splits */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column: Commercials, Team and Tasks */}
        <div className="md:col-span-1 space-y-6">
          
          {/* General Commercials Card */}
          <Card>
            <CardHeader className="pb-3 border-b border-zinc-900">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Account Details</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-400 flex items-center gap-1.5"><DollarSign className="h-3.5 w-3.5 text-zinc-500" /> Retainer Value</span>
                <span className="font-bold text-white font-mono">
                  {client.upsellOpportunityValue ? `$${client.upsellOpportunityValue.toLocaleString()}/yr` : '$20,000/yr'}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-400 flex items-center gap-1.5"><Building className="h-3.5 w-3.5 text-zinc-500" /> Agency Service</span>
                <span className="font-semibold text-zinc-300">{client.agencyType || 'Digital Marketing'}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-400 flex items-center gap-1.5"><Layers className="h-3.5 w-3.5 text-zinc-500" /> Business Model</span>
                <span className="font-semibold text-zinc-300">{client.businessModel || 'B2B'}</span>
              </div>
            </CardContent>
          </Card>

          {/* Assigned Specialists Card */}
          <Card>
            <CardHeader className="pb-3 border-b border-zinc-900">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Assigned Team</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {assignedSpecialist ? (
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 font-semibold uppercase">
                    {assignedSpecialist.name[0]}
                  </div>
                  <div>
                    <span className="block font-semibold text-white text-xs">{assignedSpecialist.name}</span>
                    <span className="block text-[10px] text-zinc-500 mt-0.5">{assignedSpecialist.role}</span>
                    <span className="block text-[9px] text-zinc-650 font-mono mt-0.5">{assignedSpecialist.email}</span>
                  </div>
                </div>
              ) : (
                <span className="text-zinc-500 italic">No lead specialist assigned.</span>
              )}
            </CardContent>
          </Card>

          {/* Task Board Card */}
          <Card>
            <CardHeader className="pb-3 border-b border-zinc-900 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Tasks & Progress</CardTitle>
                <CardDescription className="text-[10px] text-zinc-500 mt-0.5">Tasks assigned to team members.</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsTaskModalOpen(true)}
                className="h-7 px-2 border-zinc-800 text-zinc-300 text-[10px] flex items-center gap-1 rounded-none"
              >
                <Plus className="h-3 w-3" />
                <span>New Task</span>
              </Button>
            </CardHeader>
            <CardContent className="pt-4 p-0">
              {loadingTasks ? (
                <div className="p-6 text-center text-zinc-500 flex items-center justify-center gap-2">
                  <Loader2 className="h-4.5 w-4.5 animate-spin" />
                  <span>Loading client tasks...</span>
                </div>
              ) : tasks.length === 0 ? (
                <div className="p-6 text-center text-zinc-600 italic">No tasks created yet. Click New Task to start.</div>
              ) : (
                <div className="divide-y divide-zinc-900 max-h-[380px] overflow-y-auto">
                  {tasks.map((task) => {
                    const isEditing = editingTaskId === task.id;
                    return (
                      <div key={task.id} className="p-4 space-y-2 text-xs">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-semibold text-white block">{task.title}</span>
                            {task.description && <span className="text-[10px] text-zinc-500 mt-0.5 block">{task.description}</span>}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Badge
                              variant={
                                task.status === 'COMPLETED'
                                  ? 'risk-low'
                                  : task.status === 'BLOCKED'
                                  ? 'risk-high'
                                  : task.status === 'IN_PROGRESS'
                                  ? 'risk-medium'
                                  : 'outline'
                              }
                              className="rounded-none uppercase tracking-wider text-[9px]"
                            >
                              {task.status}
                            </Badge>
                            
                            {!isEditing && (
                              <button
                                onClick={() => {
                                  setEditingTaskId(task.id);
                                  setEditForm({
                                    status: task.status,
                                    progress: task.progress,
                                    blocker: task.blocker || '',
                                    update: task.update || ''
                                  });
                                }}
                                className="text-zinc-500 hover:text-white p-1 border border-zinc-900 hover:border-zinc-800 transition-colors"
                              >
                                <Edit2 className="h-3 w-3" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteTask(task.id)}
                              className="text-zinc-550 hover:text-rose-400 p-1 border border-zinc-900 hover:border-zinc-800 transition-colors"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[9px] text-zinc-500">
                            <span>Progress</span>
                            <span className="font-mono">{task.progress}%</span>
                          </div>
                          <div className="h-1 bg-zinc-900 overflow-hidden">
                            <div
                              style={{ width: `${task.progress}%` }}
                              className={`h-full ${
                                task.status === 'COMPLETED'
                                  ? 'bg-emerald-500'
                                  : task.status === 'BLOCKED'
                                  ? 'bg-rose-500'
                                  : 'bg-amber-500'
                              }`}
                            />
                          </div>
                        </div>

                        {/* Inline Task Edit Section */}
                        {isEditing && (
                          <div className="border border-zinc-800 bg-zinc-950 p-3 mt-2 space-y-3">
                            <div className="grid gap-2 grid-cols-2">
                              <div className="space-y-1">
                                <label className="text-[9px] uppercase tracking-wider text-zinc-500">Status</label>
                                <select
                                  value={editForm.status}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                                  className="w-full text-[10px] bg-zinc-900 border border-zinc-800 p-1 text-white outline-none rounded-none"
                                >
                                  <option value="TODO">To Do</option>
                                  <option value="IN_PROGRESS">In Progress</option>
                                  <option value="COMPLETED">Completed</option>
                                  <option value="BLOCKED">Blocked</option>
                                </select>
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] uppercase tracking-wider text-zinc-500">Progress ({editForm.progress}%)</label>
                                <input
                                  type="range"
                                  min="0"
                                  max="100"
                                  step="5"
                                  value={editForm.progress}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, progress: Number(e.target.value) }))}
                                  className="w-full bg-zinc-800 h-1 accent-white"
                                />
                              </div>
                            </div>
                            
                            {editForm.status === 'BLOCKED' && (
                              <div className="space-y-1">
                                <label className="text-[9px] uppercase tracking-wider text-rose-450 font-semibold block">Blocker Note</label>
                                <input
                                  type="text"
                                  placeholder="What is blocking this task?"
                                  value={editForm.blocker}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, blocker: e.target.value }))}
                                  className="w-full text-[10px] bg-zinc-900 border border-zinc-800 px-2 py-1 text-white outline-none rounded-none"
                                />
                              </div>
                            )}

                            <div className="space-y-1">
                              <label className="text-[9px] uppercase tracking-wider text-zinc-500 block">Recent Update</label>
                              <input
                                type="text"
                                placeholder="E.g. storyboards drafted, CTA button style changes done"
                                value={editForm.update}
                                onChange={(e) => setEditForm(prev => ({ ...prev, update: e.target.value }))}
                                className="w-full text-[10px] bg-zinc-900 border border-zinc-800 px-2 py-1 text-white outline-none rounded-none"
                              />
                            </div>

                            <div className="flex justify-end gap-1.5 pt-1">
                              <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setEditingTaskId(null)}
                                className="h-6 text-[9px] rounded-none px-2 text-zinc-500 hover:text-white"
                              >
                                Cancel
                              </Button>
                              <Button
                                type="button"
                                onClick={() => handleUpdateTask(task.id)}
                                className="h-6 text-[9px] rounded-none px-3 bg-white text-zinc-950 hover:bg-zinc-200"
                              >
                                Save Updates
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Display updates/blockers */}
                        {!isEditing && task.status === 'BLOCKED' && task.blocker && (
                          <div className="bg-rose-950/10 border border-rose-950/40 p-2 text-[10px] text-rose-400 flex items-start gap-1.5">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                            <span><strong>Blocker:</strong> {task.blocker}</span>
                          </div>
                        )}
                        {!isEditing && task.update && (
                          <div className="bg-zinc-950 p-2 text-[10px] text-zinc-450 border border-zinc-900 flex items-start gap-1.5">
                            <Activity className="h-3.5 w-3.5 text-zinc-650 shrink-0" />
                            <span>{task.update}</span>
                          </div>
                        )}

                        {/* Specialist assignee */}
                        <div className="flex justify-between items-center text-[9px] text-zinc-600 pt-1">
                          <span>Assigned To:</span>
                          <span>{task.assignedTo?.name || 'Unassigned'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Dynamic View Widgets Based on Specialization */}
        <div className="md:col-span-2 space-y-6">
          
          {/* DIGITAL MARKETING / LEAD GEN WIDGETS */}
          {(client.agencyType?.toLowerCase().includes('marketing') || client.agencyType?.toLowerCase().includes('advertising')) && (
            <div className="space-y-6">
              
              {/* Lead Gen KPIs */}
              <div className="grid gap-4 sm:grid-cols-3">
                <Card>
                  <CardHeader className="pb-1">
                    <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Ad Spend</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold font-mono tracking-tight text-white">{formatCurrency(totalSpend)}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-1">
                    <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Leads Captured</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold font-mono tracking-tight text-white">{totalLeads} Leads</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-1">
                    <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Average CPL</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold font-mono tracking-tight text-white">{formatCurrency(avgCpl, 2)}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Ad Creatives Grid */}
              <Card>
                <CardHeader className="pb-3 border-b border-zinc-900">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Meta Ad Creatives</CardTitle>
                  <CardDescription className="text-[10px] text-zinc-500">Live active ad creatives on Facebook & Instagram.</CardDescription>
                </CardHeader>
                <CardContent className="pt-4 p-0">
                  {loadingMeta ? (
                    <div className="p-8 text-center text-zinc-500 flex items-center justify-center gap-2">
                      <Loader2 className="h-4.5 w-4.5 animate-spin" />
                      <span>Syncing ad creatives...</span>
                    </div>
                  ) : metaCampaigns.length === 0 ? (
                    <div className="p-8 text-center text-zinc-650 italic">No ad campaigns synced. Link account ID.</div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2 p-4">
                      {metaCampaigns.flatMap(camp => camp.ads || []).map((ad: any) => (
                        <div key={ad.id} className="border border-zinc-900 bg-zinc-950/20 p-3 space-y-2 flex flex-col justify-between">
                          <div>
                            <div className="flex justify-between items-center">
                              <span className="font-semibold text-white truncate max-w-[150px] block">{ad.name}</span>
                              <Badge variant={ad.status === 'ACTIVE' ? 'risk-low' : 'outline'} className="rounded-none uppercase tracking-wider text-[8px]">
                                {ad.status}
                              </Badge>
                            </div>
                            <span className="text-[9px] text-zinc-500 uppercase tracking-widest mt-1 block font-mono">{ad.platform} AD</span>
                          </div>
                          
                          <div className="grid grid-cols-3 border-t border-zinc-900 pt-2 text-[10px] font-mono text-zinc-400">
                            <div>
                              <span className="block text-[8px] text-zinc-600 uppercase font-sans">Spend</span>
                              <span>${ad.spend}</span>
                            </div>
                            <div>
                              <span className="block text-[8px] text-zinc-600 uppercase font-sans">Leads</span>
                              <span>{ad.leadsCount}</span>
                            </div>
                            <div>
                              <span className="block text-[8px] text-zinc-600 uppercase font-sans">Clicks</span>
                              <span>{ad.clicks}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Leads Captured Feed */}
              <Card>
                <CardHeader className="pb-3 border-b border-zinc-900">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Leads Captured Feed</CardTitle>
                  <CardDescription className="text-[10px] text-zinc-500">Real-time leads routing pipeline details.</CardDescription>
                </CardHeader>
                <CardContent className="pt-4 p-0">
                  {loadingMeta ? (
                    <div className="p-8 text-center text-zinc-500 flex items-center justify-center gap-2">
                      <Loader2 className="h-4.5 w-4.5 animate-spin" />
                      <span>Loading leads list...</span>
                    </div>
                  ) : metaLeads.length === 0 ? (
                    <div className="p-8 text-center text-zinc-650 italic">No leads collected yet.</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Lead Profile</TableHead>
                          <TableHead>Contact Detail</TableHead>
                          <TableHead>Funnel Origin</TableHead>
                          <TableHead>Collection Source</TableHead>
                          <TableHead>Approach Mode</TableHead>
                          <TableHead className="text-right">Routing Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {metaLeads.map((lead: any) => (
                          <TableRow key={lead.id}>
                            <TableCell className="font-semibold text-white">{lead.fullName}</TableCell>
                            <TableCell>
                              <div>
                                <span className="block text-[10px] text-zinc-300 font-mono">{lead.email}</span>
                                <span className="block text-[9px] text-zinc-500 font-mono mt-0.5">{lead.phone || 'N/A'}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-zinc-400 font-medium">{lead.funnelName || 'Default Funnel'}</TableCell>
                            <TableCell className="font-mono text-zinc-400 text-[10px]">{lead.collectionMethod || 'FB Form'}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="rounded-none font-semibold uppercase text-[9px]">
                                {lead.approachMethod || 'Cold Email'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge
                                variant={
                                  lead.status === 'closed'
                                    ? 'risk-low'
                                    : lead.status === 'unqualified'
                                    ? 'outline'
                                    : 'risk-medium'
                                }
                                className="rounded-none uppercase tracking-wider text-[8px]"
                              >
                                {lead.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

            </div>
          )}

          {/* SEO AGENCY WIDGETS */}
          {client.agencyType?.toLowerCase().includes('seo') && (
            <div className="space-y-6">
              
              {/* SEO Metrics */}
              <div className="grid gap-4 sm:grid-cols-3">
                <Card>
                  <CardHeader className="pb-1">
                    <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Monthly Traffic</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold font-mono tracking-tight text-white">24,500/mo</div>
                    <span className="text-[9px] text-emerald-450 block font-semibold mt-1">+14.5% vs last month</span>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-1">
                    <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Domain Authority</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold font-mono tracking-tight text-white">42 / 100</div>
                    <span className="text-[9px] text-zinc-500 block mt-1">Apex Creative niche goal 50</span>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-1">
                    <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Google Site Health</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold font-mono tracking-tight text-emerald-400">94%</div>
                    <span className="text-[9px] text-zinc-500 block mt-1">Optimized Core Web Vitals</span>
                  </CardContent>
                </Card>
              </div>

              {/* Keywords List */}
              <Card>
                <CardHeader className="pb-3 border-b border-zinc-900">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Target Keywords Portfolio</CardTitle>
                  <CardDescription className="text-[10px] text-zinc-500">Active keyword positions in Google SERP audits.</CardDescription>
                </CardHeader>
                <CardContent className="pt-4 p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Target Keyword</TableHead>
                        <TableHead className="text-center">Google Position</TableHead>
                        <TableHead className="text-center">Search Volume</TableHead>
                        <TableHead className="text-right">Difficulty (KD)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[
                        { word: 'enterprise CRM integration', pos: '#2', vol: '1,200/mo', kd: 'High (68%)' },
                        { word: 'operational analytics SaaS', pos: '#4', vol: '850/mo', kd: 'Medium (42%)' },
                        { word: 'client onboarding portal software', pos: '#1', vol: '400/mo', kd: 'Low (28%)' },
                        { word: 'automated financial ledgers', pos: '#8', vol: '2,100/mo', kd: 'High (78%)' },
                      ].map((kw, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-semibold text-white">{kw.word}</TableCell>
                          <TableCell className="text-center font-mono text-emerald-400 font-bold">{kw.pos}</TableCell>
                          <TableCell className="text-center font-mono text-zinc-300">{kw.vol}</TableCell>
                          <TableCell className="text-right font-mono text-zinc-450">{kw.kd}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

            </div>
          )}

          {/* WEB DESIGN & DEV WIDGETS */}
          {client.agencyType?.toLowerCase().includes('web design') && (
            <div className="space-y-6">
              
              {/* Architecture Details */}
              <Card>
                <CardHeader className="pb-3 border-b border-zinc-900">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Website Architecture Spec</CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1">
                      <span className="block text-[9px] uppercase tracking-wider text-zinc-500 font-bold">Tech Stack</span>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {['Next.js', 'Vercel', 'TailwindCSS', 'Prisma', 'PostgreSQL'].map(t => (
                          <Badge key={t} variant="outline" className="rounded-none text-[9px]">
                            {t}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="block text-[9px] uppercase tracking-wider text-zinc-500 font-bold">Git Repository branch</span>
                      <div className="flex items-center gap-1.5 pt-1 text-zinc-300 font-mono">
                        <Code className="h-3.5 w-3.5 text-zinc-500" />
                        <span>github.com/apex/aether-dev (main)</span>
                        <ExternalLink className="h-3 w-3 text-zinc-550 hover:text-white cursor-pointer" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-1 border-t border-zinc-900 pt-3">
                    <span className="block text-[9px] uppercase tracking-wider text-zinc-500 font-bold">Staging Preview deployment</span>
                    <div className="flex items-center gap-1.5 pt-1 text-emerald-400 font-mono font-medium">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                      <span>https://aether-staging.vercel.app</span>
                      <ExternalLink className="h-3 w-3 text-emerald-500 hover:text-white cursor-pointer" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Lighthouse Audits */}
              <Card>
                <CardHeader className="pb-3 border-b border-zinc-900">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Lighthouse Performance Audits</CardTitle>
                  <CardDescription className="text-[10px] text-zinc-500">Live preview environment Vitals audit score.</CardDescription>
                </CardHeader>
                <CardContent className="pt-4 grid gap-4 grid-cols-4 text-center">
                  {[
                    { title: 'Performance', val: 98, color: 'text-emerald-400' },
                    { title: 'Accessibility', val: 96, color: 'text-emerald-400' },
                    { title: 'Best Practices', val: 92, color: 'text-emerald-400' },
                    { title: 'SEO Opt', val: 100, color: 'text-emerald-400' },
                  ].map((lh, idx) => (
                    <div key={idx} className="border border-zinc-900 p-3 space-y-2">
                      <div className={`text-xl font-bold font-mono ${lh.color}`}>{lh.val}</div>
                      <span className="block text-[9px] font-semibold text-zinc-550 uppercase tracking-wider">{lh.title}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

            </div>
          )}

          {/* SOCIAL MEDIA / SMM WIDGETS */}
          {client.agencyType?.toLowerCase().includes('social media') && (
            <div className="space-y-6">
              
              {/* Platform channels */}
              <Card>
                <CardHeader className="pb-3 border-b border-zinc-900">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Channels Managed</CardTitle>
                </CardHeader>
                <CardContent className="pt-4 grid gap-4 grid-cols-2">
                  <div className="flex items-center gap-3 p-3 border border-zinc-900 bg-zinc-950/20">
                    <Facebook className="h-5 w-5 text-zinc-400" />
                    <div>
                      <span className="block font-semibold text-white text-xs">Facebook Business Page</span>
                      <span className="text-[10px] text-zinc-550 block mt-0.5">3 posts scheduled per week</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 border border-zinc-900 bg-zinc-950/20">
                    <Instagram className="h-5 w-5 text-zinc-400" />
                    <div>
                      <span className="block font-semibold text-white text-xs">Instagram Account</span>
                      <span className="text-[10px] text-zinc-550 block mt-0.5">Active stories daily</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

            </div>
          )}

        </div>
      </div>

      {/* --- ADD TASK MODAL DIALOG --- */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-55 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 w-full max-w-md p-6 shadow-2xl relative">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Create Client Task</h3>
            
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Task Title *</label>
                <input
                  type="text"
                  required
                  placeholder="E.g. Setup landing page conversions"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  className="w-full text-xs bg-zinc-900 border border-zinc-800 focus:border-zinc-700 px-3 py-2 text-white outline-none rounded-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Task Description</label>
                <textarea
                  placeholder="Detail the deliverable details..."
                  rows={3}
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  className="w-full text-xs bg-zinc-900 border border-zinc-800 focus:border-zinc-700 p-2.5 text-white outline-none rounded-none"
                />
              </div>

              <div className="grid gap-4 grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Assign Staff</label>
                  <select
                    value={taskForm.assignedToId}
                    onChange={(e) => setTaskForm({ ...taskForm, assignedToId: e.target.value })}
                    className="w-full text-xs bg-zinc-900 border border-zinc-800 focus:border-zinc-700 px-3 py-2 text-white outline-none rounded-none"
                  >
                    <option value="">-- Unassigned --</option>
                    {teamMembers
                      .filter((t: any) => t.role?.toLowerCase() !== 'client')
                      .map(t => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Initial Status</label>
                  <select
                    value={taskForm.status}
                    onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value })}
                    className="w-full text-xs bg-zinc-900 border border-zinc-800 focus:border-zinc-700 px-3 py-2 text-white outline-none rounded-none"
                  >
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="BLOCKED">Blocked</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsTaskModalOpen(false)}
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
    </div>
  );
}
