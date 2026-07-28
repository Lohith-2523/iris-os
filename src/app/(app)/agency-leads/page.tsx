'use client';

import * as React from 'react';
import { workspaceFetch as fetch } from '@/lib/workspace-data-cache';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import {
  Users,
  Search,
  RefreshCw,
  ShieldCheck,
  Eye,
  CheckCircle2,
  X,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Award,
  Download,
  Upload,
  FileSpreadsheet,
  Check,
  Loader2,
  Trash2
} from 'lucide-react';
import { formatCurrency, formatUserMessage } from '@/lib/utils';
import * as XLSX from 'xlsx';
import { useRouter } from 'next/navigation';

interface AgencyLead {
  id: string;
  leadId: string;
  fullName: string;
  email: string;
  phone: string | null;
  status: string;
  collectionMethod: string | null;
  approachMethod: string | null;
  funnelName: string | null;
  estimatedClientValue: number | null;
  createdTime: string;
  convertedClient?: { id: string; name: string } | null;
}

interface LeadMetrics {
  marketingSpend: number;
  closedLeadCount: number;
  sourcedRetainerRevenue: number;
  averageCac: number | null;
  averageRoas: number | null;
}

export default function AgencyLeadsPage() {
  const router = useRouter();
  const [leads, setLeads] = React.useState<AgencyLead[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [syncing, setSyncing] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [activeTab, setActiveTab] = React.useState<'pipeline' | 'entry'>('pipeline');
  const [metrics, setMetrics] = React.useState<LeadMetrics>({
    marketingSpend: 0,
    closedLeadCount: 0,
    sourcedRetainerRevenue: 0,
    averageCac: null,
    averageRoas: null,
  });

  // Manual Form State
  const [manualForm, setManualForm] = React.useState({
    fullName: '',
    email: '',
    phone: '',
    funnelName: '',
    estimatedClientValue: '',
    status: 'procured',
    approachMethod: 'Email'
  });
  const [formSubmitting, setFormSubmitting] = React.useState(false);
  const [formSuccess, setFormSuccess] = React.useState(false);
  const [formError, setFormError] = React.useState('');

  // Bulk Import State
  const [stagedLeads, setStagedLeads] = React.useState<any[]>([]);
  const [isTemplateAligned, setIsTemplateAligned] = React.useState<boolean | null>(null);
  const [uploadStatus, setUploadStatus] = React.useState<'idle' | 'success' | 'error'>('idle');
  const [isParsing, setIsParsing] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState('');

  // Selected lead for detail modal
  const [selectedLead, setSelectedLead] = React.useState<AgencyLead | null>(null);

  // Spend value for calculating CAC/ROAS on this page

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/agency-leads');
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads || []);
        setMetrics(data.metrics || {
          marketingSpend: 0,
          closedLeadCount: 0,
          sourcedRetainerRevenue: 0,
          averageCac: null,
          averageRoas: null,
        });
      }
    } catch (e) {
      console.error('Failed to load agency leads data:', e);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadData();
  }, []);

  const handleSyncData = async () => {
    setSyncing(true);
    try {
      await loadData();
    } finally {
      setSyncing(false);
    }
  };

  // Update lead status
  const handleUpdateStatus = async (leadId: string, newStatus: string) => {
    const previousLeads = [...leads];
    setLeads((prev) =>
      prev.map((l) => (l.leadId === leadId ? { ...l, status: newStatus } : l))
    );
    if (selectedLead && selectedLead.leadId === leadId) {
      setSelectedLead((prev) => (prev ? { ...prev, status: newStatus } : null));
    }

    try {
      const res = await fetch('/api/agency-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_status', leadId, status: newStatus }),
      });

      if (!res.ok) {
        throw new Error('Failed to update status on server');
      }
      await loadData();
    } catch (e) {
      console.error(e);
      setLeads(previousLeads);
      if (selectedLead && selectedLead.leadId === leadId) {
        const original = previousLeads.find((l) => l.leadId === leadId);
        setSelectedLead(original || null);
      }
      alert(formatUserMessage('Failed to save status update.'));
    }
  };

  // Kanban Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData('text/plain', leadId);
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('text/plain');
    if (leadId) {
      await handleUpdateStatus(leadId, targetStatus);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Delete Lead
  const handleDeleteLead = async (id: string) => {
    if (!confirm('Are you sure you want to delete this lead?')) return;
    try {
      const res = await fetch('/api/agency-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id }),
      });
      if (res.ok) {
        setSelectedLead(null);
        await loadData();
      } else {
        alert('Failed to delete lead.');
      }
    } catch (e) {
      console.error(e);
      alert('Error occurred while deleting lead.');
    }
  };

  // Handle Manual Form Submit
  const handleManualFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormSuccess(false);
    setFormError('');

    if (!manualForm.fullName.trim() || !manualForm.email.trim()) {
      setFormError('Full Name and Email Address are required.');
      setFormSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/agency-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          ...manualForm
        })
      });

      if (res.ok) {
        await loadData();
        setManualForm({
          fullName: '',
          email: '',
          phone: '',
          funnelName: '',
          estimatedClientValue: '',
          status: 'procured',
          approachMethod: 'Email'
        });
        // Return to the live pipeline as soon as the new lead is saved.
        setActiveTab('pipeline');
      } else {
        const err = await res.json();
        setFormError(err.error || 'Failed to create lead.');
      }
    } catch (e) {
      console.error(e);
      setFormError('Error saving lead details.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // --- TEMPLATE DOWNLOAD HANDLERS ---
  const downloadCsvTemplate = () => {
    const csvContent = "Iris OS_Template_Identifier (DO NOT MODIFY),Full Name,Email ID,Phone Number,Funnel Name,Status,Approach Method,Estimated Client Value\nIRIS_OS_AGENCY_LEAD_IMPORT_v1,Vikram Patel,vikram@apex.co,+91 98765 43210,Enterprise Outreach,procured,Email,250000\nIRIS_OS_AGENCY_LEAD_IMPORT_v1,Aditi Sharma,aditi@apex.co,+91 99887 76655,Direct Inbound,warm,LinkedIn,120000";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "irisos_agency_leads_template.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadXlsxTemplate = () => {
    const data = [
      ["Iris OS_Template_Identifier (DO NOT MODIFY)", "Full Name", "Email ID", "Phone Number", "Funnel Name", "Status", "Approach Method", "Estimated Client Value"],
      ["IRIS_OS_AGENCY_LEAD_IMPORT_v1", "Vikram Patel", "vikram@apex.co", "+91 98765 43210", "Enterprise Outreach", "procured", "Email", 250000],
      ["IRIS_OS_AGENCY_LEAD_IMPORT_v1", "Aditi Sharma", "aditi@apex.co", "+91 99887 76655", "Direct Inbound", "warm", "LinkedIn", 120000]
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "irisos_agency_leads_template.xlsx");
  };

  // --- BATCH FILE UPLOAD HANDLERS ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    setErrorMsg('');
    setUploadStatus('idle');
    setIsTemplateAligned(null);

    const isCsv = file.name.endsWith('.csv');

    try {
      if (isCsv) {
        const reader = new FileReader();
        reader.onload = async (event) => {
          const text = event.target?.result as string;
          const hasIdentifier = text.includes('IRIS_OS_AGENCY_LEAD_IMPORT_v1');

          if (hasIdentifier) {
            const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
            const imported = [];
            for (let i = 1; i < lines.length; i++) {
              const cols = lines[i].split(',').map(c => c.trim());
              if (cols.length >= 7) {
                imported.push({
                  fullName: cols[1] || 'Imported Lead',
                  email: cols[2] || '',
                  phone: cols[3] || '',
                  funnelName: cols[4] || 'Bulk Import',
                  status: cols[5] || 'procured',
                  approachMethod: cols[6] || 'Email',
                  estimatedClientValue: cols[7] || ''
                });
              }
            }
            setStagedLeads(imported);
            setIsTemplateAligned(true);
            setUploadStatus('success');
            setIsParsing(false);
          } else {
            setErrorMsg('Invalid file headers. Please download the standard templates.');
            setUploadStatus('error');
            setIsParsing(false);
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
              setUploadStatus('error');
              setIsParsing(false);
              return;
            }

            let hasIdentifier = false;
            for (const r of rows) {
              if (r.some((c: any) => String(c).includes('IRIS_OS_AGENCY_LEAD_IMPORT_v1'))) {
                hasIdentifier = true;
                break;
              }
            }

            if (hasIdentifier) {
              const imported = [];
              for (let i = 1; i < rows.length; i++) {
                const r = rows[i];
                if (r && r.length >= 7) {
                  imported.push({
                    fullName: String(r[1] || 'Imported Lead'),
                    email: String(r[2] || ''),
                    phone: String(r[3] || ''),
                    funnelName: String(r[4] || 'Bulk Import'),
                    status: String(r[5] || 'procured'),
                    approachMethod: String(r[6] || 'Email'),
                    estimatedClientValue: r[7] === undefined || r[7] === null ? '' : String(r[7])
                  });
                }
              }
              setStagedLeads(imported);
              setIsTemplateAligned(true);
              setUploadStatus('success');
              setIsParsing(false);
            } else {
              setErrorMsg('Invalid file format. Ensure you are using the standard templates.');
              setUploadStatus('error');
              setIsParsing(false);
            }
          } catch (err: any) {
            console.error(err);
            setErrorMsg('Error loading spreadsheet sheets.');
            setUploadStatus('error');
            setIsParsing(false);
          }
        };
        reader.readAsArrayBuffer(file);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Failed to process file.');
      setUploadStatus('error');
      setIsParsing(false);
    }
  };

  const handleImportStaged = async () => {
    if (stagedLeads.length === 0) return;
    try {
      setIsParsing(true);
      const res = await fetch('/api/agency-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'import',
          leads: stagedLeads
        })
      });

      if (res.ok) {
        await loadData();
        setStagedLeads([]);
        setIsTemplateAligned(null);
        setUploadStatus('idle');
        setActiveTab('pipeline');
      } else {
        alert('Failed to save imported leads.');
      }
    } catch (e) {
      console.error(e);
      alert('Error occurred while importing leads.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleStagedChange = (idx: number, field: string, value: any) => {
    const updated = [...stagedLeads];
    updated[idx] = { ...updated[idx], [field]: value };
    setStagedLeads(updated);
  };

  // Filtered Leads
  const filteredLeads = React.useMemo(() => {
    return leads.filter((l) => {
      const query = searchQuery.toLowerCase();
      return (
        l.fullName.toLowerCase().includes(query) ||
        l.email.toLowerCase().includes(query) ||
        (l.phone && l.phone.includes(searchQuery)) ||
        (l.funnelName && l.funnelName.toLowerCase().includes(query))
      );
    });
  }, [leads, searchQuery]);

  // Lead stages computations
  const totalLeads = leads.length;
  const closedLeads = leads.filter((l) => l.status?.toLowerCase() === 'closed').length;
  const lostLeads = leads.filter((l) => l.status?.toLowerCase() === 'lost').length;
  const procuredLeads = leads.filter((l) => l.status?.toLowerCase() === 'procured' || l.status?.toLowerCase() === 'new').length;
  const warmLeads = leads.filter((l) => l.status?.toLowerCase() === 'warm' || l.status?.toLowerCase() === 'cold-call in progress').length;
  const coldLeads = leads.filter((l) => l.status?.toLowerCase() === 'cold' || l.status?.toLowerCase() === 'call back required').length;

  // Efficiency indicators based solely on stored lead stages.
  const conversionRate = totalLeads > 0 ? (closedLeads / totalLeads) * 100 : 0;

  // Kanban Columns
  const columns = [
    { id: 'procured', label: 'Procured', count: procuredLeads, bg: 'border-zinc-800 bg-zinc-950/20' },
    { id: 'warm', label: 'Warm', count: warmLeads, bg: 'border-amber-900/30 bg-amber-950/10' },
    { id: 'cold', label: 'Cold', count: coldLeads, bg: 'border-blue-900/30 bg-blue-950/10' },
    { id: 'lost', label: 'Lost', count: lostLeads, bg: 'border-rose-900/30 bg-rose-950/10' },
    { id: 'closed', label: 'Closed', count: closedLeads, bg: 'border-emerald-900/30 bg-emerald-950/10' },
  ];

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-zinc-500 text-xs flex items-center gap-2">
          <span className="h-4 w-4 animate-spin rounded-full border border-t-transparent border-zinc-400" />
          <span>Synchronizing Agency Leads database...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-zinc-800/60 pb-5">
        <div>
          <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest font-mono">Agency Pipeline</span>
          <h1 className="text-2xl font-bold tracking-tight text-white silver-text-gradient font-sans mt-0.5">
            Agency Leads Hub
          </h1>
          <p className="text-xs text-zinc-500">
            Manage, import, and track manually imported client leads through the stage pipeline.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Tab Selection */}
          <div className="agency-leads-tabs workspace-segmented-control flex items-center gap-1 bg-zinc-950 p-1 border border-zinc-900 rounded-lg">
            <button
              onClick={() => setActiveTab('pipeline')}
              aria-pressed={activeTab === 'pipeline'}
              className={`workspace-segmented-trigger px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'pipeline' ? 'bg-white text-zinc-950 font-bold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Award className="h-3.5 w-3.5" />
              <span>Leads Pipeline</span>
            </button>
            <button
              onClick={() => setActiveTab('entry')}
              aria-pressed={activeTab === 'entry'}
              className={`workspace-segmented-trigger px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'entry' ? 'bg-white text-zinc-950 font-bold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Add Leads</span>
            </button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSyncData}
            disabled={syncing}
            className="h-8 border-zinc-800 text-zinc-300 gap-1.5 rounded-md"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </Button>
        </div>
      </div>

      {/* Leads metrics header banner */}
      <div className="agency-leads-summary grid gap-4 sm:grid-cols-2 lg:grid-cols-5 bg-zinc-950/30 p-4 border border-zinc-900 rounded-lg">
        <div className="border-r border-zinc-900/60 last:border-0 pr-4">
          <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block">Procured Leads</span>
          <span className="text-lg font-bold font-mono text-white block mt-1">{procuredLeads}</span>
        </div>
        <div className="border-r border-zinc-900/60 last:border-0 pr-4 pl-0 lg:pl-4">
          <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block">Warm & Cold</span>
          <span className="text-lg font-bold font-mono text-zinc-300 block mt-1">{warmLeads + coldLeads}</span>
        </div>
        <div className="border-r border-zinc-900/60 last:border-0 pr-4 pl-0 lg:pl-4">
          <span className="text-[9px] font-bold text-rose-455 uppercase tracking-wider block">Lost Leads</span>
          <span className="text-lg font-bold font-mono text-rose-400 block mt-1">{lostLeads}</span>
        </div>
        <div className="border-r border-zinc-900/60 last:border-0 pr-4 pl-0 lg:pl-4">
          <span className="text-[9px] font-bold text-emerald-455 uppercase tracking-wider block">Closed Deals</span>
          <span className="text-lg font-bold font-mono text-emerald-400 block mt-1">{closedLeads}</span>
        </div>
        <div className="pl-0 lg:pl-4">
          <span className="text-[9px] font-bold text-violet-400 uppercase tracking-wider block">Pipeline Total</span>
          <span className="text-lg font-bold font-mono text-white block mt-1">{totalLeads}</span>
        </div>
      </div>

      {activeTab === 'pipeline' ? (
        <>
          {/* Conversions & Efficiency reports */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="rounded-md border-zinc-800/80 bg-zinc-950/40">
              <CardContent className="pt-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Conversion Rate</span>
                  <span className="text-xl font-bold font-mono text-white block mt-1">{conversionRate.toFixed(2)}%</span>
                  <span className="text-[9px] text-zinc-550 block mt-0.5">{closedLeads} Closed out of {totalLeads}</span>
                </div>
                <Award className="h-8 w-8 text-zinc-700" />
              </CardContent>
            </Card>

            <Card className="rounded-md border-zinc-800/80 bg-zinc-950/40">
              <CardContent className="pt-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Average ROAS</span>
                  <span className="text-xl font-bold font-mono text-white block mt-1">
                    {metrics.averageRoas === null ? '—' : `${metrics.averageRoas.toFixed(2)}x`}
                  </span>
                </div>
                <TrendingUp className="h-8 w-8 text-zinc-700" />
              </CardContent>
            </Card>

            <Card className="rounded-md border-zinc-800/80 bg-zinc-950/40">
              <CardContent className="pt-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Average CAC Bound</span>
                  <span className="text-xl font-bold font-mono text-white block mt-1">
                    {metrics.averageCac === null ? '—' : formatCurrency(metrics.averageCac, 2)}
                  </span>
                </div>
                <Users className="h-8 w-8 text-zinc-700" />
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between pb-2">
            <div className="flex max-w-sm flex-1 items-center gap-2.5 rounded-md border border-zinc-800 bg-zinc-900/40 pl-3 transition-all focus-within:border-zinc-700 focus-within:bg-zinc-900/80">
              <Search aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
              <input
                type="text"
                aria-label="Search leads"
                placeholder="Search leads by name, email, phone or funnel..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="min-w-0 flex-1 bg-transparent py-1.5 pr-3 text-xs text-white placeholder-zinc-500 focus:outline-none font-sans"
              />
            </div>
            <div className="text-[11px] text-zinc-500 flex items-center gap-1.5 font-mono">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              <span>Full administrator editor workspace active</span>
            </div>
          </div>

          {/* KANBAN BOARD */}
          <div className="grid gap-4 grid-cols-1 md:grid-cols-5 items-stretch overflow-x-auto min-h-[500px]">
            {columns.map((col) => {
              const colLeads = filteredLeads.filter(
                (l) =>
                  l.status?.toLowerCase() === col.id ||
                  (col.id === 'procured' && l.status?.toLowerCase() === 'new') ||
                  (col.id === 'warm' && l.status?.toLowerCase() === 'cold-call in progress') ||
                  (col.id === 'cold' && l.status?.toLowerCase() === 'call back required') ||
                  (col.id === 'lost' && l.status?.toLowerCase() === 'unqualified')
              );

              return (
                <div
                  key={col.id}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, col.id)}
                  className={`flex flex-col rounded-lg border p-3 ${col.bg} transition-all duration-150 min-h-[450px]`}
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between border-b border-zinc-900 pb-2.5 mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-white">
                      {col.label}
                    </span>
                    <Badge variant="outline" className="text-[9px] font-mono border-zinc-800 text-zinc-400 rounded-md">
                      {colLeads.length}
                    </Badge>
                  </div>

                  {/* Column Cards */}
                  <div className="flex-1 flex flex-col gap-2 overflow-y-auto max-h-[600px] scrollbar-none">
                    {colLeads.length === 0 ? (
                      <div className="h-full flex items-center justify-center border border-dashed border-zinc-900 p-6 text-center text-[10px] text-zinc-650 italic rounded-md">
                        Drop leads here
                      </div>
                    ) : (
                      colLeads.map((lead) => (
                        <div
                          key={lead.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, lead.leadId)}
                          className="p-3 border border-zinc-900 bg-zinc-950/40 hover:bg-zinc-900/40 transition-all select-none text-[11px] relative group rounded-md cursor-grab active:cursor-grabbing"
                        >
                          <div className="flex justify-between items-start">
                            <span className="font-semibold text-white truncate max-w-[110px]">
                              {lead.fullName}
                            </span>
                            <button
                              type="button"
                              onClick={() => setSelectedLead(lead)}
                              className="text-zinc-500 hover:text-white cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Inspect Lead Details"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <span className="text-[10px] text-zinc-500 font-mono block mt-0.5 truncate">
                            {lead.email}
                          </span>
                          {lead.funnelName && (
                            <span className="text-[9px] text-zinc-600 font-sans block mt-2 border-t border-zinc-900 pt-1.5 truncate">
                              Funnel: {lead.funnelName}
                            </span>
                          )}
                          {col.id === 'closed' && (
                            <Button
                              type="button"
                              size="sm"
                              disabled={Boolean(lead.convertedClient)}
                              onClick={(event) => {
                                event.stopPropagation();
                                router.push(`/clients/onboard?leadId=${encodeURIComponent(lead.id)}`);
                              }}
                              className="mt-3 h-7 w-full rounded-md bg-white px-2 text-[10px] font-semibold text-zinc-950 hover:bg-zinc-200 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
                            >
                              {lead.convertedClient ? 'Client Onboarded' : 'Onboard Client'}
                            </Button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column: Manual Form */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="rounded-md border-zinc-800/80 bg-zinc-950/40">
              <CardHeader>
                <CardTitle className="text-sm font-semibold text-white uppercase tracking-wider">Manual Lead Entry</CardTitle>
                <CardDescription className="text-xs">Create a single lead record manually by filling out client details.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleManualFormSubmit} className="space-y-4">
                  {formError && (
                    <div className="flex gap-2.5 rounded border border-rose-900/30 bg-rose-950/10 p-3.5 text-xs text-rose-450">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}
                  {formSuccess && (
                    <div className="flex gap-2.5 rounded border border-emerald-900/30 bg-emerald-950/10 p-3.5 text-xs text-emerald-400">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      <span>Lead record created successfully!</span>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-550">Full Name</label>
                    <input
                      type="text"
                      className="w-full rounded-md border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-xs text-white placeholder-zinc-600 focus:border-zinc-700 focus:outline-none transition-all"
                      placeholder="e.g. Vikram Patel"
                      value={manualForm.fullName}
                      onChange={(e) => setManualForm(prev => ({ ...prev, fullName: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-550">Email Address</label>
                    <input
                      type="email"
                      className="w-full rounded-md border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-xs text-white placeholder-zinc-600 focus:border-zinc-700 focus:outline-none transition-all"
                      placeholder="e.g. vikram@apex.co"
                      value={manualForm.email}
                      onChange={(e) => setManualForm(prev => ({ ...prev, email: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-550">Phone Number (Optional)</label>
                    <input
                      type="text"
                      className="w-full rounded-md border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-xs text-white placeholder-zinc-600 focus:border-zinc-700 focus:outline-none transition-all"
                      placeholder="e.g. +91 98765 43210"
                      value={manualForm.phone}
                      onChange={(e) => setManualForm(prev => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-550">Funnel Source</label>
                    <input
                      type="text"
                      className="w-full rounded-md border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-xs text-white placeholder-zinc-600 focus:border-zinc-700 focus:outline-none transition-all"
                      placeholder="e.g. Enterprise Outreach"
                      value={manualForm.funnelName}
                      onChange={(e) => setManualForm(prev => ({ ...prev, funnelName: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-550">Estimated Client Value</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      className="w-full rounded-md border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-xs text-white placeholder-zinc-600 focus:border-zinc-700 focus:outline-none transition-all"
                      placeholder="e.g. 250000"
                      value={manualForm.estimatedClientValue}
                      onChange={(e) => setManualForm(prev => ({ ...prev, estimatedClientValue: e.target.value }))}
                    />
                  </div>

                  <div className="grid gap-3 grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-550">Pipeline Stage</label>
                      <select
                        className="w-full rounded-md border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-xs text-white focus:border-zinc-700 focus:outline-none transition-all cursor-pointer"
                        value={manualForm.status}
                        onChange={(e) => setManualForm(prev => ({ ...prev, status: e.target.value }))}
                      >
                        <option value="procured">Procured</option>
                        <option value="warm">Warm</option>
                        <option value="cold">Cold</option>
                        <option value="lost">Lost</option>
                        <option value="closed">Closed</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-550">Approach Method</label>
                      <select
                        className="w-full rounded-md border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-xs text-white focus:border-zinc-700 focus:outline-none transition-all cursor-pointer"
                        value={manualForm.approachMethod}
                        onChange={(e) => setManualForm(prev => ({ ...prev, approachMethod: e.target.value }))}
                      >
                        <option value="Email">Email</option>
                        <option value="Phone">Phone</option>
                        <option value="LinkedIn">LinkedIn</option>
                        <option value="Ad Campaign">Ad Campaign</option>
                        <option value="Direct Outreach">Direct Outreach</option>
                      </select>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={formSubmitting}
                    className="w-full text-xs font-semibold h-9 rounded-md cursor-pointer"
                  >
                    {formSubmitting ? 'Adding record...' : 'Create Lead Record'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Excel Templates Import */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="rounded-md border-zinc-800/80 bg-zinc-950/40">
              <CardHeader>
                <CardTitle className="text-sm font-semibold text-white uppercase tracking-wider">Spreadsheet Imports</CardTitle>
                <CardDescription className="text-xs">Download template layouts and import bulk lead files cleanly.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Templates Downloads */}
                <div className="p-4 border border-zinc-900 bg-zinc-950/50 rounded-lg space-y-4">
                  <div>
                    <span className="block text-xs font-bold text-white uppercase tracking-wider">Download Imports Template</span>
                    <span className="text-[10px] text-zinc-550 mt-1 block">Templates contain unique headers required for aligned imports.</span>
                  </div>
                  <div className="flex gap-3">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={downloadCsvTemplate}
                      className="h-8 border-zinc-800 text-zinc-300 text-xs gap-1.5 rounded-md cursor-pointer flex-1"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>CSV Template</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={downloadXlsxTemplate}
                      className="h-8 border-zinc-800 text-zinc-300 text-xs gap-1.5 rounded-md cursor-pointer flex-1"
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-500" />
                      <span>XLSX Template</span>
                    </Button>
                  </div>
                </div>

                {/* File Upload Drop Area */}
                <div className="border border-dashed border-zinc-800 bg-zinc-950/20 rounded-lg p-6 text-center space-y-4">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900 border border-zinc-850">
                    <Upload className="h-5 w-5 text-zinc-400" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-white block">Drag and drop file here</span>
                    <span className="text-[10px] text-zinc-550 block">Supports .csv or .xlsx spreadsheets containing the Iris OS aligned template.</span>
                  </div>
                  <div className="relative inline-block">
                    <input
                      type="file"
                      id="lead-file-upload"
                      accept=".csv, .xlsx"
                      onChange={handleFileUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <Button variant="secondary" size="sm" className="h-8 text-xs font-semibold rounded-md pointer-events-none">
                      Browse Spreadsheet File
                    </Button>
                  </div>
                </div>

                {/* Parsing / Staging Indicators */}
                {isParsing && (
                  <div className="flex items-center gap-2 justify-center text-xs text-zinc-555 font-mono py-2">
                    <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
                    <span>Processing spreadsheet content...</span>
                  </div>
                )}

                {errorMsg && (
                  <div className="flex gap-2.5 rounded border border-rose-900/30 bg-rose-950/10 p-3.5 text-xs text-rose-455">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {stagedLeads.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 border border-emerald-900/35 bg-emerald-950/10 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Check className="h-4.5 w-4.5 text-emerald-400" />
                        <div>
                          <span className="block text-xs font-bold text-emerald-400">Template Verified</span>
                          <span className="text-[9px] text-zinc-400 mt-0.5 block">{stagedLeads.length} leads parsed. Review the staged grid below.</span>
                        </div>
                      </div>
                      <Badge variant="risk-low" className="text-[9px] uppercase tracking-wider rounded-md">Aligned</Badge>
                    </div>

                    <div className="border border-zinc-900 bg-zinc-950/50 rounded-lg overflow-x-auto max-h-[300px]">
                      <Table>
                        <TableHeader className="bg-zinc-900/50">
                          <TableRow className="border-zinc-900">
                            <TableHead className="text-[9px] uppercase font-bold text-zinc-550 h-8">Full Name</TableHead>
                            <TableHead className="text-[9px] uppercase font-bold text-zinc-550 h-8">Email</TableHead>
                            <TableHead className="text-[9px] uppercase font-bold text-zinc-550 h-8">Phone</TableHead>
                            <TableHead className="text-[9px] uppercase font-bold text-zinc-550 h-8">Funnel</TableHead>
                            <TableHead className="text-[9px] uppercase font-bold text-zinc-550 h-8">Est. Value</TableHead>
                            <TableHead className="text-[9px] uppercase font-bold text-zinc-550 h-8">Stage</TableHead>
                            <TableHead className="text-[9px] uppercase font-bold text-zinc-550 h-8"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {stagedLeads.map((item, idx) => (
                            <TableRow key={idx} className="border-zinc-900/60 hover:bg-zinc-900/20 text-xs">
                              <TableCell className="py-1">
                                <input
                                  type="text"
                                  className="bg-transparent border-0 text-white focus:outline-none focus:ring-0 w-28 text-[11px]"
                                  value={item.fullName}
                                  onChange={(e) => handleStagedChange(idx, 'fullName', e.target.value)}
                                />
                              </TableCell>
                              <TableCell className="py-1">
                                <input
                                  type="text"
                                  className="bg-transparent border-0 text-zinc-300 focus:outline-none focus:ring-0 w-36 text-[11px] font-mono"
                                  value={item.email}
                                  onChange={(e) => handleStagedChange(idx, 'email', e.target.value)}
                                />
                              </TableCell>
                              <TableCell className="py-1">
                                <input
                                  type="text"
                                  className="bg-transparent border-0 text-zinc-400 focus:outline-none focus:ring-0 w-28 text-[11px] font-mono"
                                  value={item.phone}
                                  onChange={(e) => handleStagedChange(idx, 'phone', e.target.value)}
                                />
                              </TableCell>
                              <TableCell className="py-1">
                                <input
                                  type="text"
                                  className="bg-transparent border-0 text-zinc-400 focus:outline-none focus:ring-0 w-24 text-[11px]"
                                  value={item.funnelName}
                                  onChange={(e) => handleStagedChange(idx, 'funnelName', e.target.value)}
                                />
                              </TableCell>
                              <TableCell className="py-1">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  className="bg-transparent border-0 text-zinc-300 focus:outline-none focus:ring-0 w-24 text-[11px] font-mono"
                                  value={item.estimatedClientValue ?? ''}
                                  onChange={(e) => handleStagedChange(idx, 'estimatedClientValue', e.target.value)}
                                />
                              </TableCell>
                              <TableCell className="py-1">
                                <select
                                  className="bg-zinc-900 border-0 text-white rounded focus:outline-none w-20 text-[10px]"
                                  value={item.status}
                                  onChange={(e) => handleStagedChange(idx, 'status', e.target.value)}
                                >
                                  <option value="procured">Procured</option>
                                  <option value="warm">Warm</option>
                                  <option value="cold">Cold</option>
                                  <option value="lost">Lost</option>
                                  <option value="closed">Closed</option>
                                </select>
                              </TableCell>
                              <TableCell className="py-1 text-center">
                                <button
                                  type="button"
                                  onClick={() => setStagedLeads(prev => prev.filter((_, i) => i !== idx))}
                                  className="text-zinc-600 hover:text-red-400 cursor-pointer"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    <div className="flex gap-3">
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setStagedLeads([]);
                          setIsTemplateAligned(null);
                          setUploadStatus('idle');
                        }}
                        className="h-9 font-semibold text-xs flex-1 rounded-md cursor-pointer"
                      >
                        Discard
                      </Button>
                      <Button
                        onClick={handleImportStaged}
                        className="h-9 font-semibold text-xs flex-1 rounded-md cursor-pointer"
                      >
                        Confirm & Import
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* LEAD DETAILS DIALOG MODAL */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSelectedLead(null)} />
          <Card className="relative z-10 w-full max-w-md bg-[#0d0e12] border-zinc-800 shadow-2xl p-2 font-sans text-xs rounded-md">
            <CardHeader className="border-b border-zinc-900 pb-3 flex flex-row items-center justify-between">
              <div>
                <span className="text-[9px] font-bold text-red-500 uppercase tracking-widest font-mono">Lead Identity Card</span>
                <CardTitle className="text-sm font-bold text-white uppercase tracking-wider mt-0.5">
                  {selectedLead.fullName}
                </CardTitle>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteLead(selectedLead.id)}
                  className="h-6 w-6 p-0 text-zinc-500 hover:text-red-400 rounded-md cursor-pointer"
                  title="Delete Lead"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedLead(null)}
                  className="h-6 w-6 p-0 text-zinc-500 hover:text-white rounded-md cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {/* Contact parameters */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 block">Email Address</span>
                  <span className="text-white font-mono mt-0.5 block break-all">{selectedLead.email}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 block">Phone Number</span>
                  <span className="text-white font-mono mt-0.5 block">{selectedLead.phone || 'N/A'}</span>
                </div>
              </div>

              {/* API and collection parameters */}
              <div className="grid gap-3 sm:grid-cols-2 pt-2 border-t border-zinc-900">
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 block">Approach Method</span>
                  <span className="text-zinc-300 mt-0.5 block font-semibold">{selectedLead.approachMethod || 'Email'}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 block">Collection Method</span>
                  <span className="text-zinc-300 mt-0.5 block">{selectedLead.collectionMethod || 'Manual Entry'}</span>
                </div>
              </div>

              {/* Approach and funnel info */}
              <div className="grid gap-3 sm:grid-cols-2 pt-2 border-t border-zinc-900">
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 block">Funnel Source</span>
                  <span className="text-zinc-300 mt-0.5 block">{selectedLead.funnelName || 'General Intake'}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 block">Acquisition Date</span>
                  <span className="text-zinc-400 font-mono mt-0.5 block">{new Date(selectedLead.createdTime).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 block">Estimated Client Value</span>
                  <span className="text-zinc-300 font-mono mt-0.5 block">
                    {selectedLead.estimatedClientValue === null ? 'Not set' : formatCurrency(selectedLead.estimatedClientValue)}
                  </span>
                </div>
              </div>

              {/* Status Select action */}
              <div className="pt-3 border-t border-zinc-900">
                <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">Lead Status Indicator</span>
                <select
                  value={selectedLead.status}
                  onChange={(e) => handleUpdateStatus(selectedLead.leadId, e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-md px-2.5 py-1.5 focus:outline-none focus:border-zinc-700 capitalize font-semibold text-xs cursor-pointer"
                >
                  <option value="procured">Procured</option>
                  <option value="warm">Warm</option>
                  <option value="cold">Cold</option>
                  <option value="lost">Lost</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  variant="secondary"
                  onClick={() => setSelectedLead(null)}
                  className="h-8 px-4 font-semibold text-xs rounded-md cursor-pointer"
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
