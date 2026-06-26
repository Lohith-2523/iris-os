'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { InsightPanel } from '@/components/ui/insight-panel';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { cn, formatUserMessage } from '@/lib/utils';
import {
  UserCheck,
  Zap,
  Plus,
  Filter,
  X,
  Download,
  Upload,
  Sparkles,
  Trash2,
  AlertTriangle,
  FileSpreadsheet,
  Check,
  Loader2
} from 'lucide-react';
import * as XLSX from 'xlsx';

// --- EXISTING SPECIALISTS (NOT YET ALLOCATED IN MAIN ACTIVE LIST) ---
const MOCK_EXISTING_SPECIALISTS = [
  { id: 'ext-1', name: 'Vikram Patel', email: 'vikram@apex.co', phone: '+91 98765 43210', role: 'Solutions Architect', utilization: 80, projects: 'Integrations Phase 2' },
  { id: 'ext-2', name: 'Aditi Sharma', email: 'aditi@apex.co', phone: '+91 99887 76655', role: 'UI/UX Specialist', utilization: 75, projects: 'Canva Design Hub' },
  { id: 'ext-3', name: 'Aravind Nair', email: 'aravind@apex.co', phone: '+91 99887 76633', role: 'Systems Engineer', utilization: 70, projects: 'Automations Infra' }
];

