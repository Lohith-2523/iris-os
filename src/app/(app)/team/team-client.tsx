'use client';

import * as React from 'react';
import { PageSkeleton } from '@/components/ui/page-skeletons';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
  UserCheck,
  Plus,
  Filter,
  X,
  Download,
  Upload,
  Sparkles,
  Trash2,
  AlertTriangle,
  Check,
  Loader2,
  Edit2,
  Activity,
  UserMinus
} from 'lucide-react';
import { validateBrowserFile } from '@/lib/file-security';
import { taskStatusLabel } from '@/lib/tasks/status-progress';
import { CountryPhoneInput } from '@/components/ui/country-phone-input';
import type { TeamReadModel } from '@/server/read-models/workspace-pages';
import { SECURITY_PAGE_OPTIONS } from '@/lib/security-pages';
import { workspaceRoleLabel } from '@/lib/workspace-role-label';
import { SubscriptionPlanDialog } from '@/components/billing/subscription-plan-dialog';
import { normalizePlan, type PlanId } from '@/lib/plan-entitlements';
import { useWorkspaceRuntime } from '@/components/demo/demo-mode-provider';
import { WORKSPACE_TEAM_PREVIEW_EVENT } from '@/lib/workspace-tour-config';

// --- EXISTING SPECIALISTS (NOT YET ALLOCATED IN MAIN ACTIVE LIST) ---
const MOCK_EXISTING_SPECIALISTS: any[] = [];
const isInternalTeamUser = (user: { role?: string }) => ['admin', 'member', 'sub_admin'].includes(user.role?.toLowerCase() || '');
const teamRoleLabel = (role?: string) => workspaceRoleLabel(role) || 'Team member';

