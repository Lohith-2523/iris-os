'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { WhatsappLogo } from '@phosphor-icons/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import {
  Users,
  Search,
  RefreshCw,
  Eye,
  CheckCircle2,
  X,
  AlertTriangle,
  TrendingUp,
  Award,
  Download,
  Upload,
  FileSpreadsheet,
  FileText,
  Check,
  Loader2,
  Trash2,
  Megaphone,
  GripVertical
} from 'lucide-react';
import { formatCurrency, formatUserMessage } from '@/lib/utils';
import { validateBrowserFile } from '@/lib/file-security';
import { CountryPhoneInput } from '@/components/ui/country-phone-input';
import { DateInput, DateTimeInput } from '@/components/ui/date-input';
import { WORKSPACE_AGENCY_LEADS_PREVIEW_EVENT } from '@/lib/workspace-tour-config';
import { PageSkeleton } from '@/components/ui/page-skeletons';
import { LEAD_EXPORT_TIMEFRAMES, resolveLeadExportTimeframe, type LeadExportTimeframe } from '@/lib/lead-export-timeframe';
import { useWorkspaceRuntime } from '@/components/demo/demo-mode-provider';
import { MetaLogo } from '@/components/integrations/meta-brand-lockup';

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
  sourceProvider?: string | null;
  adId?: string | null;
  adName?: string | null;
  campaignId?: string | null;
  formId?: string | null;
  adAccountId?: string | null;
  followUpAt?: string | null;
  lostReason?: string | null;
  lostDetails?: string | null;
  activity?: Array<{ type: string; status?: string; at: string; by?: string }> | null;
}

type LeadStage = { id: string; label: string; color: string };
const MAX_LEAD_STAGES = 8;
const DEFAULT_LEAD_STAGES: LeadStage[] = [
  { id: 'procured', label: 'Procured', color: '#A1A1AA' },
  { id: 'warm', label: 'Warm', color: '#F59E0B' },
  { id: 'cold', label: 'Cold', color: '#64748B' },
  { id: 'lost', label: 'Lost', color: '#E11D48' },
  { id: 'closed', label: 'Closed', color: '#10B981' },
];

const whatsAppHref = (phone: string) => `https://wa.me/${phone.replace(/\D/g, '')}`;

function localIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function defaultExportRange() {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 30);
  return { from: localIsoDate(start), to: localIsoDate(end) };
}

interface LeadMetrics {
  marketingSpend: number;
  closedLeadCount: number;
  sourcedRetainerRevenue: number;
  averageCac: number | null;
  averageRoas: number | null;
}

interface AgencyMetaData {
  metaAccessConsent: boolean;
  atlasMetaAnalyticsConsent: boolean;
  accounts: Array<{ adAccountId: string; accountName: string; lastSync: string | null }>;
  campaignCount: number;
  metrics: { spend: number; impressions: number; reach: number; clicks: number; leadsCount: number; ctr: number | null; cpc: number | null; cpm: number | null; costPerLead: number | null };
  ads: Array<{ id: string; adId: string; name: string; spend: number; impressions: number; reach?: number; clicks: number; leadsCount: number; campaign: { campaignId: string; name: string } | null }>;
}

interface MetaConnectionData {
  adAccounts: Array<{ id: string; name: string }>;
  selectedAdAccountIds: string[];
}