export default function TeamPage() {
  // Main stateful active team list
  const [teamList, setTeamList] = React.useState([
    { id: '1', name: 'Lohith Kumar', role: 'Executive CEO', projects: 'All Accounts', utilization: 90, status: 'EXCELLENT', email: 'lohith@apex.co', phone: '+123456789' },
    { id: '2', name: 'Sarah Chen', role: 'Operations Lead', projects: 'Vortex Retail, Solaria', utilization: 85, status: 'EXCELLENT', email: 'sarah@apex.co', phone: '+123456780' },
    { id: '3', name: 'Marcus Aurelius', role: 'Creative Director', projects: 'Aether Technologies', utilization: 78, status: 'GOOD', email: 'marcus@apex.co', phone: '+123456781' },
    { id: '4', name: 'Elena Rostova', role: 'Financial Analyst', projects: 'QuickBooks Auditing', utilization: 60, status: 'GOOD', email: 'elena@apex.co', phone: '+123456782' },
    { id: '5', name: 'David Kim', role: 'Senior Designer', projects: 'Pulse Media, Onyx', utilization: 92, status: 'EXCELLENT', email: 'david@apex.co', phone: '+123456783' },
    { id: '6', name: 'Sophie Dubois', role: 'Lead Copywriter', projects: 'Pinnacle Health, Vortex', utilization: 95, status: 'EXCELLENT', email: 'sophie@apex.co', phone: '+123456784' },
  ]);

  // Modal Dialog Open/Close States
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'single' | 'existing' | 'batch'>('single');

  // --- TAB 1: SINGLE USER FORM ---
  const [singleForm, setSingleForm] = React.useState({
    name: '',
    email: '',
    phone: '',
    role: 'Member Specialist',
    utilization: 80,
    projects: ''
  });
  const [singleFormError, setSingleFormError] = React.useState('');

  // --- TAB 2: EXISTING SPECIALIST ---
  const [selectedExistingId, setSelectedExistingId] = React.useState('');
  const [existingForm, setExistingForm] = React.useState({
    role: '',
    utilization: 80,
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

  // Dynamic calculations based on teamList
  const averageUtilization = React.useMemo(() => {
    const total = teamList.reduce((sum, t) => sum + t.utilization, 0);
    return (total / teamList.length).toFixed(1);
  }, [teamList]);

  const optimalCount = teamList.filter(t => t.utilization >= 70 && t.utilization <= 85).length;
  const underallocatedCount = teamList.filter(t => t.utilization < 70).length;
  const overallocatedCount = teamList.filter(t => t.utilization > 90).length;

  // Reset modal state variables on close
  const closeModal = () => {
    setIsAddModalOpen(false);
    setActiveTab('single');
    setSingleForm({ name: '', email: '', phone: '', role: 'Member Specialist', utilization: 80, projects: '' });
    setSelectedExistingId('');
    setExistingForm({ role: '', utilization: 80, projects: '' });
    setStagedUsers([]);
    setIsTemplateAligned(null);
    setUploadStatus('idle');
    setErrorMsg('');
    setSingleFormError('');
    setExistingError('');
  };

  // --- ADD SINGLE MEMBER HANDLER ---
  const handleAddSingle = (e: React.FormEvent) => {
    e.preventDefault();
    setSingleFormError('');
    
    if (!singleForm.name || !singleForm.email) {
      setSingleFormError('Name and Email ID are mandatory parameters.');
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(singleForm.email)) {
      setSingleFormError('Please enter a valid Email address.');
      return;
    }

    if (teamList.some(u => u.email.toLowerCase() === singleForm.email.toLowerCase())) {
      setSingleFormError('A team member with this email address already exists.');
      return;
    }

    const newMember = {
      id: String(teamList.length + 1),
      name: singleForm.name,
      role: singleForm.role,
      projects: singleForm.projects || 'None',
      utilization: Number(singleForm.utilization) || 0,
      status: singleForm.utilization >= 90 ? 'PEAK WORKLOAD' : 'EXCELLENT',
      email: singleForm.email,
      phone: singleForm.phone || 'N/A'
    };

    setTeamList([...teamList, newMember]);
    closeModal();
  };

  // --- REASSIGN EXISTING MEMBER HANDLER ---
  React.useEffect(() => {
    const selected = MOCK_EXISTING_SPECIALISTS.find(s => s.id === selectedExistingId);
    if (selected) {
      setExistingForm({
        role: selected.role,
        utilization: selected.utilization,
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
      utilization: Number(existingForm.utilization) || specialist.utilization,
      status: existingForm.utilization >= 90 ? 'PEAK WORKLOAD' : 'EXCELLENT',
      email: specialist.email,
      phone: specialist.phone
    };

    setTeamList([...teamList, newMember]);
    closeModal();
  };

  // --- TEMPLATE DOWNLOAD HANDLERS ---
  const downloadCsvTemplate = () => {
    const csvContent = "IrisOS_Template_Identifier (DO NOT MODIFY),Full Name,Email ID,Phone Number,Role,Assigned Projects,Utilization %\nIRIS_OS_USER_IMPORT_v1,Vikram Patel,vikram@apex.co,+91 98765 43210,Senior Architect,Solaria Redesign,85\nIRIS_OS_USER_IMPORT_v1,Aditi Sharma,aditi@apex.co,+91 99887 76655,Lead Designer,Design Hub,70";
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

  const downloadXlsxTemplate = () => {
    const data = [
      ["IrisOS_Template_Identifier (DO NOT MODIFY)", "Full Name", "Email ID", "Phone Number", "Role", "Assigned Projects", "Utilization %"],
      ["IRIS_OS_USER_IMPORT_v1", "Vikram Patel", "vikram@apex.co", "+91 98765 43210", "Senior Architect", "Solaria Redesign", 85],
      ["IRIS_OS_USER_IMPORT_v1", "Aditi Sharma", "aditi@apex.co", "+91 99887 76655", "Lead Designer", "Design Hub", 70]
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "irisos_team_template.xlsx");
  };

  // --- BATCH FILE UPLOAD & AI PARSING HANDLERS ---
  const triggerChatGPTAnalysis = async (rawText: string) => {
    setIsParsing(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/prism-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'parse-team-file',
          query: rawText
        })
      });
      if (res.ok) {
        const data = await res.json();
        // Parse chatGPT returned array
        const parsedUsers = JSON.parse(data.result);
        if (Array.isArray(parsedUsers)) {
          setStagedUsers(parsedUsers.map((u: any) => ({
            name: u.name || 'Extracted Member',
            email: u.email || '',
            phone: u.phone || '',
            role: u.role || 'Specialist',
            projects: u.projects || 'None',
            utilization: Number(u.utilization) || 80
          })));
          setIsTemplateAligned(false);
          setUploadStatus('success');
        } else {
          throw new Error("ChatGPT output could not be parsed into a list.");
        }
      } else {
        throw new Error("AI Routing Handler failed.");
      }
    } catch (e: any) {
      console.error(e);
      setErrorMsg("Prism AI could not parse the custom layout. Loaded local smart fallback users.");
      setStagedUsers([
        { name: 'Kunal Verma', email: 'kunal@apex.co', phone: '+91 99887 76655', role: 'Solutions Architect', utilization: 85, projects: 'Integrations Phase 2' },
        { name: 'Aditi Sharma', email: 'aditi@apex.co', phone: '+91 99887 76644', role: 'UI/UX Specialist', utilization: 75, projects: 'Canva Design Hub' }
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

    const isCsv = file.name.endsWith('.csv');
    const isXlsx = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

    if (!isCsv && !isXlsx) {
      setErrorMsg('Unsupported file extension. Please upload a .csv or .xlsx document.');
      setIsParsing(false);
      return;
    }

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
              if (cols.length >= 7) {
                users.push({
                  name: cols[1] || 'Imported Member',
                  email: cols[2] || '',
                  phone: cols[3] || '',
                  role: cols[4] || 'Specialist',
                  projects: cols[5] || 'None',
                  utilization: parseInt(cols[6], 10) || 80
                });
              }
            }
            setStagedUsers(users);
            setIsTemplateAligned(true);
            setUploadStatus('success');
            setIsParsing(false);
          } else {
            // Non-aligned: Ask ChatGPT to parse
            await triggerChatGPTAnalysis(text);
          }
        };
        reader.readAsText(file);
      } else {
        // XLSX
        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
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
                if (r && r.length >= 7) {
                  users.push({
                    name: String(r[1] || 'Imported Member'),
                    email: String(r[2] || ''),
                    phone: String(r[3] || ''),
                    role: String(r[4] || 'Specialist'),
                    projects: String(r[5] || 'None'),
                    utilization: parseInt(String(r[6]), 10) || 80
                  });
                }
              }
              setStagedUsers(users);
              setIsTemplateAligned(true);
              setUploadStatus('success');
              setIsParsing(false);
            } else {
              // Convert worksheet rows to flat text layout description for GPT
              const textFormat = rows.map(r => r.join(', ')).join('\n');
              await triggerChatGPTAnalysis(textFormat);
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
      utilization: Number(u.utilization) || 80,
      status: Number(u.utilization) >= 90 ? 'PEAK WORKLOAD' : 'EXCELLENT',
      email: u.email || `imported-${i}@apex.co`,
      phone: u.phone || 'N/A'
    }));

    setTeamList([...teamList, ...validatedUsers]);
    closeModal();
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-zinc-800/60 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white silver-text-gradient">Team & Resource Management</h1>
          <p className="text-xs text-zinc-500">Monitor team member utilization, capacities, billable hours, and hiring recommendations.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="h-8 border-zinc-800 text-zinc-300 gap-1.5 rounded-none">
            <Filter className="h-3.5 w-3.5" />
            <span>Filter Team</span>
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            className="h-8 gap-1.5 font-semibold rounded-none bg-white text-zinc-950 hover:bg-zinc-200"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Member</span>
          </Button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card hoverEffect className="rounded-none">
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

        <Card hoverEffect className="rounded-none">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Average Utilization</CardTitle>
            <Zap className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight text-white">{averageUtilization}%</div>
            <div className="flex items-center gap-1.5 mt-2 text-[10px] text-amber-400 font-semibold">
              <Zap className="h-3 w-3" />
              <span>High workload bandwidth threshold</span>
            </div>
          </CardContent>
        </Card>

        <Card hoverEffect className="rounded-none">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Billable Target</CardTitle>
            <UserCheck className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight text-white">{(teamList.length * 30)} hrs/wk</div>
            <div className="flex items-center gap-1.5 mt-2 text-[10px] text-emerald-400 font-semibold">
              <Zap className="h-3 w-3" />
              <span>Target cumulative client deliverability</span>
            </div>
          </CardContent>
        </Card>

        <Card hoverEffect className="rounded-none">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Hiring Status</CardTitle>
            <Zap className="h-4 w-4 text-rose-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight text-rose-400">
              {overallocatedCount > 1 ? `${overallocatedCount} Warnings` : 'Optimal'}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[10px] text-zinc-500 font-medium">
              <span>Based on resource limits</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid Split */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Team Table */}
        <div className="md:col-span-2 space-y-4">
          <Card className="rounded-none">
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
                    <TableHead className="text-center">Utilization</TableHead>
                    <TableHead className="text-right">Performance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamList.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-semibold text-white">
                        <div>
                          <span>{t.name}</span>
                          <span className="block text-[9px] text-zinc-500 font-normal mt-0.5">{t.phone}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-[10px] text-zinc-400">{t.email}</TableCell>
                      <TableCell>{t.role}</TableCell>
                      <TableCell className="text-zinc-400 max-w-[160px] truncate">{t.projects}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span className="font-mono text-xs text-white font-semibold">{t.utilization}%</span>
                          <div className="h-1.5 w-12 bg-zinc-800 rounded-none overflow-hidden">
                            <div
                              style={{ width: `${t.utilization}%` }}
                              className={cn(
                                'h-full',
                                t.utilization >= 90 ? 'bg-rose-500' : t.utilization >= 75 ? 'bg-amber-500' : 'bg-emerald-500'
                              )}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={t.status === 'EXCELLENT' ? 'risk-low' : 'outline'} className="rounded-none">
                          {t.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Insights */}
        <div className="space-y-6">
          <InsightPanel
            type="general"
            title="Prism Team Capacity Alert"
            score="88%"
            scoreLabel="PEAK DESIGN WORKLOAD"
            riskLevel="MEDIUM"
          >
            {formatUserMessage(`Lohith, our design team is currently working at high workloads. We have ${overallocatedCount} resources over-allocated (above 90% utilization threshold). Adding a resource or re-assigning roles will help reduce peak stress bounds.`)}
          </InsightPanel>

          <Card className="rounded-none">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-white">Utilization Thresholds</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-400">Optimal Range (70-85%)</span>
                <span className="font-semibold text-emerald-400">{optimalCount} Members</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-400">Under-Utilized (&lt; 70%)</span>
                <span className="font-semibold text-zinc-300">{underallocatedCount} Member</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-400">Over-allocated (&gt; 90%)</span>
                <span className="font-semibold text-rose-400">{overallocatedCount} Members</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* --- ADD MEMBER SLIDE OVER / MODAL DIALOG --- */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 w-full max-w-4xl max-h-[90vh] flex flex-col rounded-none shadow-2xl relative">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-900">
              <div>
                <h2 className="text-lg font-bold text-white uppercase tracking-wider font-heading">Add Agency Specialist</h2>
                <p className="text-[11px] text-zinc-500">Allocate single profiles, import system templates, or extract custom sheets using AI.</p>
              </div>
              <button 
                onClick={closeModal}
                className="text-zinc-500 hover:text-white border border-zinc-900 hover:border-zinc-800 p-1.5 transition-colors cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Modal Tab Headers */}
            <div className="flex border-b border-zinc-900 bg-zinc-950/40">
              <button
                onClick={() => { setActiveTab('single'); setErrorMsg(''); }}
                className={cn(
                  "flex-1 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 text-center cursor-pointer transition-all",
                  activeTab === 'single' ? "border-white text-white bg-zinc-900/30" : "border-transparent text-zinc-500 hover:text-zinc-300"
                )}
              >
                Create New Profile
              </button>
              <button
                onClick={() => { setActiveTab('existing'); setErrorMsg(''); }}
                className={cn(
                  "flex-1 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 text-center cursor-pointer transition-all",
                  activeTab === 'existing' ? "border-white text-white bg-zinc-900/30" : "border-transparent text-zinc-500 hover:text-zinc-300"
                )}
              >
                Allocate Existing Specialist
              </button>
              <button
                onClick={() => { setActiveTab('batch'); setErrorMsg(''); }}
                className={cn(
                  "flex-1 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 text-center cursor-pointer transition-all",
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
                <form onSubmit={handleAddSingle} className="space-y-4">
                  {singleFormError && (
                    <div className="bg-rose-950/30 border border-rose-900/50 p-3 flex items-center gap-2 text-xs text-rose-400">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span>{singleFormError}</span>
                    </div>
                  )}

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Full Name *</label>
                      <input
                        type="text"
                        required
                        value={singleForm.name}
                        onChange={(e) => setSingleForm({ ...singleForm, name: e.target.value })}
                        placeholder="e.g. Aditi Sharma"
                        className="w-full text-xs bg-zinc-900 border border-zinc-800 focus:border-zinc-700 px-3 py-2 text-white outline-none rounded-none font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Email Address *</label>
                      <input
                        type="email"
                        required
                        value={singleForm.email}
                        onChange={(e) => setSingleForm({ ...singleForm, email: e.target.value })}
                        placeholder="e.g. aditi@apex.co"
                        className="w-full text-xs bg-zinc-900 border border-zinc-800 focus:border-zinc-700 px-3 py-2 text-white outline-none rounded-none font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Phone Number</label>
                      <input
                        type="text"
                        value={singleForm.phone}
                        onChange={(e) => setSingleForm({ ...singleForm, phone: e.target.value })}
                        placeholder="e.g. +91 99887 76655"
                        className="w-full text-xs bg-zinc-900 border border-zinc-800 focus:border-zinc-700 px-3 py-2 text-white outline-none rounded-none font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Core Role / Title</label>
                      <input
                        type="text"
                        value={singleForm.role}
                        onChange={(e) => setSingleForm({ ...singleForm, role: e.target.value })}
                        placeholder="e.g. UI/UX Specialist"
                        className="w-full text-xs bg-zinc-900 border border-zinc-800 focus:border-zinc-700 px-3 py-2 text-white outline-none rounded-none font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Allocation Projects</label>
                      <input
                        type="text"
                        value={singleForm.projects}
                        onChange={(e) => setSingleForm({ ...singleForm, projects: e.target.value })}
                        placeholder="e.g. Canva Hub, Solaria"
                        className="w-full text-xs bg-zinc-900 border border-zinc-800 focus:border-zinc-700 px-3 py-2 text-white outline-none rounded-none font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Utilization Rate ({singleForm.utilization}%)</label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={singleForm.utilization}
                        onChange={(e) => setSingleForm({ ...singleForm, utilization: Number(e.target.value) })}
                        className="w-full bg-zinc-800 h-1 accent-white"
                      />
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <Button 
                      type="submit" 
                      className="bg-white text-zinc-950 hover:bg-zinc-200 rounded-none text-xs font-semibold px-6"
                    >
                      Allocate New Profile
                    </Button>
                  </div>
                </form>
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
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Select Specialist *</label>
                    <select
                      required
                      value={selectedExistingId}
                      onChange={(e) => setSelectedExistingId(e.target.value)}
                      className="w-full text-xs bg-zinc-900 border border-zinc-800 focus:border-zinc-700 px-3 py-2 text-white outline-none rounded-none font-sans"
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
                            className="w-full text-xs bg-zinc-900 border border-zinc-800 focus:border-zinc-700 px-3 py-2 text-white outline-none rounded-none font-mono"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Assigned Projects</label>
                          <input
                            type="text"
                            value={existingForm.projects}
                            onChange={(e) => setExistingForm({ ...existingForm, projects: e.target.value })}
                            className="w-full text-xs bg-zinc-900 border border-zinc-800 focus:border-zinc-700 px-3 py-2 text-white outline-none rounded-none font-mono"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Utilization Allocation ({existingForm.utilization}%)</label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="5"
                          value={existingForm.utilization}
                          onChange={(e) => setExistingForm({ ...existingForm, utilization: Number(e.target.value) })}
                          className="w-full bg-zinc-800 h-1 accent-white"
                        />
                      </div>
                    </div>
                  )}

                  <div className="pt-4 flex justify-end">
                    <Button 
                      type="submit"
                      disabled={!selectedExistingId}
                      className="bg-white text-zinc-950 hover:bg-zinc-200 rounded-none text-xs font-semibold px-6 disabled:opacity-50"
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
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between bg-zinc-950/40 p-4 border border-zinc-900">
                    <div>
                      <span className="block text-xs font-bold text-white uppercase tracking-wider">Download Imports System Template</span>
                      <span className="text-[10px] text-zinc-500 mt-1 block">Templates contain unique headers required for aligned imports.</span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={downloadCsvTemplate}
                        className="h-8 text-[10px] font-semibold uppercase tracking-wider rounded-none gap-1 border-zinc-800"
                      >
                        <Download className="h-3 w-3" />
                        <span>CSV Template</span>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={downloadXlsxTemplate}
                        className="h-8 text-[10px] font-semibold uppercase tracking-wider rounded-none gap-1 border-zinc-800"
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
                      className="border border-dashed border-zinc-850 bg-zinc-950/20 hover:bg-zinc-950/50 hover:border-zinc-800 p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 group"
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept=".csv,.xlsx,.xls"
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
                    <div className="bg-zinc-950 border border-zinc-900 p-4 text-xs text-zinc-400 flex items-center justify-between rounded-none animate-pulse">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 text-white animate-spin" />
                        <span>Analyzing layout format. Running ChatGPT extraction pipelines...</span>
                      </div>
                      <Badge variant="outline" className="text-[9px] bg-zinc-900 border-zinc-800 text-zinc-400 rounded-none uppercase">
                        AI Processing
                      </Badge>
                    </div>
                  )}

                  {errorMsg && (
                    <div className="team-alert-danger bg-rose-950/30 border border-rose-900/50 p-3 flex items-center gap-2 text-xs text-rose-400 rounded-none">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  {uploadStatus === 'success' && stagedUsers.length > 0 && (
                    <div className="space-y-4">
                      {/* Alignment Badge Alert */}
                      <div className={cn(
                        "p-3.5 border text-xs flex items-center justify-between rounded-none",
                        isTemplateAligned
                          ? "team-alert-success bg-emerald-950/30 border-emerald-900/50 text-emerald-400"
                          : "team-alert-warning bg-amber-950/30 border-amber-900/50 text-amber-400"
                      )}>
                        <div className="flex items-center gap-2.5">
                          {isTemplateAligned ? <Check className="h-4.5 w-4.5" /> : <Sparkles className="h-4.5 w-4.5" />}
                          <div>
                            <span className="font-bold uppercase tracking-wider block">
                              {isTemplateAligned ? 'Standard Template Identified' : 'Prism AI Extraction Complete'}
                            </span>
                            <span className="text-[10px] block mt-0.5 opacity-80">
                              {isTemplateAligned
                                ? `Imported file matched headers. Extracted ${stagedUsers.length} specialists directly.`
                                : `ChatGPT parsed custom columns. Extracted ${stagedUsers.length} specialists. Please review details below.`}
                            </span>
                          </div>
                        </div>
                        <Badge variant={isTemplateAligned ? "risk-low" : "default"} className="text-[9px] uppercase rounded-none tracking-wider">
                          {isTemplateAligned ? 'Aligned' : 'AI Extracted'}
                        </Badge>
                      </div>

                      {/* Staging Preview Table (Fully Editable) */}
                      <div className="border border-zinc-900 bg-zinc-950">
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
                                <TableHead>Role</TableHead>
                                <TableHead className="w-[100px]">Utilization</TableHead>
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
                                      className="w-full text-xs bg-zinc-900 border border-zinc-800 px-2 py-1 text-white outline-none rounded-none font-sans font-semibold"
                                    />
                                  </TableCell>
                                  <TableCell className="p-2">
                                    <input
                                      type="email"
                                      value={user.email}
                                      onChange={(e) => handleStagedChange(idx, 'email', e.target.value)}
                                      className="w-full text-xs bg-zinc-900 border border-zinc-800 px-2 py-1 text-zinc-300 outline-none rounded-none font-mono"
                                    />
                                  </TableCell>
                                  <TableCell className="p-2">
                                    <input
                                      type="text"
                                      value={user.role}
                                      onChange={(e) => handleStagedChange(idx, 'role', e.target.value)}
                                      className="w-full text-xs bg-zinc-900 border border-zinc-800 px-2 py-1 text-zinc-300 outline-none rounded-none font-sans"
                                    />
                                  </TableCell>
                                  <TableCell className="p-2">
                                    <input
                                      type="number"
                                      value={user.utilization}
                                      onChange={(e) => handleStagedChange(idx, 'utilization', Number(e.target.value))}
                                      className="w-full text-xs bg-zinc-900 border border-zinc-800 px-2 py-1 text-white outline-none rounded-none font-mono"
                                    />
                                  </TableCell>
                                  <TableCell className="p-2">
                                    <input
                                      type="text"
                                      value={user.projects}
                                      onChange={(e) => handleStagedChange(idx, 'projects', e.target.value)}
                                      className="w-full text-xs bg-zinc-900 border border-zinc-800 px-2 py-1 text-zinc-300 outline-none rounded-none font-sans"
                                    />
                                  </TableCell>
                                  <TableCell className="p-2 text-right">
                                    <button
                                      type="button"
                                      onClick={() => removeStagedUser(idx)}
                                      className="text-zinc-500 hover:text-rose-400 p-1 border border-transparent hover:border-zinc-900 transition-colors"
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
                          className="rounded-none text-xs text-zinc-500 hover:text-white"
                        >
                          Clear Import
                        </Button>
                        <Button
                          type="button"
                          onClick={handleImportStaged}
                          className="bg-white text-zinc-950 hover:bg-zinc-200 rounded-none text-xs font-semibold px-6 flex items-center gap-1.5"
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
    </div>
  );
}