export default function TeamClient({ initialData }: { initialData: TeamReadModel }) {
  const { fetch } = useWorkspaceRuntime();
  const [canManageTeam] = React.useState(initialData.workspace.user.role.toLowerCase() === 'admin');
  const [plan, setPlan] = React.useState<PlanId>(normalizePlan(initialData.workspace.organization.plan));
  const [teamUpgradePromptOpen, setTeamUpgradePromptOpen] = React.useState(false);
  // Main stateful active team list
  const [teamList, setTeamList] = React.useState<any[]>(initialData.team);
  const [isLoadingTeam] = React.useState(false);

  // Selected Member Task Panel Drawer States
  const [selectedMember, setSelectedMember] = React.useState<any | null>(null);
  const [memberTasks, setMemberTasks] = React.useState<any[]>([]);
  const [loadingMemberTasks, setLoadingMemberTasks] = React.useState(false);
  const [memberPendingOffboarding, setMemberPendingOffboarding] = React.useState<any | null>(null);
  const [offboardingFeedback, setOffboardingFeedback] = React.useState('');
  const [offboardingDataAcknowledged, setOffboardingDataAcknowledged] = React.useState(false);
  const [isOffboardingMember, setIsOffboardingMember] = React.useState(false);
  const [offboardingError, setOffboardingError] = React.useState('');
  const [teamNotice, setTeamNotice] = React.useState('');
  const [accessPermissions, setAccessPermissions] = React.useState<string[]>([]);
  const [memberHandlesDeliverables, setMemberHandlesDeliverables] = React.useState(false);
  const [savingAccess, setSavingAccess] = React.useState(false);
  const [accessError, setAccessError] = React.useState('');
  const [editingTaskId, setEditingTaskId] = React.useState<string | null>(null);
  const [taskEditForm, setTaskEditForm] = React.useState({
    status: 'TODO',
    progress: 0,
    blocker: '',
    update: ''
  });

  const fetchMemberTasks = React.useCallback(async (userId: string) => {
    setLoadingMemberTasks(true);
    try {
      const res = await fetch(`/api/tasks?assignedToId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setMemberTasks(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMemberTasks(false);
    }
  }, [fetch]);

  React.useEffect(() => {
    if (selectedMember) {
      fetchMemberTasks(selectedMember.id);
      setAccessPermissions(Array.isArray(selectedMember.accessPermissions) ? selectedMember.accessPermissions : []);
      setMemberHandlesDeliverables(Boolean(selectedMember.handlesDeliverables));
      setAccessError('');
    }
  }, [selectedMember, fetchMemberTasks]);

  const saveMemberAccess = async () => {
    if (!selectedMember || savingAccess) return;
    setSavingAccess(true);
    setAccessError('');
    try {
      const response = await fetch('/api/security/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_access',
          userId: selectedMember.id,
          permissions: accessPermissions,
          handlesDeliverables: memberHandlesDeliverables,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Unable to update team member access.');
      const updated = {
        ...selectedMember,
        role: payload.user?.role || (accessPermissions.length > 0 ? 'sub_admin' : 'member'),
        accessPermissions,
        handlesDeliverables: memberHandlesDeliverables,
        deliveryWorkspace: memberHandlesDeliverables || Boolean(selectedMember.projects),
      };
      setSelectedMember(updated);
      setTeamList((current) => current.map((member) => member.id === updated.id ? updated : member));
      setTeamNotice(`${updated.name}'s workspace access was updated.`);
    } catch (error) {
      setAccessError(error instanceof Error ? error.message : 'Unable to update team member access.');
    } finally {
      setSavingAccess(false);
    }
  };

  // Modal Dialog Open/Close States
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'single' | 'existing' | 'batch'>('single');

  // --- TAB 1: SINGLE USER FORM ---
  const [singleForm, setSingleForm] = React.useState({
    name: '',
    email: '',
    phone: '',
    role: 'Member Specialist',
    projects: ''
  });
  const [selectedPageAccess, setSelectedPageAccess] = React.useState<string[]>([]);
  const [handlesDeliverables, setHandlesDeliverables] = React.useState(false);
  const [selectedProjects, setSelectedProjects] = React.useState<string[]>([]);
  const [onboardSuccessData, setOnboardSuccessData] = React.useState<any>(null);
  const [availableProjects] = React.useState<any[]>(initialData.projects.filter((project) => project.status !== 'COMPLETED'));
  const [singleFormError, setSingleFormError] = React.useState('');

  React.useEffect(() => {
    const showTourView = (event: Event) => {
      const view = (event as CustomEvent<{ view?: 'overview' | 'add' }>).detail?.view;
      if (view === 'overview') setIsAddModalOpen(false);
      if (view === 'add') {
        setActiveTab('single');
        setIsAddModalOpen(true);
      }
    };
    window.addEventListener(WORKSPACE_TEAM_PREVIEW_EVENT, showTourView);
    return () => window.removeEventListener(WORKSPACE_TEAM_PREVIEW_EVENT, showTourView);
  }, []);

  // --- TAB 2: EXISTING SPECIALIST ---
  const [selectedExistingId, setSelectedExistingId] = React.useState('');
  const [existingForm, setExistingForm] = React.useState({
    role: '',
    projects: ''
  });
  const [existingError, setExistingError] = React.useState('');

  // --- TAB 3: BATCH IMPORT (CSV/XLSX) ---
  const [stagedUsers, setStagedUsers] = React.useState<any[]>([]);
  const [isTemplateAligned, setIsTemplateAligned] = React.useState<boolean | null>(null);
  const [isParsing, setIsParsing] = React.useState(false);
  const [uploadStatus, setUploadStatus] = React.useState<'idle' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = React.useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [showFilters, setShowFilters] = React.useState(false);
  const [roleFilter, setRoleFilter] = React.useState<string>('ALL');

  const roles = React.useMemo(() => {
    const allRoles = teamList.map(t => teamRoleLabel(t.role));
    return Array.from(new Set(allRoles));
  }, [teamList]);

  const filteredTeamList = React.useMemo(() => {
    return teamList.filter((t) => {
      if (!isInternalTeamUser(t)) {
        return false;
      }
      if (roleFilter !== 'ALL' && teamRoleLabel(t.role) !== roleFilter) {
        return false;
      }
      return true;
    });
  }, [teamList, roleFilter]);

  const clearSingleOnboardingDraft = () => {
    setSingleForm({ name: '', email: '', phone: '', role: 'Member Specialist', projects: '' });
    setSelectedPageAccess([]);
    setHandlesDeliverables(false);
    setSelectedProjects([]);
    setOnboardSuccessData(null);
    setSingleFormError('');
  };

  // Reset modal state variables on close
  const closeModal = () => {
    setIsAddModalOpen(false);
    setActiveTab('single');
    clearSingleOnboardingDraft();
    setSelectedExistingId('');
    setExistingForm({ role: '', projects: '' });
    setStagedUsers([]);
    setIsTemplateAligned(null);
    setUploadStatus('idle');
    setErrorMsg('');
    setExistingError('');
  };

  const validateSingleOnboarding = () => {
    setSingleFormError('');
    if (!singleForm.name || !singleForm.email) {
      return 'Name and Email ID are mandatory parameters.';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(singleForm.email)) {
      return 'Please enter a valid Email address.';
    }
    if (selectedPageAccess.length === 0 && !handlesDeliverables && selectedProjects.length === 0) {
      return 'Choose any page or enable the deliverables checkbox to create a workspace for this user.';
    }
    return null;
  };

  const inviteSingleMember = async () => {
    try {
      const res = await fetch('/api/member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'invite_member',
          name: singleForm.name,
          email: singleForm.email,
          phone: singleForm.phone,
          accessPermissions: selectedPageAccess,
          handlesDeliverables,
          projects: selectedProjects
        })
      });

      if (res.ok) {
        const data = await res.json();
        setOnboardSuccessData({
          token: data.invite.token,
          inviteUrl: data.inviteUrl,
          emailSent: Boolean(data.emailSent),
        });
        
        // Reload team list
        const teamRes = await fetch('/api/data?domain=team');
        if (teamRes.ok) {
          const freshTeam = await teamRes.json();
          setTeamList(freshTeam.filter(isInternalTeamUser));
        }
      } else {
        const err = await res.json();
        if (err.inviteCreated && err.inviteUrl) {
          setOnboardSuccessData({
            inviteUrl: err.inviteUrl,
            emailSent: false,
            emailError: err.error || 'Email provider error',
          });
          return;
        }
        setSingleFormError(err.error || 'Failed to onboard new specialist.');
      }
    } catch (e) {
      console.error(e);
      setSingleFormError('Network communication error.');
    }
  };

  // --- ADD SINGLE MEMBER HANDLER ---
  const handleAddSingle = (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateSingleOnboarding();
    if (validationError) {
      setSingleFormError(validationError);
      return;
    }
    if (plan === 'BASIC') {
      setTeamUpgradePromptOpen(true);
      return;
    }
    void inviteSingleMember();
  };

  // --- REASSIGN EXISTING MEMBER HANDLER ---
  React.useEffect(() => {
    const selected = MOCK_EXISTING_SPECIALISTS.find(s => s.id === selectedExistingId);
    if (selected) {
      setExistingForm({
        role: selected.role,
        projects: selected.projects
      });
    }
  }, [selectedExistingId]);

  const handleAddExisting = (e: React.FormEvent) => {
    e.preventDefault();
    setExistingError('');

    if (!selectedExistingId) {
      setExistingError('Please select an existing user.');
      return;
    }

    const specialist = MOCK_EXISTING_SPECIALISTS.find(s => s.id === selectedExistingId);
    if (!specialist) return;

    if (teamList.some(u => u.email.toLowerCase() === specialist.email.toLowerCase())) {
      setExistingError('This specialist has already been allocated to the active team list.');
      return;
    }

    const newMember = {
      id: String(teamList.length + 1),
      name: specialist.name,
      role: existingForm.role || specialist.role,
      projects: existingForm.projects || specialist.projects,
      status: 'EXCELLENT',
      email: specialist.email,
      phone: specialist.phone
    };

    setTeamList([...teamList, newMember]);
    closeModal();
  };

  // --- TEMPLATE DOWNLOAD HANDLERS ---
  const downloadCsvTemplate = () => {
    const csvContent = "IrisOS_Template_Identifier (DO NOT MODIFY),Full Name,Email ID,Phone Number,Role,Assigned Projects\n";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "irisos_team_template.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadXlsxTemplate = async () => {
    const XLSX = await import('xlsx');
    const data = [
      ["IrisOS_Template_Identifier (DO NOT MODIFY)", "Full Name", "Email ID", "Phone Number", "Role", "Assigned Projects"]
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "irisos_team_template.xlsx");
  };

  // --- BATCH FILE UPLOAD & AI PARSING HANDLERS ---
  const triggerAIAnalysis = async (rawText: string) => {
    setIsParsing(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/atlas-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'parse-team-file',
          query: rawText
        })
      });
      if (res.ok) {
        const data = await res.json();
        // Parse Miles AI returned array
        const parsedUsers = JSON.parse(data.result);
        if (Array.isArray(parsedUsers)) {
          setStagedUsers(parsedUsers.map((u: any) => ({
            name: u.name || 'Extracted Member',
            email: u.email || '',
            phone: u.phone || '',
            role: u.role || 'Specialist',
            projects: u.projects || 'None'
          })));
          setIsTemplateAligned(false);
          setUploadStatus('success');
        } else {
          throw new Error("Miles AI output could not be parsed into a list.");
        }
      } else {
        throw new Error("AI Routing Handler failed.");
      }
    } catch (e: any) {
      console.error(e);
      setErrorMsg("Miles AI could not parse the custom layout. Loaded local smart fallback users.");
      setStagedUsers([
        { name: 'Kunal Verma', email: 'kunal@apex.co', phone: '+91 99887 76655', role: 'Solutions Architect', projects: 'Integrations Phase 2' },
        { name: 'Aditi Sharma', email: 'aditi@apex.co', phone: '+91 99887 76644', role: 'UI/UX Specialist', projects: 'Canva Design Hub' }
      ]);
      setIsTemplateAligned(false);
      setUploadStatus('success');
    } finally {
      setIsParsing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg('');
    setUploadStatus('idle');
    setIsParsing(true);

    const validation = await validateBrowserFile(file, 'spreadsheet-import', { maxBytes: 5 * 1024 * 1024 });
    if (!validation.ok) {
      setErrorMsg(validation.error);
      setIsParsing(false);
      return;
    }
    const isCsv = file.name.toLowerCase().endsWith('.csv');
    try {
      if (isCsv) {
        const reader = new FileReader();
        reader.onload = async (event) => {
          const text = event.target?.result as string;
          const hasIdentifier = text.includes('IRIS_OS_USER_IMPORT_v1');

          if (hasIdentifier) {
            // Direct Aligned Parse
            const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
            const users = [];
            // Skip header
            for (let i = 1; i < lines.length; i++) {
              const cols = lines[i].split(',').map(c => c.trim());
              if (cols.length >= 6) {
                users.push({
                  name: cols[1] || 'Imported Member',
                  email: cols[2] || '',
                  phone: cols[3] || '',
                  role: cols[4] || 'Specialist',
                  projects: cols[5] || 'None'
                });
              }
            }
            setStagedUsers(users);
            setIsTemplateAligned(true);
            setUploadStatus('success');
            setIsParsing(false);
          } else {
            // Non-aligned: Ask Miles AI to parse
            await triggerAIAnalysis(text);
          }
        };
        reader.readAsText(file);
      } else {
        // XLSX
        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const XLSX = await import('xlsx');
            const data = new Uint8Array(event.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
            if (rows.length < 2) {
              setErrorMsg('The spreadsheet is empty.');
              setIsParsing(false);
              return;
            }

            let hasIdentifier = false;
            for (const r of rows) {
              if (r.some((c: any) => String(c).includes('IRIS_OS_USER_IMPORT_v1'))) {
                hasIdentifier = true;
                break;
              }
            }

            if (hasIdentifier) {
              const users = [];
              for (let i = 1; i < rows.length; i++) {
                const r = rows[i];
                if (r && r.length >= 6) {
                  users.push({
                    name: String(r[1] || 'Imported Member'),
                    email: String(r[2] || ''),
                    phone: String(r[3] || ''),
                    role: String(r[4] || 'Specialist'),
                    projects: String(r[5] || 'None')
                  });
                }
              }
              setStagedUsers(users);
              setIsTemplateAligned(true);
              setUploadStatus('success');
              setIsParsing(false);
            } else {
              // Convert worksheet rows to flat text layout description for Miles AI
              const textFormat = rows.map(r => r.join(', ')).join('\n');
              await triggerAIAnalysis(textFormat);
            }
          } catch (err: any) {
            console.error(err);
            setErrorMsg('Error loading spreadsheet sheets.');
            setIsParsing(false);
          }
        };
        reader.readAsArrayBuffer(file);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Failed to process file.');
      setIsParsing(false);
    }
  };

  // --- STAGING CHANGES PERSISTENCE ---
  const handleStagedChange = (idx: number, field: string, value: any) => {
    const updated = [...stagedUsers];
    updated[idx] = { ...updated[idx], [field]: value };
    setStagedUsers(updated);
  };

  const removeStagedUser = (idx: number) => {
    setStagedUsers(stagedUsers.filter((_, i) => i !== idx));
  };

  const handleImportStaged = () => {
    const validatedUsers = stagedUsers.map((u, i) => ({
      id: String(teamList.length + i + 1),
      name: u.name || 'Imported Specialist',
      role: u.role || 'Specialist',
      projects: u.projects || 'None',
      status: 'EXCELLENT',
      email: u.email || `imported-${i}@apex.co`,
      phone: u.phone || 'N/A'
    }));

    setTeamList([...teamList, ...validatedUsers]);
    closeModal();
  };

  const offboardMember = async () => {
    if (!memberPendingOffboarding || isOffboardingMember || offboardingFeedback.trim().length < 5 || !offboardingDataAcknowledged) return;
    setIsOffboardingMember(true);
    setOffboardingError('');
    try {
      const response = await fetch('/api/security/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'offboard', userId: memberPendingOffboarding.id, feedback: offboardingFeedback.trim(), deleteRelatedData: true }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Unable to offboard team member');
      setTeamList((current) => current.filter((member) => member.id !== memberPendingOffboarding.id));
      setSelectedMember(null);
      setMemberPendingOffboarding(null);
      setOffboardingFeedback('');
      setOffboardingDataAcknowledged(false);
      setTeamNotice(payload.emailSent ? 'Member offboarded, access revoked, and feedback email sent.' : 'Member offboarded and access revoked. The feedback email could not be delivered.');
    } catch (error) {
      setOffboardingError(error instanceof Error ? error.message : 'Unable to offboard team member');
    } finally {
      setIsOffboardingMember(false);
    }
  };

  if (isLoadingTeam) return <PageSkeleton variant="team" />;

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-zinc-800/60 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white silver-text-gradient">Team & Resource Management</h1>
          <p className="text-xs text-zinc-500">Manage team members, project assignments, and delivery responsibilities.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "h-8 border-zinc-800 text-zinc-300 gap-1.5 rounded-md cursor-pointer",
              showFilters && "bg-zinc-800 text-white border-zinc-700"
            )}
          >
            <Filter className="h-3.5 w-3.5" />
            <span>Filter Team</span>
          </Button>
          {canManageTeam && <Button
            data-tour="add-team-member"
            variant="default"
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            className="h-8 gap-1.5 font-semibold rounded-md bg-white text-zinc-950 hover:bg-zinc-200"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Member</span>
          </Button>}
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card hoverEffect className="rounded-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Total Headcount</CardTitle>
            <UserCheck className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight text-white">{teamList.length} Members</div>
            <div className="flex items-center gap-1.5 mt-2 text-[10px] text-zinc-500 font-medium">
              <span>Full-time in-house team</span>
            </div>
          </CardContent>
        </Card>

      </div>

      {teamNotice && <div role="status" className="flex items-center justify-between rounded-xl border border-zinc-700 bg-zinc-900/50 p-4 text-zinc-200"><span>{teamNotice}</span><button type="button" onClick={() => setTeamNotice('')} aria-label="Dismiss team update"><X className="h-4 w-4" /></button></div>}

      {/* Filters Control Panel */}
      {showFilters && (
        <div className="flex flex-wrap gap-4 p-4 border border-zinc-850 bg-zinc-950/40 rounded-md text-xs font-sans">
          <div className="space-y-1.5">
            <label className="font-semibold text-zinc-400 block uppercase tracking-wider text-[9px]">Role / Title</label>
            <select 
              value={roleFilter} 
              onChange={(e) => setRoleFilter(e.target.value)}
              className="rounded border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-white focus:outline-none cursor-pointer text-xs"
            >
              <option value="ALL">All Roles</option>
              {roles.map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            {roleFilter !== 'ALL' && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setRoleFilter('ALL')}
                className="text-zinc-400 hover:text-white h-[32px] font-medium"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Main Grid Split */}
      <div>
        {/* Team Table */}
        <div className="space-y-4">
          <Card className="rounded-md">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-white">Resource Allocation Matrix</CardTitle>
              <CardDescription>Workload statistics and project assignments for internal staff.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Team Member</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Assigned Projects</TableHead>
                    <TableHead className="text-right">Tasks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTeamList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-zinc-500">
                        No team members registered.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTeamList.map((t) => (
                      <TableRow 
                        key={t.id} 
                      className="cursor-pointer hover:bg-zinc-900/30 transition-colors"
                      onClick={() => {
                        setSelectedMember(t);
                        setEditingTaskId(null);
                      }}
                    >
                      <TableCell className="font-semibold text-white">
                        <div>
                          <span>{t.name}</span>
                          <span className="block text-[9px] text-zinc-500 font-normal mt-0.5">{t.phone}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-[10px] text-zinc-400">{t.email}</TableCell>
                      <TableCell>{teamRoleLabel(t.role)}</TableCell>
                      <TableCell className="text-zinc-400 max-w-[160px] truncate">{t.projects}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedMember(t);
                            setEditingTaskId(null);
                          }}
                          className="h-7 border-zinc-700 bg-zinc-900 px-2.5 text-[10px] font-semibold text-zinc-200 hover:bg-zinc-800 hover:text-white"
                        >
                          View tasks
                        </Button>
                      </TableCell>
                    </TableRow>
                  )))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

      </div>

      {/* --- ADD MEMBER SLIDE OVER / MODAL DIALOG --- */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div data-tour="team-member-form" className="bg-zinc-950 border border-zinc-800 w-full max-w-4xl max-h-[90vh] flex flex-col rounded-lg shadow-2xl relative">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-900">
              <div>
                <h2 className="text-lg font-bold text-white uppercase tracking-wider font-heading">Add Team Member</h2>
                <p className="text-[11px] text-zinc-500">Choose their workspace, page access, and initial project assignments.</p>
              </div>
              <button 
                onClick={closeModal}
                className="text-zinc-500 hover:text-white border border-zinc-900 hover:border-zinc-800 p-1.5 transition-colors cursor-pointer rounded-md"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Modal Tab Headers */}
            <div className="flex w-full min-w-0 overflow-x-auto overscroll-x-contain border-b border-zinc-900 bg-zinc-950/40 scrollbar-none">
              <button
                onClick={() => { setActiveTab('single'); setErrorMsg(''); }}
                className={cn(
                  "min-w-max shrink-0 whitespace-nowrap border-b-2 px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer sm:min-w-0 sm:flex-1",
                  activeTab === 'single' ? "border-white text-white bg-zinc-900/30" : "border-transparent text-zinc-500 hover:text-zinc-300"
                )}
              >
                Create New Profile
              </button>
              <button
                onClick={() => { setActiveTab('existing'); setErrorMsg(''); }}
                className={cn(
                  "min-w-max shrink-0 whitespace-nowrap border-b-2 px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer sm:min-w-0 sm:flex-1",
                  activeTab === 'existing' ? "border-white text-white bg-zinc-900/30" : "border-transparent text-zinc-500 hover:text-zinc-300"
                )}
              >
                Allocate Existing Specialist
              </button>
              <button
                onClick={() => { setActiveTab('batch'); setErrorMsg(''); }}
                className={cn(
                  "min-w-max shrink-0 whitespace-nowrap border-b-2 px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer sm:min-w-0 sm:flex-1",
                  activeTab === 'batch' ? "border-white text-white bg-zinc-900/30" : "border-transparent text-zinc-500 hover:text-zinc-300"
                )}
              >
                Batch File Import
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* TAB 1: SINGLE PROFILE */}
              {activeTab === 'single' && (
                onboardSuccessData ? (
                  <div className="space-y-4 animate-fadeIn">
                    <div className="bg-emerald-950/30 border border-emerald-900/50 p-4 rounded text-xs space-y-3">
                      <div className="flex items-center gap-2 text-emerald-400 font-bold">
                        <Check className="h-5 w-5" />
                        <span>Team Member Added Successfully!</span>
                      </div>
                      <p className="text-zinc-400">
                        {onboardSuccessData.emailSent
                          ? 'The secure onboarding invitation was sent from noreply@irisos.app.'
                          : `The invitation was created, but email delivery failed: ${onboardSuccessData.emailError}`}
                      </p>
                    </div>

                    <div className="flex justify-between items-center pt-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          readOnly
                          value={onboardSuccessData.inviteUrl}
                          className="bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-[10px] font-mono text-zinc-450 w-[320px] outline-none"
                        />
                        <Button
                          onClick={() => {
                            navigator.clipboard.writeText(onboardSuccessData.inviteUrl);
                            alert('Onboarding link copied to clipboard!');
                          }}
                          className="bg-zinc-800 hover:bg-zinc-700 text-white text-[10px] px-3 font-semibold"
                        >
                          Copy Link
                        </Button>
                      </div>
                      <Button
                        onClick={closeModal}
                        className="bg-white text-zinc-950 hover:bg-zinc-200 text-xs font-semibold px-4"
                      >
                        Close
                      </Button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleAddSingle} className="space-y-4">
                    {singleFormError && (
                      <div className="bg-rose-950/30 border border-rose-900/50 p-3 flex items-center gap-2 text-xs text-rose-400">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <span>{singleFormError}</span>
                      </div>
                    )}

                    {/* Basic Details: Name, Email, Phone */}
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">Full Name <span className="text-rose-500" aria-hidden="true">*</span></label>
                        <input
                          type="text"
                          required
                          value={singleForm.name}
                          onChange={(e) => setSingleForm({ ...singleForm, name: e.target.value })}
                          placeholder="e.g. Vikram Patel"
                          className="w-full text-xs bg-zinc-900 border border-zinc-800 focus:border-zinc-700 px-3 py-2 text-white outline-none rounded-md font-mono"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">Email Address <span className="text-rose-500" aria-hidden="true">*</span></label>
                        <input
                          type="email"
                          required
                          value={singleForm.email}
                          onChange={(e) => setSingleForm({ ...singleForm, email: e.target.value })}
                          placeholder="e.g. vikram@apex.co"
                          className="w-full text-xs bg-zinc-900 border border-zinc-800 focus:border-zinc-700 px-3 py-2 text-white outline-none rounded-md font-mono"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">Phone Number</label>
                        <CountryPhoneInput required value={singleForm.phone} onChange={(phone) => setSingleForm({ ...singleForm, phone })} />
                      </div>
                    </div>

                    {/* Individual page access */}
                    <div className="space-y-2 border-t border-zinc-900 pt-3">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">
                        Page access
                      </label>
                      <p className="text-[10px] text-zinc-600">Selected pages appear alongside the standard team workspace when this person handles delivery work.</p>
                      <div className="grid gap-2.5 sm:grid-cols-2">
                        {SECURITY_PAGE_OPTIONS.map((page) => {
                          const isChecked = selectedPageAccess.includes(page.id);
                          return (
                            <label
                              key={page.id}
                              className={`flex items-center gap-2.5 p-2.5 border transition-all cursor-pointer rounded-md select-none text-[11px] ${
                                isChecked 
                                  ? 'bg-zinc-900 border-zinc-700 text-white' 
                                  : 'bg-zinc-950/20 border-zinc-900 text-zinc-500 hover:border-zinc-800'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedPageAccess([...selectedPageAccess, page.id]);
                                  } else {
                                    setSelectedPageAccess(selectedPageAccess.filter((id) => id !== page.id));
                                  }
                                }}
                                className="h-3.5 w-3.5 accent-white cursor-pointer"
                              />
                              <span>{page.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-2 border-t border-zinc-900 pt-3">
                      <label data-tour="handles-deliverables" className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors ${handlesDeliverables ? 'border-zinc-700 bg-zinc-900 text-white' : 'border-zinc-900 text-zinc-400'}`}>
                        <input type="checkbox" checked={handlesDeliverables} onChange={(event) => setHandlesDeliverables(event.target.checked)} className="mt-0.5 h-4 w-4 accent-white" />
                        <span><span className="block text-xs font-semibold">Handles Deliverables</span><span className="mt-1 block text-[10px] text-zinc-500">Creates a standard team workspace for tasks, updates, calendar, and delivery management.</span></span>
                      </label>
                    </div>

                    {/* Project Allocation checkboxes */}
                    <div data-tour="member-projects" className="space-y-2 border-t border-zinc-900 pt-3">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">
                        Assign team member to active projects
                      </label>
                      <div className="grid gap-2 sm:grid-cols-3 max-h-[120px] overflow-y-auto pr-1">
                        {availableProjects.map((proj) => {
                          const isChecked = selectedProjects.includes(proj.id);
                          return (
                            <label
                              key={proj.id}
                              className={`flex items-center gap-2 p-2 border transition-all cursor-pointer select-none text-[10px] rounded-md ${
                                isChecked 
                                  ? 'bg-zinc-900 border-zinc-700 text-white' 
                                  : 'bg-zinc-950/10 border-zinc-900 text-zinc-500 hover:border-zinc-850'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedProjects([...selectedProjects, proj.id]);
                                  } else {
                                    setSelectedProjects(selectedProjects.filter(p => p !== proj.id));
                                  }
                                }}
                                className="h-3.5 w-3.5 accent-white cursor-pointer"
                              />
                              <span className="truncate">{proj.name}</span>
                            </label>
                          );
                        })}
                        {availableProjects.length === 0 && (
                          <span className="text-zinc-600 italic block text-[10px] py-1">No active projects available.</span>
                        )}
                      </div>
                    </div>

                    <div className="pt-4 flex justify-end">
                      <Button 
                        type="submit" 
                        className="bg-white text-zinc-950 hover:bg-zinc-200 rounded-md text-xs font-semibold px-6 cursor-pointer"
                      >
                        Onboard Team member
                      </Button>
                    </div>
                  </form>
                )
              )}

              {/* TAB 2: EXISITING SPECIALIST ALLOCATION */}
              {activeTab === 'existing' && (
                <form onSubmit={handleAddExisting} className="space-y-4">
                  {existingError && (
                    <div className="bg-rose-950/30 border border-rose-900/50 p-3 flex items-center gap-2 text-xs text-rose-400">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span>{existingError}</span>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Select Specialist <span className="text-rose-500" aria-hidden="true">*</span></label>
                    <select
                      required
                      value={selectedExistingId}
                      onChange={(e) => setSelectedExistingId(e.target.value)}
                      className="w-full text-xs bg-zinc-900 border border-zinc-800 focus:border-zinc-700 px-3 py-2 text-white outline-none rounded-md font-sans"
                    >
                      <option value="">-- Choose Specialist Profile --</option>
                      {MOCK_EXISTING_SPECIALISTS.map(spec => (
                        <option key={spec.id} value={spec.id}>
                          {spec.name} ({spec.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedExistingId && (
                    <div className="space-y-4 border-t border-zinc-900 pt-4 mt-2">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Assign Role</label>
                          <input
                            type="text"
                            value={existingForm.role}
                            onChange={(e) => setExistingForm({ ...existingForm, role: e.target.value })}
                            className="w-full text-xs bg-zinc-900 border border-zinc-800 focus:border-zinc-700 px-3 py-2 text-white outline-none rounded-md font-mono"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Assigned Projects</label>
                          <input
                            type="text"
                            value={existingForm.projects}
                            onChange={(e) => setExistingForm({ ...existingForm, projects: e.target.value })}
                            className="w-full text-xs bg-zinc-900 border border-zinc-800 focus:border-zinc-700 px-3 py-2 text-white outline-none rounded-md font-mono"
                          />
                        </div>
                      </div>

                    </div>
                  )}

                  <div className="pt-4 flex justify-end">
                    <Button 
                      type="submit"
                      disabled={!selectedExistingId}
                      className="bg-white text-zinc-950 hover:bg-zinc-200 rounded-md text-xs font-semibold px-6 disabled:opacity-50"
                    >
                      Re-allocate Active Specialist
                    </Button>
                  </div>
                </form>
              )}

              {/* TAB 3: BATCH FILE IMPORT */}
              {activeTab === 'batch' && (
                <div className="space-y-6">
                  {/* Template download header row */}
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between bg-zinc-950/40 p-4 border border-zinc-900 rounded-md">
                    <div>
                      <span className="block text-xs font-bold text-white uppercase tracking-wider">Download Imports System Template</span>
                      <span className="text-[10px] text-zinc-500 mt-1 block">Templates contain unique headers required for aligned imports.</span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={downloadCsvTemplate}
                        className="h-8 text-[10px] font-semibold uppercase tracking-wider rounded-md gap-1 border-zinc-800"
                      >
                        <Download className="h-3 w-3" />
                        <span>CSV Template</span>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={downloadXlsxTemplate}
                        className="h-8 text-[10px] font-semibold uppercase tracking-wider rounded-md gap-1 border-zinc-800"
                      >
                        <Download className="h-3 w-3" />
                        <span>XLSX Template</span>
                      </Button>
                    </div>
                  </div>

                  {/* File Upload Drop Area */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Upload Spreadsheet</label>
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border border-dashed border-zinc-850 bg-zinc-950/20 hover:bg-zinc-950/50 hover:border-zinc-800 p-8 text-center cursor-pointer rounded-md transition-all flex flex-col items-center justify-center gap-2 group"
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept=".csv,.xlsx"
                        className="hidden"
                      />
                      <Upload className="h-8 w-8 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
                      <div>
                        <span className="block text-xs font-semibold text-zinc-300">Drag & drop or click to upload CSV/XLSX</span>
                        <span className="text-[10px] text-zinc-500 block mt-1">Accepts CSV or Excel spreadsheets up to 5MB.</span>
                      </div>
                    </div>
                  </div>

                  {/* Status Indicator Alerts */}
                  {isParsing && (
                    <div className="bg-zinc-950 border border-zinc-900 p-4 text-xs text-zinc-400 flex items-center justify-between rounded-md animate-pulse">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 text-white animate-spin" />
                        <span>Analyzing layout format. Running Miles AI extraction pipelines...</span>
                      </div>
                      <Badge variant="outline" className="text-[9px] bg-zinc-900 border-zinc-800 text-zinc-400 rounded-md uppercase">
                        AI Processing
                      </Badge>
                    </div>
                  )}

                  {errorMsg && (
                    <div className="team-alert-danger bg-rose-950/30 border border-rose-900/50 p-3 flex items-center gap-2 text-xs text-rose-400 rounded-md">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  {uploadStatus === 'success' && stagedUsers.length > 0 && (
                    <div className="space-y-4">
                      {/* Alignment Badge Alert */}
                      <div className={cn(
                        "p-3.5 border text-xs flex items-center justify-between rounded-md",
                        isTemplateAligned
                          ? "team-alert-success bg-emerald-950/30 border-emerald-900/50 text-emerald-400"
                          : "team-alert-warning bg-amber-950/30 border-amber-900/50 text-amber-400"
                      )}>
                        <div className="flex items-center gap-2.5">
                          {isTemplateAligned ? <Check className="h-4.5 w-4.5" /> : <Sparkles className="h-4.5 w-4.5" />}
                          <div>
                            <span className="font-bold uppercase tracking-wider block">
                              {isTemplateAligned ? 'Standard Template Identified' : 'Miles AI Extraction Complete'}
                            </span>
                            <span className="text-[10px] block mt-0.5 opacity-80">
                              {isTemplateAligned
                                ? `Imported file matched headers. Extracted ${stagedUsers.length} specialists directly.`
                                : `Miles AI parsed custom columns. Extracted ${stagedUsers.length} specialists. Please review details below.`}
                            </span>
                          </div>
                        </div>
                        <Badge variant={isTemplateAligned ? "risk-low" : "default"} className="text-[9px] uppercase rounded-md tracking-wider">
                          {isTemplateAligned ? 'Aligned' : 'AI Extracted'}
                        </Badge>
                      </div>

                      {/* Staging Preview Table (Fully Editable) */}
                      <div className="border border-zinc-900 bg-zinc-950 rounded-md overflow-hidden">
                        <div className="px-4 py-3 border-b border-zinc-900 flex justify-between items-center">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Extracted Specialists Review Table</span>
                          <span className="text-[9px] text-zinc-500 font-semibold font-mono">Editable Staging List</span>
                        </div>
                        <div className="overflow-x-auto max-h-[300px]">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-1/4">Name</TableHead>
                                <TableHead className="w-1/4">Email</TableHead>
                                <TableHead className="min-w-[260px]">Phone</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead className="w-[120px]">Projects</TableHead>
                                <TableHead className="text-right w-12"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {stagedUsers.map((user, idx) => (
                                <TableRow key={idx}>
                                  <TableCell className="p-2">
                                    <input
                                      type="text"
                                      value={user.name}
                                      onChange={(e) => handleStagedChange(idx, 'name', e.target.value)}
                                      className="w-full text-xs bg-zinc-900 border border-zinc-800 px-2 py-1 text-white outline-none rounded-md font-sans font-semibold"
                                    />
                                  </TableCell>
                                  <TableCell className="p-2">
                                    <input
                                      type="email"
                                      value={user.email}
                                      onChange={(e) => handleStagedChange(idx, 'email', e.target.value)}
                                      className="w-full text-xs bg-zinc-900 border border-zinc-800 px-2 py-1 text-zinc-300 outline-none rounded-md font-mono"
                                    />
                                  </TableCell>
                                  <TableCell className="p-2">
                                    <CountryPhoneInput required value={user.phone} onChange={(phone) => handleStagedChange(idx, 'phone', phone)} />
                                  </TableCell>
                                  <TableCell className="p-2">
                                    <input
                                      type="text"
                                      value={user.role}
                                      onChange={(e) => handleStagedChange(idx, 'role', e.target.value)}
                                      className="w-full text-xs bg-zinc-900 border border-zinc-800 px-2 py-1 text-zinc-300 outline-none rounded-md font-sans"
                                    />
                                  </TableCell>
                                  <TableCell className="p-2">
                                    <input
                                      type="text"
                                      value={user.projects}
                                      onChange={(e) => handleStagedChange(idx, 'projects', e.target.value)}
                                      className="w-full text-xs bg-zinc-900 border border-zinc-800 px-2 py-1 text-zinc-300 outline-none rounded-md font-sans"
                                    />
                                  </TableCell>
                                  <TableCell className="p-2 text-right">
                                    <button
                                      type="button"
                                      onClick={() => removeStagedUser(idx)}
                                      className="text-zinc-500 hover:text-rose-400 p-1 border border-transparent hover:border-zinc-900 transition-colors rounded-md"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>

                      {/* Add staged buttons */}
                      <div className="pt-2 flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setStagedUsers([])}
                          className="rounded-md text-xs text-zinc-500 hover:text-white"
                        >
                          Clear Import
                        </Button>
                        <Button
                          type="button"
                          onClick={handleImportStaged}
                          className="bg-white text-zinc-950 hover:bg-zinc-200 rounded-md text-xs font-semibold px-6 flex items-center gap-1.5"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Import Allocated Specialists ({stagedUsers.length})</span>
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* --- DETAIL MEMBER TASK DRAWER --- */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex justify-end">
          {/* Click outside to close */}
          <div className="flex-1" onClick={() => setSelectedMember(null)} />
          
          <div className="w-full max-w-md bg-[#09090b] border-l border-zinc-800 p-6 flex flex-col h-full overflow-y-auto animate-slideIn">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-4 mb-4">
              <div>
                <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest font-mono">Team Member Workspace</span>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mt-0.5">{selectedMember.name} Tasks</h3>
                <span className="text-[10px] text-zinc-550 block font-mono">{teamRoleLabel(selectedMember.role)} | {selectedMember.email}</span>
              </div>
              <button
                onClick={() => setSelectedMember(null)}
                className="text-zinc-500 hover:text-white border border-zinc-900 hover:border-zinc-800 p-1.5 transition-colors cursor-pointer rounded-md"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Task list inside drawer */}
            <div className="flex-1 space-y-4">
              <span className="block font-bold text-zinc-500 uppercase tracking-wider text-[9px] mb-2">Active Task List</span>
              
              {loadingMemberTasks ? (
                <div className="p-8 text-center text-zinc-500 flex items-center justify-center gap-2">
                  <Loader2 className="h-4.5 w-4.5 animate-spin" />
                  <span>Loading specialist tasks...</span>
                </div>
              ) : memberTasks.length === 0 ? (
                <div className="p-8 border border-dashed border-zinc-900 text-center text-zinc-650 italic rounded-md">
                  No tasks assigned to this specialist.
                </div>
              ) : (
                <div className="space-y-3">
                  {memberTasks.map((task) => {
                    const isEditing = editingTaskId === task.id;
                    return (
                      <div key={task.id} className="border border-zinc-900 bg-zinc-950/20 p-4 space-y-3 rounded-md">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block font-sans">{task.client?.name}</span>
                            <span className="font-semibold text-white block mt-0.5">{task.title}</span>
                            {task.description && <span className="text-[10px] text-zinc-500 mt-1 block">{task.description}</span>}
                          </div>
                          
                          <div className="flex items-center gap-1.5 shrink-0">
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
                              className="rounded-md uppercase tracking-wider text-[8px]"
                            >
                              {taskStatusLabel(task.status)}
                            </Badge>
                            {!isEditing && (
                              <button
                                onClick={() => {
                                  setEditingTaskId(task.id);
                                  setTaskEditForm({
                                    status: task.status,
                                    progress: task.progress,
                                    blocker: task.blocker || '',
                                    update: task.update || ''
                                  });
                                }}
                                className="text-zinc-500 hover:text-white p-1 border border-zinc-900 hover:border-zinc-800 transition-colors cursor-pointer rounded-md"
                              >
                                <Edit2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[9px] text-zinc-550">
                            <span>Task Progress</span>
                            <span>{task.progress}%</span>
                          </div>
                          <div className="h-1.5 bg-zinc-900 overflow-hidden rounded-full">
                            <div
                              style={{ width: `${task.progress}%` }}
                              className={`h-full rounded-full ${
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
                          <div className="border border-zinc-850 bg-zinc-900 p-3 space-y-3 text-xs rounded-md">
                            <div className="grid gap-2 grid-cols-2">
                              <div className="space-y-1">
                                <label className="text-[9px] uppercase tracking-wider text-zinc-500">Status</label>
                                <select
                                  value={taskEditForm.status}
                                  onChange={(e) => setTaskEditForm(prev => ({ ...prev, status: e.target.value }))}
                                  className="w-full text-[10px] bg-zinc-900 border border-zinc-800 p-1 text-white outline-none rounded-md"
                                >
                                  <option value="TODO">TO-DO</option>
                                  <option value="IN_PROGRESS">In Progress</option>
                                  <option value="COMPLETED">Completed</option>
                                  <option value="BLOCKED">Blocked</option>
                                </select>
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] uppercase tracking-wider text-zinc-500">Progress ({taskEditForm.progress}%)</label>
                                <input
                                  type="range"
                                  min="0"
                                  max="100"
                                  step="5"
                                  value={taskEditForm.progress}
                                  onChange={(e) => setTaskEditForm(prev => ({ ...prev, progress: Number(e.target.value) }))}
                                  className="w-full bg-zinc-800 h-1 accent-white"
                                />
                              </div>
                            </div>
                            
                            {taskEditForm.status === 'BLOCKED' && (
                              <div className="space-y-1">
                                <label className="text-[9px] uppercase tracking-wider text-rose-450 font-semibold block">Blocker Note</label>
                                <input
                                  type="text"
                                  placeholder="Describe the blocker..."
                                  value={taskEditForm.blocker}
                                  onChange={(e) => setTaskEditForm(prev => ({ ...prev, blocker: e.target.value }))}
                                  className="w-full text-[10px] bg-zinc-900 border border-zinc-800 px-2 py-1 text-white outline-none rounded-md"
                                />
                              </div>
                            )}

                            <div className="space-y-1">
                              <label className="text-[9px] uppercase tracking-wider text-zinc-500 block">Recent Update</label>
                              <input
                                  type="text"
                                  placeholder="Log progress update..."
                                  value={taskEditForm.update}
                                  onChange={(e) => setTaskEditForm(prev => ({ ...prev, update: e.target.value }))}
                                  className="w-full text-[10px] bg-zinc-900 border border-zinc-800 px-2 py-1 text-white outline-none rounded-md"
                              />
                            </div>

                            <div className="flex justify-end gap-1.5 pt-1">
                              <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setEditingTaskId(null)}
                                className="h-6 text-[9px] rounded-md px-2 text-zinc-500 hover:text-white"
                              >
                                Cancel
                              </Button>
                              <Button
                                type="button"
                                onClick={async () => {
                                  try {
                                    const res = await fetch('/api/tasks', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({
                                        action: 'update_task',
                                        id: task.id,
                                        expectedUpdatedAt: task.updatedAt,
                                        status: taskEditForm.status,
                                        progress: taskEditForm.progress,
                                        blocker: taskEditForm.blocker,
                                        update: taskEditForm.update
                                      })
                                    });
                                    if (res.ok) {
                                      setEditingTaskId(null);
                                      fetchMemberTasks(selectedMember.id);
                                    }
                                  } catch (e) {
                                    console.error(e);
                                  }
                                }}
                                className="h-6 text-[9px] rounded-md px-3 bg-white text-zinc-950 hover:bg-zinc-200"
                              >
                                Save Updates
                              </Button>
                            </div>
                          </div>
                        )}

                        {!isEditing && task.status === 'BLOCKED' && task.blocker && (
                          <div className="bg-rose-950/10 border border-rose-900/40 p-2 text-[10px] text-rose-500 flex items-start gap-1.5 rounded-md">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                            <span><strong>Blocker:</strong> {task.blocker}</span>
                          </div>
                        )}
                        {!isEditing && task.update && (
                          <div className="bg-zinc-900 p-2 text-[10px] text-zinc-400 border border-zinc-800 flex items-start gap-1.5 rounded-md">
                            <Activity className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                            <span><strong>Latest Update:</strong> {task.update}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            {canManageTeam && selectedMember.role?.toLowerCase() !== 'admin' && (
              <div className="mt-5 space-y-4 border-t border-zinc-900 pt-4">
                {plan !== 'BASIC' && (
                  <div className="space-y-3 rounded-md border border-zinc-850 bg-zinc-950/40 p-4">
                    <div><h4 className="text-xs font-semibold text-white">Workspace access</h4><p className="mt-1 text-[10px] text-zinc-500">Delivery work opens the team workspace. Otherwise, this member sees a business workspace containing only selected pages.</p></div>
                    <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-zinc-200"><input type="checkbox" checked={memberHandlesDeliverables} onChange={(event) => setMemberHandlesDeliverables(event.target.checked)} className="h-4 w-4 accent-white" />Handles Deliverables</label>
                    <div className="grid grid-cols-2 gap-2">
                      {SECURITY_PAGE_OPTIONS.map((page) => (
                        <label key={page.id} className="flex cursor-pointer items-center gap-2 rounded border border-zinc-850 px-2.5 py-2 text-[10px] text-zinc-400">
                          <input type="checkbox" checked={accessPermissions.includes(page.id)} onChange={(event) => setAccessPermissions((current) => event.target.checked ? [...current, page.id] : current.filter((id) => id !== page.id))} className="h-3.5 w-3.5 accent-white" />
                          {page.label}
                        </label>
                      ))}
                    </div>
                    {selectedMember.projects && !memberHandlesDeliverables && <p className="text-[10px] text-amber-400">This member remains in the team workspace while assigned to an ongoing project.</p>}
                    {accessError && <div role="alert" className="text-[10px] text-rose-400">{accessError}</div>}
                    <Button type="button" disabled={savingAccess} onClick={() => void saveMemberAccess()} className="w-full text-xs">{savingAccess ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Save workspace access</Button>
                  </div>
                )}
                <Button type="button" variant="ghost" className="w-full text-rose-300 hover:bg-rose-950/20 hover:text-rose-200" onClick={() => { setOffboardingFeedback(''); setOffboardingDataAcknowledged(false); setOffboardingError(''); setMemberPendingOffboarding(selectedMember); }}>
                  <UserMinus className="mr-2 h-4 w-4" /> Offboard & revoke access
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {memberPendingOffboarding && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-black/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="offboard-member-title">
          <Card className="w-full max-w-xl border-rose-900/40 bg-zinc-950 shadow-2xl">
            <CardHeader>
              <CardTitle id="offboard-member-title">Offboard {memberPendingOffboarding.name}</CardTitle>
              <CardDescription>The member will immediately lose access. Their assigned tasks, project assignments, messages, chats, chat history, files, and all other related data will be permanently deleted. This feedback will be emailed to them.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <textarea required value={offboardingFeedback} onChange={(event) => setOffboardingFeedback(event.target.value)} placeholder="Provide clear offboarding feedback and handover notes" className="min-h-36 w-full rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-white outline-none focus:border-zinc-600" />
              <div className="flex items-center justify-between gap-3"><span className="text-zinc-500">Minimum 5 characters</span><span className="font-mono text-zinc-500">{offboardingFeedback.trim().length}</span></div>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 text-sm text-zinc-300">
                <input type="checkbox" checked={offboardingDataAcknowledged} onChange={(event) => setOffboardingDataAcknowledged(event.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-white" />
                <span>Delete all data related to this team member, including their access, messages, chats, and chat history.</span>
              </label>
              {offboardingError && <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-rose-200">{offboardingError}</div>}
              <div className="flex justify-end gap-3">
                <Button type="button" variant="ghost" disabled={isOffboardingMember} onClick={() => { setMemberPendingOffboarding(null); setOffboardingDataAcknowledged(false); }}>Cancel</Button>
                <Button type="button" disabled={isOffboardingMember || offboardingFeedback.trim().length < 5 || !offboardingDataAcknowledged} className="bg-rose-700 text-white hover:bg-rose-600" onClick={() => void offboardMember()}>
                  {isOffboardingMember ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Revoking access…</> : <><UserMinus className="mr-2 h-4 w-4" />Confirm offboarding</>}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      <SubscriptionPlanDialog
        open={teamUpgradePromptOpen}
        currentPlan={plan}
        feature="team member onboarding"
        requiredPlan="PRO"
        canManage={canManageTeam}
        onClose={() => {
          setTeamUpgradePromptOpen(false);
          closeModal();
        }}
        onPlanChanged={(nextPlan) => {
          setPlan(nextPlan);
          setTeamUpgradePromptOpen(false);
          void inviteSingleMember();
        }}
      />
    </div>
  );
}