export default function AgencyLeadsPage() {
  const searchParams = useSearchParams();
  const requestedLeadId = searchParams.get('lead');
  const runtime = useWorkspaceRuntime();
  const router = runtime.router;
  const fetch = runtime.fetch;
  const [leads, setLeads] = React.useState<AgencyLead[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [syncing, setSyncing] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [activeTab, setActiveTab] = React.useState<'pipeline' | 'entry' | 'meta'>('pipeline');
  const [role, setRole] = React.useState('admin');
  const [agencyMeta, setAgencyMeta] = React.useState<AgencyMetaData | null>(null);
  const [metaConnection, setMetaConnection] = React.useState<MetaConnectionData | null>(null);
  const [selectedMetaAccountId, setSelectedMetaAccountId] = React.useState('');
  const [selectedCampaign, setSelectedCampaign] = React.useState('all');
  const [metaBusy, setMetaBusy] = React.useState(false);
  const [metaError, setMetaError] = React.useState('');
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
    ,followUpAt: '', lostReason: '', lostDetails: ''
  });
  const [formSubmitting, setFormSubmitting] = React.useState(false);
  const [formSuccess, setFormSuccess] = React.useState(false);
  const [formError, setFormError] = React.useState('');

  // Bulk Import State
  const [stagedLeads, setStagedLeads] = React.useState<any[]>([]);
  const [, setIsTemplateAligned] = React.useState<boolean | null>(null);
  const [, setUploadStatus] = React.useState<'idle' | 'success' | 'error'>('idle');
  const [isParsing, setIsParsing] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState('');

  // Selected lead for detail modal
  const [selectedLead, setSelectedLead] = React.useState<AgencyLead | null>(null);
  const tourTabRef = React.useRef<'pipeline' | 'entry' | 'meta' | null>(null);

  React.useEffect(() => {
    const showTourTab = (event: Event) => {
      const tab = (event as CustomEvent<{ tab?: 'pipeline' | 'entry' | 'meta' }>).detail?.tab;
      if (tab !== 'pipeline' && tab !== 'entry' && tab !== 'meta') return;
      tourTabRef.current = tab;
      setSelectedLead(null);
      setActiveTab(tab);
      const url = new URL(window.location.href);
      if (url.searchParams.has('lead')) {
        url.searchParams.delete('lead');
        window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
      }
    };
    window.addEventListener(WORKSPACE_AGENCY_LEADS_PREVIEW_EVENT, showTourTab);
    return () => window.removeEventListener(WORKSPACE_AGENCY_LEADS_PREVIEW_EVENT, showTourTab);
  }, []);

  React.useEffect(() => {
    if (!requestedLeadId || tourTabRef.current) return;
    const lead = leads.find((item) => item.id === requestedLeadId || item.leadId === requestedLeadId);
    if (lead) { setActiveTab('pipeline'); setSelectedLead(lead); }
  }, [leads, requestedLeadId]);
  const [leadDraft, setLeadDraft] = React.useState<any>(null);
  const [leadStages, setLeadStages] = React.useState<LeadStage[]>(DEFAULT_LEAD_STAGES);
  const [workspacePreferences, setWorkspacePreferences] = React.useState<Record<string, unknown>>({});
  const [showStageEditor, setShowStageEditor] = React.useState(false);
  const [draggedStageId, setDraggedStageId] = React.useState<string | null>(null);
  const [stagePendingRemoval, setStagePendingRemoval] = React.useState<LeadStage | null>(null);
  const [replacementStageId, setReplacementStageId] = React.useState('');
  const [savingStages, setSavingStages] = React.useState(false);
  const [stageEditorError, setStageEditorError] = React.useState('');
  const [savingLead, setSavingLead] = React.useState(false);
  const [lostDialog, setLostDialog] = React.useState<{ leadId: string; reason: string; details: string } | null>(null);
  const [archivedLeadCount, setArchivedLeadCount] = React.useState(0);
  const [exportOpen, setExportOpen] = React.useState(false);
  const [exportTimeframe, setExportTimeframe] = React.useState<LeadExportTimeframe>('1_month');
  const [exportRange, setExportRange] = React.useState(defaultExportRange);
  const [exporting, setExporting] = React.useState(false);
  const [exportError, setExportError] = React.useState('');

  // Spend value for calculating CAC/ROAS on this page

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      const [res, integrationsRes, workspaceRes] = await Promise.all([fetch('/api/agency-leads?view=kanban'), fetch('/api/integrations'), fetch('/api/workspace')]);
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads || []);
        setArchivedLeadCount(data.archive?.archivedLeadCount || 0);
        setMetrics(data.metrics || {
          marketingSpend: 0,
          closedLeadCount: 0,
          sourcedRetainerRevenue: 0,
          averageCac: null,
          averageRoas: null,
        });
        setRole(data.role || 'admin');
        setAgencyMeta(data.meta || null);
      }
      if (integrationsRes.ok) {
        const integrations = await integrationsRes.json();
        const meta = integrations.find((item: { provider: string }) => item.provider === 'META');
        setMetaConnection(meta?.meta || null);
      }
      if (workspaceRes.ok) {
        const workspace = await workspaceRes.json();
        const preferences = workspace.organization?.preferences || {};
        setWorkspacePreferences(preferences);
        if (Array.isArray(preferences.leadStages) && preferences.leadStages.length) {
          setLeadStages(preferences.leadStages.slice(0, MAX_LEAD_STAGES));
        }
      }
    } catch (e) {
      console.error('Failed to load agency leads data:', e);
    } finally {
      setLoading(false);
    }
  }, [fetch]);

  const postAgencyMeta = async (body: Record<string, unknown>) => {
    setMetaBusy(true);
    setMetaError('');
    try {
      const response = await fetch('/api/agency-leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to update Meta settings.');
      await loadData();
      return data;
    } catch (error) {
      setMetaError(formatUserMessage(error instanceof Error ? error.message : 'Unable to update Meta settings.'));
      return null;
    } finally {
      setMetaBusy(false);
    }
  };

  const connectMeta = () => {
    if (!agencyMeta?.metaAccessConsent) {
      setMetaError('Enable Meta access consent before connecting an account.');
      return;
    }
    const fb = (window as any).FB;
    const configId = process.env.NEXT_PUBLIC_META_LOGIN_CONFIG_ID;
    if (!fb || !configId) {
      setMetaError('Meta Login is not ready or configured for this deployment.');
      return;
    }
    setMetaBusy(true);
    fb.login((response: any) => {
      if (response.status !== 'connected' || !response.authResponse?.accessToken) {
        setMetaBusy(false);
        setMetaError('Meta authorization was cancelled or did not complete.');
        return;
      }
      void (async () => {
        try {
          const result = await fetch('/api/integrations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ provider: 'META', action: 'connect_sdk', authResponse: response.authResponse }) });
          const data = await result.json();
          if (!result.ok) throw new Error(data.error || 'Meta authorization failed.');
          setMetaConnection(data.meta);
        } catch (error) {
          setMetaError(formatUserMessage(error instanceof Error ? error.message : 'Meta authorization failed.'));
        } finally { setMetaBusy(false); }
      })();
    }, { config_id: configId, scope: 'public_profile,email,ads_read,business_management,leads_retrieval,pages_show_list,pages_manage_metadata', auth_type: 'rerequest', return_scopes: true });
  };

  const assignMetaAccount = async () => {
    if (!selectedMetaAccountId) return;
    setMetaBusy(true);
    setMetaError('');
    try {
      const selectedIds = Array.from(new Set([...(metaConnection?.selectedAdAccountIds || []), selectedMetaAccountId]));
      const selection = await fetch('/api/integrations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ provider: 'META', action: 'select_meta_accounts', accountIds: selectedIds }) });
      const selectionData = await selection.json();
      if (!selection.ok) throw new Error(selectionData.error || 'Unable to select the Meta account.');
      const assignment = await fetch('/api/agency-leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'assign_meta_account', adAccountId: selectedMetaAccountId }) });
      const assignmentData = await assignment.json();
      if (!assignment.ok) throw new Error(assignmentData.error || 'Unable to assign the Meta account.');
      await fetch('/api/agency-leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'sync_meta_account', adAccountId: selectedMetaAccountId }) });
      setSelectedMetaAccountId('');
      await loadData();
    } catch (error) {
      setMetaError(formatUserMessage(error instanceof Error ? error.message : 'Unable to assign the Meta account.'));
    } finally { setMetaBusy(false); }
  };

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  React.useEffect(() => {
    if (selectedLead) setLeadDraft({ ...selectedLead, followUpAt: selectedLead.followUpAt ? new Date(selectedLead.followUpAt).toISOString().slice(0, 16) : '' });
    else setLeadDraft(null);
  }, [selectedLead]);

  const handleSyncData = async () => {
    setSyncing(true);
    try {
      await loadData();
    } finally {
      setSyncing(false);
    }
  };

  // Update lead status
  const handleUpdateStatus = async (leadId: string, newStatus: string, lostReason?: string, lostDetails?: string) => {
    if (newStatus === 'lost' && !lostReason) {
      setLostDialog({ leadId, reason: '', details: '' });
      return;
    }
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
        body: JSON.stringify({ action: 'update_status', leadId, status: newStatus, lostReason, lostDetails }),
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

    if (!manualForm.fullName.trim() || !manualForm.email.trim() || !manualForm.phone.trim()) {
      setFormError('Full name, email address, and phone with country code are required.');
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
          ,followUpAt: '', lostReason: '', lostDetails: ''
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
    const csvContent = "IrisOS_Template_Identifier (DO NOT MODIFY),Full Name,Email ID,Phone Number,Other Details,Status,Lead Source,Estimated Client Value,Follow Up Date,Follow Up Time\nIRIS_OS_AGENCY_LEAD_IMPORT_v2,Vikram Patel,vikram@apex.co,+919876543210,Enterprise prospect,procured,Cold Outreach,250000,2026-08-10,14:30\nIRIS_OS_AGENCY_LEAD_IMPORT_v2,Aditi Sharma,aditi@apex.co,+919988776655,Requested proposal,warm,Referral,120000,2026-08-12,11:00";
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

  const downloadXlsxTemplate = async () => {
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Leads Import');
    sheet.addRow(['IrisOS_Template_Identifier (DO NOT MODIFY)', 'Full Name', 'Email ID', 'Phone Number', 'Other Details', 'Status', 'Lead Source', 'Estimated Client Value', 'Follow Up Date', 'Follow Up Time']);
    sheet.addRow(['IRIS_OS_AGENCY_LEAD_IMPORT_v2', 'Vikram Patel', 'vikram@apex.co', '+919876543210', 'Enterprise prospect', 'procured', 'Cold Outreach', 250000, '2026-08-10', '14:30']);
    sheet.columns = [{ width: 45 }, { width: 24 }, { width: 30 }, { width: 22 }, { width: 34 }, { width: 18 }, { width: 20 }, { width: 24 }, { width: 20 }, { width: 18 }];
    for (let row = 2; row <= 1000; row += 1) {
      sheet.getCell(`F${row}`).dataValidation = { type: 'list', allowBlank: false, formulae: [`"${leadStages.map((stage) => stage.id).join(',')}"`] };
      sheet.getCell(`G${row}`).dataValidation = { type: 'list', allowBlank: false, formulae: ['"Instagram,Facebook,WhatsApp,Cold Outreach,Ads,Referral,Email,Phone,LinkedIn"'] };
      sheet.getCell(`I${row}`).dataValidation = { type: 'date', allowBlank: true, operator: 'between', formulae: [new Date('2020-01-01'), new Date('2100-12-31')] };
      sheet.getCell(`J${row}`).dataValidation = { type: 'custom', allowBlank: true, formulae: [`OR(J${row}="",AND(J${row}>=0,J${row}<1))`] };
    }
    const buffer = await workbook.xlsx.writeBuffer();
    const url = URL.createObjectURL(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'irisos_agency_leads_template.xlsx'; anchor.click(); URL.revokeObjectURL(url);
  };

  // --- BATCH FILE UPLOAD HANDLERS ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = await validateBrowserFile(file, 'spreadsheet-import', { maxBytes: 5 * 1024 * 1024 });
    if (!validation.ok) {
      setErrorMsg(validation.error);
      setUploadStatus('error');
      return;
    }

    setIsParsing(true);
    setErrorMsg('');
    setUploadStatus('idle');
    setIsTemplateAligned(null);

    const isCsv = file.name.toLowerCase().endsWith('.csv');

    try {
      if (isCsv) {
        const reader = new FileReader();
        reader.onload = async (event) => {
          const text = event.target?.result as string;
          const hasIdentifier = text.includes('IRIS_OS_AGENCY_LEAD_IMPORT_v2');

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
                  estimatedClientValue: cols[7] || '',
                  followUpAt: cols[8] ? `${cols[8]}T${cols[9] || '09:00'}` : ''
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
            const XLSX = await import('xlsx');
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
              if (r.some((c: any) => String(c).includes('IRIS_OS_AGENCY_LEAD_IMPORT_v2'))) {
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
                    estimatedClientValue: r[7] === undefined || r[7] === null ? '' : String(r[7]),
                    followUpAt: r[8] ? `${String(r[8]).slice(0, 10)}T${String(r[9] || '09:00').slice(0, 5)}` : ''
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

  const exportLeads = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (exportTimeframe === 'custom' && (!exportRange.from || !exportRange.to)) {
      setExportError('Choose a start and end date.');
      return;
    }
    if (exportTimeframe === 'custom' && exportRange.from > exportRange.to) {
      setExportError('The start date must be on or before the end date.');
      return;
    }

    setExporting(true);
    setExportError('');
    try {
      const today = localIsoDate(new Date());
      const presetRange = resolveLeadExportTimeframe(exportTimeframe, today);
      const queryValues = exportTimeframe === 'custom' ? exportRange : presetRange;
      if (!queryValues) throw new Error('Unable to resolve the selected timeframe.');
      const query = new URLSearchParams(queryValues);
      const response = await fetch(`/api/agency-leads/export?${query.toString()}`, { cache: 'no-store' });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Unable to export leads.');
      }
      const blob = await response.blob();
      const disposition = response.headers.get('content-disposition') || '';
      const filename = disposition.match(/filename="?([^";]+)"?/i)?.[1] || 'crystalos-leads.xlsx';
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setExportOpen(false);
    } catch (error) {
      setExportError(formatUserMessage(error instanceof Error ? error.message : 'Unable to export leads.'));
    } finally {
      setExporting(false);
    }
  };

  const addLeadStage = () => {
    setLeadStages((current) => {
      if (current.length >= MAX_LEAD_STAGES) return current;
      const stageNumber = current.length + 1;
      return [...current, { id: `custom-stage-${stageNumber}`, label: `Stage ${stageNumber}`, color: '#94A3B8' }];
    });
  };

  const persistLeadStages = async (stages: LeadStage[], closeEditor = false) => {
    const stagesToSave = stages.slice(0, MAX_LEAD_STAGES);
    setSavingStages(true);
    setStageEditorError('');
    try {
      const response = await fetch('/api/workspace', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ organization: { preferences: { ...workspacePreferences, leadStages: stagesToSave } } }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Unable to save pipeline stages.');
      setLeadStages(stagesToSave);
      setWorkspacePreferences((current) => ({ ...current, leadStages: stagesToSave }));
      if (closeEditor) setShowStageEditor(false);
      return true;
    } catch (error) {
      setStageEditorError(formatUserMessage(error instanceof Error ? error.message : 'Unable to save pipeline stages.'));
      return false;
    } finally {
      setSavingStages(false);
    }
  };

  const saveLeadStages = () => void persistLeadStages(leadStages, true);

  const reorderLeadStages = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    setLeadStages((current) => {
      const sourceIndex = current.findIndex((stage) => stage.id === sourceId);
      const targetIndex = current.findIndex((stage) => stage.id === targetId);
      if (sourceIndex < 0 || targetIndex < 0) return current;
      const reordered = [...current];
      const [moved] = reordered.splice(sourceIndex, 1);
      reordered.splice(targetIndex, 0, moved);
      return reordered;
    });
  };

  const leadStageStatusAliases = (stageId: string) => {
    if (stageId === 'procured') return ['procured', 'new'];
    if (stageId === 'warm') return ['warm', 'cold-call in progress'];
    if (stageId === 'cold') return ['cold', 'call back required'];
    if (stageId === 'lost') return ['lost', 'unqualified'];
    return [stageId];
  };

  const openStageRemoval = (stage: LeadStage) => {
    const replacement = leadStages.find((item) => item.id !== stage.id);
    setReplacementStageId(replacement?.id || '');
    setStagePendingRemoval(stage);
    setStageEditorError('');
  };

  const removeLeadStage = async () => {
    if (!stagePendingRemoval || !replacementStageId) return;
    const nextStages = leadStages.filter((stage) => stage.id !== stagePendingRemoval.id);
    if (!nextStages.length) {
      setStageEditorError('Keep at least one pipeline stage.');
      return;
    }
    const sourceStatuses = leadStageStatusAliases(stagePendingRemoval.id);
    const affectedLeads = leads.filter((lead) => sourceStatuses.includes(lead.status?.toLowerCase() || ''));
    setSavingStages(true);
    setStageEditorError('');
    try {
      if (affectedLeads.length) {
        const response = await fetch('/api/agency-leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'migrate_stage_leads', sourceStatuses, destinationStatus: replacementStageId }) });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || 'Unable to move leads from this stage.');
      }
      const response = await fetch('/api/workspace', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ organization: { preferences: { ...workspacePreferences, leadStages: nextStages } } }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Unable to remove the pipeline stage.');
      setLeads((current) => current.map((lead) => sourceStatuses.includes(lead.status?.toLowerCase() || '') ? { ...lead, status: replacementStageId } : lead));
      setLeadStages(nextStages);
      setWorkspacePreferences((current) => ({ ...current, leadStages: nextStages }));
      setStagePendingRemoval(null);
      setReplacementStageId('');
    } catch (error) {
      setStageEditorError(formatUserMessage(error instanceof Error ? error.message : 'Unable to remove the pipeline stage.'));
    } finally {
      setSavingStages(false);
    }
  };

  const saveLeadDetails = async () => {
    if (!leadDraft) return;
    setSavingLead(true);
    try {
      const response = await fetch('/api/agency-leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'update', ...leadDraft }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Unable to save lead');
      setSelectedLead(payload.lead);
      await loadData();
    } catch (cause) { alert(cause instanceof Error ? cause.message : 'Unable to save lead'); }
    finally { setSavingLead(false); }
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
  const hasAgencyMetaAccount = (agencyMeta?.accounts.length || 0) > 0;
  const conversionRate = totalLeads > 0 ? (closedLeads / totalLeads) * 100 : 0;
  const leadSummaryMetrics = [
    { label: 'Total leads', value: totalLeads, icon: Users },
    { label: 'Won leads', value: closedLeads, icon: Award },
    { label: 'Lost leads', value: lostLeads, icon: X },
    { label: 'Win rate', value: `${conversionRate.toFixed(1)}%`, icon: TrendingUp },
  ];

  // Kanban Columns
  const columns = leadStages;
  const metaCampaigns = React.useMemo(() => {
    const map = new Map<string, { id: string; name: string; impressions: number }>();
    for (const ad of agencyMeta?.ads || []) {
      if (!ad.campaign) continue;
      const current = map.get(ad.campaign.campaignId) || { id: ad.campaign.campaignId, name: ad.campaign.name, impressions: 0 };
      current.impressions += ad.impressions;
      map.set(current.id, current);
    }
    return [...map.values()].sort((left, right) => right.impressions - left.impressions);
  }, [agencyMeta]);
  const visibleMetaAds = React.useMemo(() => (agencyMeta?.ads || []).filter((ad) => selectedCampaign === 'all' || ad.campaign?.campaignId === selectedCampaign).sort((left, right) => right.impressions - left.impressions), [agencyMeta, selectedCampaign]);
  const selectedMetaMetrics = React.useMemo(() => {
    if (selectedCampaign === 'all') return agencyMeta?.metrics;
    const totals = visibleMetaAds.reduce((sum, ad) => ({ spend: sum.spend + ad.spend, impressions: sum.impressions + ad.impressions, reach: sum.reach + (ad.reach || 0), clicks: sum.clicks + ad.clicks, leadsCount: sum.leadsCount + ad.leadsCount }), { spend: 0, impressions: 0, reach: 0, clicks: 0, leadsCount: 0 });
    return { ...totals, ctr: totals.impressions ? totals.clicks / totals.impressions * 100 : null, cpc: totals.clicks ? totals.spend / totals.clicks : null, cpm: totals.impressions ? totals.spend / totals.impressions * 1000 : null, costPerLead: totals.leadsCount ? totals.spend / totals.leadsCount : null };
  }, [agencyMeta, selectedCampaign, visibleMetaAds]);

  if (loading) {
    return <PageSkeleton variant="leads" />;
  }

  return (
    <div className="agency-leads-page space-y-6">
      {/* Header */}
      <div className="agency-leads-header flex flex-col gap-2 border-b border-zinc-800/60 pb-5 md:flex-row md:items-center md:justify-between">
        <div className="agency-leads-heading">
          <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest font-mono">Business Pipeline</span>
          <h1 className="text-2xl font-bold tracking-tight text-white silver-text-gradient font-sans mt-0.5">
            Business Leads Hub
          </h1>
        </div>
        <div className="agency-leads-header-actions flex flex-wrap items-center justify-end gap-3">
          <div className="agency-leads-summary-grid grid grid-cols-2 gap-2 sm:grid-cols-4">
            {leadSummaryMetrics.map(({ label, value, icon: Icon }) => (
              <div key={label} className="agency-leads-summary-card min-w-[116px] rounded-lg border border-zinc-800 bg-zinc-950/70 px-3 py-2.5 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</span>
                  <Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-zinc-600" />
                </div>
                <span className="mt-1 block font-mono text-lg font-bold text-white">{value}</span>
              </div>
            ))}
          </div>
          <div className="agency-leads-controls flex flex-wrap items-center justify-end gap-3">
          {/* Tab Selection */}
          <div className="agency-leads-tabs workspace-segmented-control flex w-full min-w-0 items-center gap-1 overflow-x-auto overscroll-x-contain rounded-lg border border-zinc-900 bg-zinc-950 p-1 scrollbar-none md:w-auto">
            <button
              data-tour="leads-pipeline-tab"
              onClick={() => setActiveTab('pipeline')}
              aria-pressed={activeTab === 'pipeline'}
              className={`workspace-segmented-trigger flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'pipeline' ? 'bg-white text-zinc-950 font-bold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Award className="h-3.5 w-3.5" />
              <span>Leads Pipeline</span>
            </button>
            <button
              data-tour="add-lead"
              onClick={() => setActiveTab('entry')}
              aria-pressed={activeTab === 'entry'}
              className={`workspace-segmented-trigger flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'entry' ? 'bg-white text-zinc-950 font-bold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Add Leads</span>
            </button>
            {role !== 'client' && (
              <button
                data-tour="meta-leads-tab"
                onClick={() => setActiveTab('meta')}
                aria-pressed={activeTab === 'meta'}
                className={`workspace-segmented-trigger flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'meta' ? 'bg-white text-zinc-950 font-bold' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Megaphone className="h-3.5 w-3.5" />
                <span>Meta Business</span>
              </button>
            )}
          </div>
          <div className="agency-leads-utilities flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setExportError(''); setExportOpen(true); }}
              className="agency-leads-export h-8 gap-1.5 rounded-md border-zinc-800 text-zinc-300"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Export leads</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSyncData}
              disabled={syncing}
              className="agency-leads-sync h-8 gap-1.5 rounded-md border-zinc-800 text-zinc-300"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
              <span>Sync</span>
            </Button>
          </div>
          </div>
        </div>
      </div>

      {activeTab === 'pipeline' ? (
        <>
          {/* Conversions & Efficiency reports */}
          {false && <div className="grid gap-4 sm:grid-cols-3">
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
                    {metrics.averageRoas === null ? '—' : `${metrics.averageRoas!.toFixed(2)}x`}
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
                    {metrics.averageCac === null ? '—' : formatCurrency(metrics.averageCac!, 2)}
                  </span>
                </div>
                <Users className="h-8 w-8 text-zinc-700" />
              </CardContent>
            </Card>
          </div>}

          {/* Filters */}
          <div className="agency-leads-filter-bar flex flex-col gap-4 md:flex-row md:items-center justify-between pb-2">
            <div className="agency-leads-search flex max-w-sm flex-1 items-center gap-2.5 rounded-md border border-zinc-800 bg-zinc-900/40 pl-3 transition-all focus-within:border-zinc-700 focus-within:bg-zinc-900/80">
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
            <div className="flex flex-wrap items-center justify-end gap-3">
              <span className="text-[10px] text-zinc-500">
                Showing the last 30 days{archivedLeadCount > 0 ? ` · ${archivedLeadCount.toLocaleString()} archived` : ''}
              </span>
              <Button type="button" variant="outline" onClick={() => setShowStageEditor((value) => !value)}>Customize stages</Button>
            </div>
          </div>

          {showStageEditor && (
            <Card>
              <CardHeader>
                <CardTitle>Pipeline stage names & accents</CardTitle>
                <CardDescription>Drag stages into the preferred order, then choose a name and accent. You can configure up to {MAX_LEAD_STAGES} stages.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {leadStages.map((stage, index) => (
                  <div
                    key={stage.id}
                    draggable
                    onDragStart={(event) => {
                      setDraggedStageId(stage.id);
                      event.dataTransfer.effectAllowed = 'move';
                      event.dataTransfer.setData('text/plain', stage.id);
                    }}
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = 'move';
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      const sourceId = draggedStageId || event.dataTransfer.getData('text/plain');
                      if (sourceId) reorderLeadStages(sourceId, stage.id);
                      setDraggedStageId(null);
                    }}
                    onDragEnd={() => setDraggedStageId(null)}
                    className={`agency-leads-stage-row grid grid-cols-[auto_minmax(0,1fr)_120px_auto] gap-3 rounded-xl border p-2 transition ${draggedStageId === stage.id ? 'border-zinc-500 bg-zinc-900/80 opacity-60' : 'border-zinc-800 bg-zinc-950/30'}`}
                  >
                    <button type="button" className="cursor-grab touch-none rounded-lg px-1 text-zinc-500 hover:text-white active:cursor-grabbing" aria-label={`Drag ${stage.label} to reorder`} title="Drag to reorder">
                      <GripVertical className="h-5 w-5" aria-hidden="true" />
                    </button>
                    <input value={stage.label} onChange={(event) => setLeadStages((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value } : item))} className="rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-white" aria-label={`Stage ${index + 1} name`} />
                    <input type="color" value={stage.color} onChange={(event) => setLeadStages((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, color: event.target.value } : item))} className="h-full w-full rounded-xl border border-zinc-800 bg-zinc-900 p-2" aria-label={`${stage.label} accent colour`} />
                    <Button type="button" variant="ghost" size="icon" onClick={() => openStageRemoval(stage)} disabled={leadStages.length <= 1 || savingStages} className="text-zinc-500 hover:bg-red-500/10 hover:text-red-400" aria-label={`Remove ${stage.label}`} title="Remove stage">
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                ))}
                {stageEditorError && <p role="alert" className="text-sm text-red-400">{stageEditorError}</p>}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <span className="text-sm text-zinc-500">{leadStages.length} / {MAX_LEAD_STAGES} stages</span>
                  <div className="flex flex-wrap gap-3">
                    <Button type="button" variant="outline" onClick={addLeadStage} disabled={leadStages.length >= MAX_LEAD_STAGES || savingStages}>Add stage</Button>
                    <Button type="button" onClick={saveLeadStages} disabled={savingStages}>{savingStages && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}{savingStages ? 'Saving…' : 'Save stage settings'}</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {stagePendingRemoval && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-labelledby="remove-stage-title">
              <Card className="w-full max-w-lg border-zinc-800 bg-zinc-950 shadow-2xl">
                <CardHeader>
                  <CardTitle id="remove-stage-title">Remove “{stagePendingRemoval.label}” stage?</CardTitle>
                  <CardDescription>
                    Leads in this stage will be moved to another stage so no pipeline records are hidden or lost.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <label className="block space-y-2 text-sm font-medium text-zinc-200">
                    Move existing leads to
                    <select value={replacementStageId} onChange={(event) => setReplacementStageId(event.target.value)} className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-white">
                      {leadStages.filter((stage) => stage.id !== stagePendingRemoval.id).map((stage) => <option key={stage.id} value={stage.id}>{stage.label}</option>)}
                    </select>
                  </label>
                  <p className="text-sm text-zinc-500">{leads.filter((lead) => leadStageStatusAliases(stagePendingRemoval.id).includes(lead.status?.toLowerCase() || '')).length} lead(s) will move with this stage removal.</p>
                  {stageEditorError && <p role="alert" className="text-sm text-red-400">{stageEditorError}</p>}
                  <div className="flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={() => { setStagePendingRemoval(null); setStageEditorError(''); }} disabled={savingStages}>Cancel</Button>
                    <Button type="button" onClick={() => void removeLeadStage()} disabled={!replacementStageId || savingStages} className="bg-red-600 text-white hover:bg-red-500">{savingStages && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}{savingStages ? 'Removing…' : 'Remove stage'}</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* KANBAN BOARD */}
          <div data-tour="lead-pipeline" className="agency-leads-kanban-viewport w-full max-w-full overflow-x-auto overscroll-x-contain">
          <div className="agency-leads-kanban-board grid min-w-max grid-cols-1 items-stretch gap-4 min-h-[715px]" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(286px, 1fr))` }}>
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
                  data-stage={col.id}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, col.id)}
                  className="agency-leads-kanban-column flex min-h-[644px] flex-col rounded-lg border bg-[#0a0a0a] p-3 text-zinc-900 transition-all duration-150"
                  style={{ '--stage-color': col.color } as React.CSSProperties}
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between border-b border-zinc-900 pb-2.5 mb-3">
                    <span className="agency-leads-kanban-title text-xs font-bold uppercase tracking-wider">
                      {col.label}
                    </span>
                    <Badge variant="outline" className="text-[9px] font-mono border-zinc-800 text-zinc-400 rounded-md">
                      {colLeads.length}
                    </Badge>
                  </div>

                  {/* Column Cards */}
                  <div className="agency-leads-kanban-list flex max-h-[858px] flex-1 flex-col gap-2 overflow-y-auto scrollbar-none">
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
                          className="agency-leads-kanban-card p-3 border border-zinc-900 bg-zinc-950/40 hover:bg-zinc-900/40 transition-all select-none text-[11px] relative group rounded-md cursor-grab active:cursor-grabbing"
                        >
                          <div className="flex min-w-0 justify-between gap-3 items-start">
                            <span className="agency-leads-card-name min-w-0 font-semibold text-white">
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
                          <span className="agency-leads-card-email mt-0.5 block text-[10px] text-zinc-500 font-mono">
                            {lead.email || 'Email not provided'}
                          </span>
                          {lead.sourceProvider === 'META' && <Badge variant="outline" className="mt-2 border-blue-900/50 text-[8px] text-blue-300">Meta lead</Badge>}
                          <span className="agency-leads-card-approach mt-2 block border-t border-zinc-900 pt-1.5 text-[9px] text-zinc-600 font-sans">
                            Approach: {lead.approachMethod || 'Not set'}
                          </span>
                          <div className={`mt-3 grid gap-2 ${lead.phone ? 'grid-cols-2' : 'grid-cols-1'}`}>
                            {lead.phone && <a href={whatsAppHref(lead.phone)} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()} className="agency-leads-whatsapp-button flex items-center justify-center gap-2 rounded-lg border px-2 py-2 font-semibold"><WhatsappLogo aria-hidden="true" className="h-4 w-4" weight="fill" />WhatsApp</a>}
                            <button type="button" onClick={(event) => { event.stopPropagation(); setSelectedLead(lead); }} className="flex items-center justify-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/70 px-2 py-2 font-semibold text-zinc-200 transition-colors hover:border-zinc-600 hover:bg-zinc-800 hover:text-white"><Eye className="h-4 w-4" />View more</button>
                          </div>
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
          </div>
        </>
      ) : activeTab === 'entry' ? (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column: Manual Form */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="rounded-md border-zinc-800/80 bg-zinc-950/40">
              <CardHeader>
                <CardTitle className="text-sm font-semibold text-white uppercase tracking-wider">Manual Lead Entry</CardTitle>
                <CardDescription className="text-xs">Create a single lead record manually by filling out client details.</CardDescription>
              </CardHeader>
              <CardContent>
                <form data-tour="add-lead-form" onSubmit={handleManualFormSubmit} className="space-y-4">
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
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-550">Phone Number</label>
                    <CountryPhoneInput required value={manualForm.phone} onChange={(phone) => setManualForm(prev => ({ ...prev, phone }))} />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-550">Other Details</label>
                    <input
                      type="text"
                      className="w-full rounded-md border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-xs text-white placeholder-zinc-600 focus:border-zinc-700 focus:outline-none transition-all"
                      placeholder="Context, needs, referral notes, or campaign detail"
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
                        {leadStages.map((stage) => <option key={stage.id} value={stage.id}>{stage.label}</option>)}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-550">Approach Method</label>
                      <select
                        className="w-full rounded-md border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-xs text-white focus:border-zinc-700 focus:outline-none transition-all cursor-pointer"
                        value={manualForm.approachMethod}
                        onChange={(e) => setManualForm(prev => ({ ...prev, approachMethod: e.target.value }))}
                      >
                        <option value="Instagram">Instagram</option>
                        <option value="Facebook">Facebook</option>
                        <option value="WhatsApp">WhatsApp</option>
                        <option value="Cold Outreach">Cold Outreach</option>
                        <option value="Ads">Ads</option>
                        <option value="Referral">Referral</option>
                        <option value="Email">Email</option>
                        <option value="Phone">Phone</option>
                        <option value="LinkedIn">LinkedIn</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5"><label className="text-[10px] font-bold uppercase tracking-widest text-zinc-550">Follow up date & time</label><DateTimeInput value={manualForm.followUpAt} onChange={(value) => setManualForm((current) => ({ ...current, followUpAt: value }))} className="grid grid-cols-[minmax(0,1fr)_7rem] gap-2" dateInputClassName="min-w-0 rounded-md border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-white" timeInputClassName="rounded-md border border-zinc-800 bg-zinc-900/50 px-2 py-2 text-white" /></div>
                  {manualForm.status === 'lost' && <div className="space-y-3 rounded-xl border border-rose-900/50 bg-rose-950/10 p-4"><label className="font-bold text-white">Why was the lead lost?</label><select required value={manualForm.lostReason} onChange={(event) => setManualForm((current) => ({ ...current, lostReason: event.target.value }))} className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-white"><option value="">Select a reason</option><option>Budget constraints</option><option>No response</option><option>Chose a competitor</option><option>Timing not right</option><option>Not a good fit</option><option>Duplicate or invalid lead</option><option>Other</option></select><textarea value={manualForm.lostDetails} onChange={(event) => setManualForm((current) => ({ ...current, lostDetails: event.target.value }))} placeholder="Optional additional details" className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-white" /></div>}

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
            <Card data-tour="lead-bulk-import" className="rounded-md border-zinc-800/80 bg-zinc-950/40">
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
                    <span className="text-[10px] text-zinc-550 block">Supports .csv or .xlsx spreadsheets containing the IrisOS aligned template.</span>
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
                                <CountryPhoneInput
                                  required
                                  value={item.phone}
                                  onChange={(phone) => handleStagedChange(idx, 'phone', phone)}
                                  className="w-36"
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
      ) : (
        <div className="space-y-5">
          {metaError && (
            <div className="rounded-md border border-rose-900/40 bg-rose-950/20 p-3 text-xs text-rose-300">{metaError}</div>
          )}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="rounded-md border-zinc-800/80 bg-zinc-950/40">
              <CardHeader>
                <CardTitle className="text-sm text-white">Business-owned Meta account</CardTitle>
                <CardDescription>Connect an account used to advertise your own business. Its form submissions join the same lead cards above.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button data-tour="connect-meta-leads" onClick={connectMeta} disabled={metaBusy || !agencyMeta?.metaAccessConsent} className="w-full">
                  <MetaLogo className="h-4 w-6" />{metaConnection ? 'Reconnect Meta' : 'Connect Meta'}
                </Button>
                {metaConnection && (
                  <div className="flex gap-2">
                    <select value={selectedMetaAccountId} onChange={(event) => setSelectedMetaAccountId(event.target.value)} className="min-w-0 flex-1 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white">
                      <option value="">Select your business ad account</option>
                      {metaConnection.adAccounts.map((account) => <option key={account.id} value={account.id}>{account.name} ({account.id})</option>)}
                    </select>
                    <Button onClick={() => void assignMetaAccount()} disabled={metaBusy || !selectedMetaAccountId}>Add & sync</Button>
                  </div>
                )}
                {(agencyMeta?.accounts || []).map((account) => (
                  <div key={account.adAccountId} className="flex items-center justify-between rounded-md border border-zinc-850 bg-zinc-950 p-3">
                    <div><div className="text-xs font-semibold text-white">{account.accountName}</div><div className="text-[10px] text-zinc-500">Last sync: {account.lastSync ? new Date(account.lastSync).toLocaleString() : 'Never'}</div></div>
                    <Button size="sm" variant="outline" disabled={metaBusy} onClick={() => void postAgencyMeta({ action: 'sync_meta_account', adAccountId: account.adAccountId })}><RefreshCw className="mr-1 h-3 w-3" /> Sync</Button>
                  </div>
                ))}
              </CardContent>
            </Card>
            {hasAgencyMetaAccount ? (
              <Card className="rounded-md border-zinc-800/80 bg-zinc-950/40">
              <CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><div><CardTitle className="text-sm text-white">Advertising performance</CardTitle><CardDescription>{agencyMeta?.campaignCount || 0} campaigns, ordered by impressions.</CardDescription></div><select value={selectedCampaign} onChange={(event) => setSelectedCampaign(event.target.value)} className="rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-white"><option value="all">All campaigns</option>{metaCampaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name} · {campaign.impressions.toLocaleString()} impressions</option>)}</select></div></CardHeader>
              <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {[
                  ['Spend', formatCurrency(selectedMetaMetrics?.spend || 0, 2)], ['Impressions', (selectedMetaMetrics?.impressions || 0).toLocaleString()], ['Reach', (selectedMetaMetrics?.reach || 0).toLocaleString()],
                  ['Clicks', (selectedMetaMetrics?.clicks || 0).toLocaleString()], ['CTR', selectedMetaMetrics?.ctr == null ? '—' : `${selectedMetaMetrics.ctr.toFixed(2)}%`], ['CPC', selectedMetaMetrics?.cpc == null ? '—' : formatCurrency(selectedMetaMetrics.cpc, 2)],
                  ['CPM', selectedMetaMetrics?.cpm == null ? '—' : formatCurrency(selectedMetaMetrics.cpm, 2)], ['Leads', String(selectedMetaMetrics?.leadsCount || 0)], ['Cost / lead', selectedMetaMetrics?.costPerLead == null ? '—' : formatCurrency(selectedMetaMetrics.costPerLead, 2)],
                ].map(([label, value]) => <div key={label} className="rounded-md border border-zinc-850 p-3"><div className="text-[9px] uppercase tracking-wider text-zinc-500">{label}</div><div className="mt-1 font-mono text-sm font-bold text-white">{value}</div></div>)}
              </CardContent>
              </Card>
            ) : (
              <Card className="flex min-h-64 items-center justify-center rounded-md border-dashed border-zinc-800/80 bg-zinc-950/20">
                <CardContent className="max-w-sm py-10 text-center">
                  <Megaphone className="mx-auto h-8 w-8 text-zinc-700" />
                  <p className="mt-4 text-sm font-semibold text-white">No Meta data to display</p>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">
                    Connect and sync a business-owned Meta ad account to populate campaign and advertising performance.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
          {hasAgencyMetaAccount && (
            <Card className="rounded-md border-zinc-800/80 bg-zinc-950/40">
            <CardHeader><CardTitle className="text-sm text-white">Top Meta ads</CardTitle><CardDescription>Provider-reported delivery and spend with leads retrieved into the business pipeline.</CardDescription></CardHeader>
            <CardContent><Table><TableHeader><TableRow><TableHead>Ad</TableHead><TableHead>Campaign</TableHead><TableHead>Spend</TableHead><TableHead>Impressions</TableHead><TableHead>Clicks</TableHead><TableHead>Leads</TableHead></TableRow></TableHeader><TableBody>
              {visibleMetaAds.map((ad) => <TableRow key={ad.id}><TableCell className="text-white">{ad.name}</TableCell><TableCell>{ad.campaign?.name || '—'}</TableCell><TableCell>{formatCurrency(ad.spend, 2)}</TableCell><TableCell>{ad.impressions.toLocaleString()}</TableCell><TableCell>{ad.clicks.toLocaleString()}</TableCell><TableCell>{ad.leadsCount}</TableCell></TableRow>)}
              {visibleMetaAds.length === 0 && <TableRow><TableCell colSpan={6} className="py-8 text-center text-zinc-500">No ads match this campaign.</TableCell></TableRow>}
              </TableBody></Table></CardContent>
            </Card>
          )}
          <Card className="rounded-md border-zinc-800/80 bg-zinc-950/40">
            <CardHeader><CardTitle>Meta form leads</CardTitle><CardDescription>Only leads captured from Meta ad instant forms appear here. Each also remains in the pipeline with Ads as its source.</CardDescription></CardHeader>
            <CardContent><Table><TableHeader><TableRow><TableHead>Lead</TableHead><TableHead>Ad</TableHead><TableHead>Campaign</TableHead><TableHead>Form</TableHead><TableHead>Captured</TableHead><TableHead>Action</TableHead></TableRow></TableHeader><TableBody>
              {leads.filter((lead) => lead.sourceProvider === 'META').map((lead) => { const ad = (agencyMeta?.ads || []).find((item) => item.adId === lead.adId); return <TableRow key={lead.id}><TableCell><button type="button" className="text-left font-semibold text-white hover:underline" onClick={() => { setSelectedLead(lead); setLeadDraft({ fullName: lead.fullName, email: lead.email, phone: lead.phone || '', status: lead.status, approachMethod: lead.approachMethod || 'Ads', funnelName: lead.funnelName || '', estimatedClientValue: String(lead.estimatedClientValue || ''), followUpAt: lead.followUpAt ? new Date(lead.followUpAt).toISOString().slice(0, 16) : '' }); }}>{lead.fullName}<span className="block text-zinc-500">{lead.email || lead.phone}</span></button></TableCell><TableCell>{lead.adName || 'Meta lead ad'}</TableCell><TableCell>{ad?.campaign?.name || lead.campaignId || '—'}</TableCell><TableCell>{lead.formId || '—'}</TableCell><TableCell>{new Date(lead.createdTime).toLocaleString()}</TableCell><TableCell>{lead.phone && <a className="font-semibold text-emerald-300 hover:underline" href={whatsAppHref(lead.phone)} target="_blank" rel="noreferrer">WhatsApp</a>}</TableCell></TableRow>; })}
              {!leads.some((lead) => lead.sourceProvider === 'META') && <TableRow><TableCell colSpan={6} className="py-10 text-center text-zinc-500">No Meta instant-form leads have been retrieved yet.</TableCell></TableRow>}
            </TableBody></Table></CardContent>
          </Card>
        </div>
      )}

      {exportOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="export-leads-title">
          <Card className="w-full max-w-lg border-zinc-800 bg-zinc-950 shadow-2xl">
            <form onSubmit={exportLeads}>
              <CardHeader className="border-b border-zinc-900">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle id="export-leads-title" className="flex items-center gap-2 text-white">
                      <FileSpreadsheet className="h-4 w-4 text-zinc-400" aria-hidden="true" />
                      Export lead history
                    </CardTitle>
                    <CardDescription className="mt-1.5 leading-5">
                      Download every stored lead acquired in the selected date range, including records archived from the Kanban after 30 days.
                    </CardDescription>
                  </div>
                  <Button type="button" variant="ghost" size="icon" onClick={() => setExportOpen(false)} disabled={exporting} aria-label="Close export dialog">
                    <X className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-5 pt-5">
                <label className="block space-y-2 text-xs font-semibold text-zinc-300">
                  <span>Timeframe</span>
                  <select
                    value={exportTimeframe}
                    onChange={(event) => { setExportTimeframe(event.target.value as LeadExportTimeframe); setExportError(''); }}
                    className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-white outline-none focus:border-zinc-600"
                  >
                    {LEAD_EXPORT_TIMEFRAMES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
                {exportTimeframe === 'custom' ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="space-y-2 text-xs font-semibold text-zinc-300">
                      <span>Start date</span>
                      <DateInput required value={exportRange.from} max={exportRange.to || undefined} onChange={(from) => setExportRange((current) => ({ ...current, from }))} className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-white outline-none focus:border-zinc-600" />
                    </label>
                    <label className="space-y-2 text-xs font-semibold text-zinc-300">
                      <span>End date</span>
                      <DateInput required value={exportRange.to} min={exportRange.from || undefined} onChange={(to) => setExportRange((current) => ({ ...current, to }))} className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-white outline-none focus:border-zinc-600" />
                    </label>
                  </div>
                ) : (
                  <div className="rounded-md border border-zinc-850 bg-zinc-900/40 px-3 py-2.5 text-xs text-zinc-400">
                    {exportTimeframe === 'all_time'
                      ? 'Exports all stored leads through today.'
                      : `Exports leads from today back through the selected ${LEAD_EXPORT_TIMEFRAMES.find((option) => option.value === exportTimeframe)?.label.toLowerCase()}.`}
                  </div>
                )}
                <div className="rounded-md border border-zinc-850 bg-zinc-900/40 p-3 text-xs leading-5 text-zinc-400">
                  The Excel file includes contact details, pipeline status, source, estimated value, follow-up data, conversion status, and available Meta attribution.
                </div>
                {exportError && <p role="alert" className="text-xs text-rose-400">{exportError}</p>}
                <div className="flex justify-end gap-3 border-t border-zinc-900 pt-4">
                  <Button type="button" variant="outline" onClick={() => setExportOpen(false)} disabled={exporting}>Cancel</Button>
                  <Button type="submit" disabled={exporting} className="min-w-36">
                    {exporting ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Preparing file</> : <><Download className="h-4 w-4" aria-hidden="true" /> Export Excel</>}
                  </Button>
                </div>
              </CardContent>
            </form>
          </Card>
        </div>
      )}

      {/* LEAD DETAILS DIALOG MODAL */}
      {selectedLead && leadDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSelectedLead(null)} />
          <Card className="relative z-10 max-h-[92vh] w-full max-w-3xl overflow-y-auto bg-[#0d0e12] border-zinc-800 shadow-2xl p-2 font-sans text-xs rounded-md">
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
                  <input type="email" required value={leadDraft.email} onChange={(event) => setLeadDraft({ ...leadDraft, email: event.target.value })} className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 p-2 text-white" />
                </div>
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 block">Phone Number</span>
                  <CountryPhoneInput required value={leadDraft.phone || ''} onChange={(phone) => setLeadDraft({ ...leadDraft, phone })} />
                </div>
              </div>

              {/* API and collection parameters */}
              <div className="grid gap-3 sm:grid-cols-2 pt-2 border-t border-zinc-900">
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 block">Approach Method</span>
                  <select value={leadDraft.approachMethod || 'Email'} onChange={(event) => setLeadDraft({ ...leadDraft, approachMethod: event.target.value })} className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 p-2 text-white"><option>Instagram</option><option>Facebook</option><option>WhatsApp</option><option>Cold Outreach</option><option>Ads</option><option>Referral</option><option>Email</option><option>Phone</option><option>LinkedIn</option></select>
                </div>
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 block">Collection Method</span>
                  <span className="text-zinc-300 mt-0.5 block">{selectedLead.collectionMethod || 'Manual Entry'}</span>
                </div>
              </div>

              {/* Approach and funnel info */}
              <div className="grid gap-3 sm:grid-cols-2 pt-2 border-t border-zinc-900">
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 block">Other Details</span>
                  <textarea value={leadDraft.funnelName || ''} onChange={(event) => setLeadDraft({ ...leadDraft, funnelName: event.target.value })} className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 p-2 text-white" />
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

              <div className="grid gap-3 sm:grid-cols-2 border-t border-zinc-900 pt-3"><div><span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 block">Lead name</span><input value={leadDraft.fullName} onChange={(event) => setLeadDraft({ ...leadDraft, fullName: event.target.value })} className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 p-2 text-white" /></div><div><span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 block">Follow-up date & time</span><DateTimeInput value={leadDraft.followUpAt || ''} onChange={(value) => setLeadDraft({ ...leadDraft, followUpAt: value })} className="mt-1 grid grid-cols-[minmax(0,1fr)_7rem] gap-2" dateInputClassName="min-w-0 rounded-xl border border-zinc-800 bg-zinc-900 p-2 text-white" timeInputClassName="rounded-xl border border-zinc-800 bg-zinc-900 p-2 text-white" /></div></div>

              {/* Status Select action */}
              <div className="pt-3 border-t border-zinc-900">
                <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">Lead Status Indicator</span>
                <select
                  value={selectedLead.status}
                  onChange={(e) => handleUpdateStatus(selectedLead.leadId, e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-md px-2.5 py-1.5 focus:outline-none focus:border-zinc-700 capitalize font-semibold text-xs cursor-pointer"
                >
                  {leadStages.map((stage) => <option key={stage.id} value={stage.id}>{stage.label}</option>)}
                </select>
              </div>

              <div className="border-t border-zinc-900 pt-3"><span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 block">Lead activity</span><div className="mt-2 max-h-32 space-y-2 overflow-y-auto">{(selectedLead.activity || []).slice().reverse().map((activity, index) => <div key={`${activity.at}-${index}`} className="rounded-xl border border-zinc-900 p-2 text-zinc-400">{activity.type.replaceAll('_', ' ')}{activity.status ? ` · ${activity.status}` : ''}<span className="block text-zinc-600">{new Date(activity.at).toLocaleString()} {activity.by ? `· ${activity.by}` : ''}</span></div>)}{!(selectedLead.activity || []).length && <div className="text-zinc-600">No activity logged yet.</div>}</div></div>

              <div className="flex flex-wrap justify-end gap-2 pt-2">
                {selectedLead.phone && <a href={`https://wa.me/${selectedLead.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="inline-flex items-center rounded-xl border border-zinc-700 px-4 py-2 font-semibold text-white">WhatsApp</a>}
                <Button type="button" variant="outline" onClick={() => router.push(`/proposals?tab=create&leadId=${encodeURIComponent(selectedLead.id)}`)}><FileText className="h-4 w-4" />Send proposal</Button>
                <Button type="button" variant="outline" onClick={() => router.push(`/calendar?lead=${encodeURIComponent(selectedLead.id)}&name=${encodeURIComponent(selectedLead.fullName)}`)}>Schedule meeting</Button>
                <Button type="button" disabled={savingLead} onClick={() => void saveLeadDetails()}>{savingLead ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving</> : 'Save & notify follow-up'}</Button>
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
      {lostDialog && <div className="fixed inset-0 z-[70] grid place-items-center bg-black/75 p-4"><Card className="w-full max-w-xl"><CardHeader><CardTitle>Why was the lead lost?</CardTitle><CardDescription>Select a common reason. Additional details are optional.</CardDescription></CardHeader><CardContent className="space-y-4"><select required value={lostDialog.reason} onChange={(event) => setLostDialog({ ...lostDialog, reason: event.target.value })} className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-white"><option value="">Select a reason</option><option>Budget constraints</option><option>No response</option><option>Chose a competitor</option><option>Timing not right</option><option>Not a good fit</option><option>Duplicate or invalid lead</option><option>Other</option></select><textarea value={lostDialog.details} onChange={(event) => setLostDialog({ ...lostDialog, details: event.target.value })} placeholder="Optional additional details" className="min-h-28 w-full rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-white" /><div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setLostDialog(null)}>Cancel</Button><Button disabled={!lostDialog.reason} onClick={async () => { const dialog = lostDialog; setLostDialog(null); await handleUpdateStatus(dialog.leadId, 'lost', dialog.reason, dialog.details); }}>Mark as lost</Button></div></CardContent></Card></div>}
    </div>
  );
}
