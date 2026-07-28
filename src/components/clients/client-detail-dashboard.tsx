'use client';

import * as React from 'react';
import { workspaceFetch as fetch } from '@/lib/workspace-data-cache';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MetaAdAccountSelect } from '@/components/integrations/meta-ad-account-select';
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
  Edit2,
  Megaphone,
  Search,
  RefreshCw,
  BarChart3,
  X,
  Lock,
  ArrowRight,
  Save,
  Download,
  FileText,
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
  canManageMetaAccounts: boolean;
  onClientUpdated: (client: any) => void;
}

function ClientBillingPanel({
  client,
  onClientUpdated,
  canGenerateInvoices,
}: {
  client: any;
  onClientUpdated: (client: any) => void;
  canGenerateInvoices: boolean;
}) {
  const [form, setForm] = React.useState({
    legalEntityName: client.legalEntityName || '',
    billingAddressLine1: client.billingAddressLine1 || '',
    billingAddressLine2: client.billingAddressLine2 || '',
    billingCity: client.billingCity || '',
    billingState: client.billingState || '',
    billingPostalCode: client.billingPostalCode || '',
    billingCountry: client.billingCountry || 'India',
    gstNumber: client.gstNumber || '',
  });
  const [invoices, setInvoices] = React.useState<any[]>(client.invoices || []);
  const [projects, setProjects] = React.useState<any[]>([]);
  const [loadingProjects, setLoadingProjects] = React.useState(true);
  const [generatingProjectId, setGeneratingProjectId] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState('');
  const [downloadingInvoiceId, setDownloadingInvoiceId] = React.useState<string | null>(null);

  React.useEffect(() => {
    Promise.all([
      fetch(`/api/invoices?clientId=${encodeURIComponent(client.id)}`),
      fetch(`/api/projects?clientId=${encodeURIComponent(client.id)}`),
    ])
      .then(async ([invoiceResponse, projectResponse]) => {
        setInvoices(invoiceResponse.ok ? await invoiceResponse.json() : client.invoices || []);
        setProjects(projectResponse.ok ? await projectResponse.json() : []);
      })
      .catch(() => {
        setInvoices(client.invoices || []);
        setProjects([]);
      })
      .finally(() => setLoadingProjects(false));
  }, [client.id, client.invoices]);

  const generateInvoice = async (projectId: string) => {
    if (generatingProjectId) return;
    setGeneratingProjectId(projectId);
    setMessage('');
    try {
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Unable to generate this invoice.');
      const invoiceResponse = await fetch(`/api/invoices?clientId=${encodeURIComponent(client.id)}`);
      if (invoiceResponse.ok) setInvoices(await invoiceResponse.json());
      setMessage(`Invoice ${result.invoice?.invoiceNumber || ''} generated and sent.`.trim());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to generate this invoice.');
    } finally {
      setGeneratingProjectId(null);
    }
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const response = await fetch('/api/clients', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: client.id, ...form }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Unable to save billing profile.');
      onClientUpdated(result.client);
      setMessage('Billing profile saved.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save billing profile.');
    } finally {
      setSaving(false);
    }
  };

  const requiredComplete = Boolean(
    form.billingAddressLine1
    && form.billingCity
    && form.billingState
    && form.billingPostalCode
    && form.billingCountry,
  );

  const downloadInvoice = async (invoice: any) => {
    if (downloadingInvoiceId) return;
    setDownloadingInvoiceId(invoice.id);
    setMessage('');
    try {
      // PDF responses are binary and must bypass the workspace JSON cache.
      const response = await globalThis.fetch(invoice.downloadUrl || `/api/invoices/${invoice.id}/pdf`, { cache: 'no-store' });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || 'Unable to download this invoice.');
      }
      const contentType = response.headers.get('content-type') || '';
      const blob = await response.blob();
      if (!contentType.includes('application/pdf') || blob.size < 500) {
        throw new Error('The server returned an invalid or empty invoice PDF.');
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${invoice.invoiceNumber || 'invoice'}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to download this invoice.');
    } finally {
      setDownloadingInvoiceId(null);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-white">
            <FileText className="h-4 w-4 text-zinc-500" /> Generate project invoice
          </CardTitle>
          <CardDescription>
            Invoice values come directly from each project&apos;s retainer or one-time payment setup.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Payment setup</TableHead>
                <TableHead className="text-right">Invoice value</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingProjects ? (
                <TableRow><TableCell colSpan={4} className="py-10 text-center text-zinc-500"><Loader2 className="mr-2 inline h-3.5 w-3.5 animate-spin" /> Loading projects...</TableCell></TableRow>
              ) : projects.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="py-10 text-center text-zinc-500">No projects are available for this client.</TableCell></TableRow>
              ) : projects.map((project) => {
                const hasAmount = Number(project.paymentAmount || 0) > 0;
                return (
                  <TableRow key={project.id}>
                    <TableCell>
                      <span className="block font-semibold text-white">{project.name}</span>
                      <span className="mt-1 block text-[9px] uppercase tracking-wider text-zinc-600">{project.status.replaceAll('_', ' ')}</span>
                    </TableCell>
                    <TableCell className="text-zinc-400">
                      {project.paymentType === 'ONE_TIME'
                        ? 'One-time payment'
                        : `Retainer${project.paymentFrequency ? ` · ${project.paymentFrequency}` : ''}`}
                    </TableCell>
                    <TableCell className="text-right font-mono text-zinc-300">
                      {hasAmount ? formatCurrency(project.paymentAmount) : 'Not configured'}
                    </TableCell>
                    <TableCell className="text-right">
                      {canGenerateInvoices && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={!hasAmount || Boolean(generatingProjectId)}
                          onClick={() => generateInvoice(project.id)}
                          className="gap-2"
                        >
                          {generatingProjectId === project.id && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                          Generate Invoice
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {message && <p className="border-t border-zinc-850 px-4 py-3 text-[10px] text-zinc-400">{message}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-white">Client invoice profile</CardTitle>
          <CardDescription>
            Address fields are required for invoice creation. Legal entity and GSTIN are optional.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={save} className="space-y-4">
            <div className={`rounded border p-3 text-[10px] leading-relaxed ${requiredComplete ? 'border-zinc-850 bg-zinc-950/35 text-zinc-500' : 'border-amber-900/40 bg-amber-950/15 text-amber-300'}`}>
              {requiredComplete
                ? 'Invoice address complete. This client is ready for invoice generation.'
                : 'Invoice creation is blocked until address line 1, city, state, postal code, and country are completed.'}
            </div>
            <div className="space-y-1.5">
              <label className="font-semibold text-zinc-400">Legal Entity Name</label>
              <input value={form.legalEntityName} onChange={(event) => setForm({ ...form, legalEntityName: event.target.value })} className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2.5 text-white outline-none focus:border-zinc-700" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <label className="font-semibold text-zinc-400">Address Line 1 *</label>
                <input value={form.billingAddressLine1} onChange={(event) => setForm({ ...form, billingAddressLine1: event.target.value })} className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2.5 text-white outline-none focus:border-zinc-700" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="font-semibold text-zinc-400">Address Line 2</label>
                <input value={form.billingAddressLine2} onChange={(event) => setForm({ ...form, billingAddressLine2: event.target.value })} className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2.5 text-white outline-none focus:border-zinc-700" />
              </div>
              <div className="space-y-1.5">
                <label className="font-semibold text-zinc-400">City *</label>
                <input value={form.billingCity} onChange={(event) => setForm({ ...form, billingCity: event.target.value })} className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2.5 text-white outline-none focus:border-zinc-700" />
              </div>
              <div className="space-y-1.5">
                <label className="font-semibold text-zinc-400">State / Region *</label>
                <input value={form.billingState} onChange={(event) => setForm({ ...form, billingState: event.target.value })} className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2.5 text-white outline-none focus:border-zinc-700" />
              </div>
              <div className="space-y-1.5">
                <label className="font-semibold text-zinc-400">Postal Code *</label>
                <input value={form.billingPostalCode} onChange={(event) => setForm({ ...form, billingPostalCode: event.target.value })} className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2.5 text-white outline-none focus:border-zinc-700" />
              </div>
              <div className="space-y-1.5">
                <label className="font-semibold text-zinc-400">Country *</label>
                <input value={form.billingCountry} onChange={(event) => setForm({ ...form, billingCountry: event.target.value })} className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2.5 text-white outline-none focus:border-zinc-700" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="font-semibold text-zinc-400">GST Number <span className="font-normal text-zinc-600">(optional)</span></label>
                <input value={form.gstNumber} onChange={(event) => setForm({ ...form, gstNumber: event.target.value.toUpperCase() })} className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2.5 font-mono uppercase text-white outline-none focus:border-zinc-700" />
              </div>
            </div>
            {message && <p className="text-[10px] text-zinc-400">{message}</p>}
            <Button type="submit" disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              {saving ? 'Saving...' : 'Save invoice profile'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-white">
            <FileText className="h-4 w-4 text-zinc-500" /> Client invoices
          </CardTitle>
          <CardDescription>Project-bound PDFs available to the agency administrator.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead className="text-right">PDF</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="py-12 text-center text-zinc-500">No invoices for this client.</TableCell></TableRow>
              ) : invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-mono font-semibold text-white">{invoice.invoiceNumber}</TableCell>
                  <TableCell className="text-zinc-400">{invoice.project?.name}</TableCell>
                  <TableCell><Badge className="border-zinc-800 bg-zinc-900 text-zinc-300">{invoice.status.replaceAll('_', ' ')}</Badge></TableCell>
                  <TableCell className="text-right font-mono text-zinc-300">{formatCurrency(invoice.balanceDue)}</TableCell>
                  <TableCell className="text-right">
                    <button type="button" onClick={() => downloadInvoice(invoice)} disabled={downloadingInvoiceId === invoice.id} className="inline-flex h-8 items-center gap-1 border border-zinc-800 px-2 text-[10px] font-semibold text-zinc-300 hover:text-white">
                      {downloadingInvoiceId === invoice.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} PDF
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ClientDetailDashboard({
  client,
  teamMembers,
  onBack,
  canManageMetaAccounts,
  onClientUpdated,
}: ClientDetailDashboardProps) {
  const [tasks, setTasks] = React.useState<any[]>([]);
  const [metaCampaigns, setMetaCampaigns] = React.useState<any[]>([]);
  const [metaLeads, setMetaLeads] = React.useState<any[]>([]);
  const [loadingTasks, setLoadingTasks] = React.useState(true);
  const [loadingMeta, setLoadingMeta] = React.useState(true);
  const [activeWorkspaceTab, setActiveWorkspaceTab] = React.useState<'overview' | 'billing'>('overview');

  // Meta Portal Relocated States
  const [isLeadsModalOpen, setIsLeadsModalOpen] = React.useState(false);
  const [leadsSearchQuery, setLeadsSearchQuery] = React.useState('');
  const [selectedLeadStatus, setSelectedLeadStatus] = React.useState('all');
  const [syncingAdAccount, setSyncingAdAccount] = React.useState(false);
  const [metaPerformanceError, setMetaPerformanceError] = React.useState('');
  const [assignedAdAccountId, setAssignedAdAccountId] = React.useState(client.adAccountId || '');
  const [pendingAdAccountId, setPendingAdAccountId] = React.useState(client.adAccountId || '');
  const [metaAssignmentStatus, setMetaAssignmentStatus] = React.useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [metaAssignmentError, setMetaAssignmentError] = React.useState('');
  const adAccountId = assignedAdAccountId || null;

  React.useEffect(() => {
    const currentAccountId = client.adAccountId || '';
    setAssignedAdAccountId(currentAccountId);
    setPendingAdAccountId(currentAccountId);
    setMetaAssignmentStatus('idle');
    setMetaAssignmentError('');
  }, [client.id, client.adAccountId]);

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
        // Performance records are eligible only after a provider-backed Meta sync.
        const filteredCampaigns = adAccountId
          ? (data.campaigns || []).filter((camp: any) =>
              camp.adAccountId === adAccountId && camp.providerSyncedAt,
            )
          : [];
        const filteredLeads = adAccountId
          ? (data.leads || []).filter((lead: any) => lead.adAccountId === adAccountId)
          : [];
        setMetaCampaigns(filteredCampaigns);
        setMetaLeads(filteredLeads);
      }
    } catch (e) {
      console.error('Error loading meta-portal data:', e);
    } finally {
      setLoadingMeta(false);
    }
  }, [adAccountId, client.id]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSyncAccount = async () => {
    if (!adAccountId) return;
    setSyncingAdAccount(true);
    setMetaPerformanceError('');
    try {
      const response = await fetch('/api/meta-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sync_performance',
          clientId: client.id,
          adAccountId,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Unable to sync Meta performance data.');
      }
      await loadData();
    } catch (error) {
      console.error(error);
      setMetaPerformanceError(formatUserMessage(
        error instanceof Error ? error.message : 'Unable to sync Meta performance data.',
      ));
    } finally {
      setSyncingAdAccount(false);
    }
  };

  const handleSaveMetaAccount = async () => {
    setMetaAssignmentStatus('saving');
    setMetaAssignmentError('');

    try {
      const response = await fetch('/api/clients', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: client.id,
          adAccountId: pendingAdAccountId || null,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Unable to assign the Meta ad account.');
      }

      const nextAccountId = payload.client?.adAccountId || '';
      setAssignedAdAccountId(nextAccountId);
      setPendingAdAccountId(nextAccountId);
      setMetaAssignmentStatus('success');
      onClientUpdated({ ...client, adAccountId: nextAccountId || null });
    } catch (error) {
      setMetaAssignmentStatus('error');
      setMetaAssignmentError(formatUserMessage(
        error instanceof Error ? error.message : 'Unable to assign the Meta ad account.',
      ));
    }
  };

  const handleUpdateLeadStatus = async (leadId: string, newStatus: string) => {
    try {
      const res = await fetch('/api/meta-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, status: newStatus }),
      });
      if (res.ok) {
        setMetaLeads((prev) =>
          prev.map((lead) => (lead.leadId === leadId ? { ...lead, status: newStatus } : lead))
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

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

  const totalSpend = React.useMemo(() => {
    return metaCampaigns.reduce((sum, camp) => {
      return sum + (camp.ads || []).reduce((adSum: number, ad: any) => adSum + ad.spend, 0);
    }, 0);
  }, [metaCampaigns]);

  const totalLeads = metaLeads.length;

  const avgCpl = totalLeads > 0 ? totalSpend / totalLeads : 0;

  const totalImpressions = React.useMemo(() => {
    return metaCampaigns.reduce((sum, camp) => {
      return sum + (camp.ads || []).reduce((adSum: number, ad: any) => adSum + ad.impressions, 0);
    }, 0);
  }, [metaCampaigns]);

  const totalReach = React.useMemo(() => {
    return metaCampaigns.reduce((sum, camp) => {
      return sum + (camp.ads || []).reduce((adSum: number, ad: any) => adSum + ad.reach, 0);
    }, 0);
  }, [metaCampaigns]);

  const totalClicks = React.useMemo(() => {
    return metaCampaigns.reduce((sum, camp) => {
      return sum + (camp.ads || []).reduce((adSum: number, ad: any) => adSum + ad.clicks, 0);
    }, 0);
  }, [metaCampaigns]);

  const hasMetaPerformance = metaCampaigns.some((campaign) => campaign.ads?.length > 0);
  const clickThroughRate = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : null;
  const costPerClick = totalClicks > 0 ? totalSpend / totalClicks : 0;
  const costPerThousandImpressions = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;

  const resolvedAgencyType = (client.agencyType || 'Digital Marketing').toLowerCase();

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

      <div className="flex gap-5 border-b border-zinc-850">
        <button type="button" onClick={() => setActiveWorkspaceTab('overview')} className={`border-b-2 pb-3 text-[10px] font-bold uppercase tracking-wider ${activeWorkspaceTab === 'overview' ? 'border-white text-white' : 'border-transparent text-zinc-600 hover:text-zinc-300'}`}>
          Operations overview
        </button>
        <button type="button" onClick={() => setActiveWorkspaceTab('billing')} className={`border-b-2 pb-3 text-[10px] font-bold uppercase tracking-wider ${activeWorkspaceTab === 'billing' ? 'border-white text-white' : 'border-transparent text-zinc-600 hover:text-zinc-300'}`}>
          Billing & invoices
        </button>
      </div>

      {activeWorkspaceTab === 'billing' && (
        <ClientBillingPanel
          client={client}
          onClientUpdated={onClientUpdated}
          canGenerateInvoices={canManageMetaAccounts}
        />
      )}

      {/* Main Splits */}
      <div className={activeWorkspaceTab === 'overview' ? 'grid gap-6 md:grid-cols-3' : 'hidden'}>
        {/* Left Column: Account, Team and Tasks */}
        <div className="md:col-span-1 space-y-6">
          
          {/* Client Account Card */}
          <Card>
            <CardHeader className="pb-3 border-b border-zinc-900">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Account Details</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-400 flex items-center gap-1.5"><Globe className="h-3.5 w-3.5 text-zinc-500" /> Domain</span>
                <span className="font-semibold text-zinc-300">{client.domain || 'Not configured'}</span>
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

          {/* Meta Integration & Sync Control */}
          <Card>
            <CardHeader className="pb-3 border-b border-zinc-900 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Meta Integration Controls</CardTitle>
                <CardDescription className="text-[10px] text-zinc-500 mt-0.5 font-sans">Verify access roles and synchronize campaign metrics.</CardDescription>
              </div>
              <Megaphone className="h-4 w-4 text-zinc-500" />
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {canManageMetaAccounts && (
                <div className="space-y-2 border-b border-zinc-900 pb-4">
                  <label htmlFor={`client-${client.id}-meta-account`} className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                    Client Meta ad account
                  </label>
                  <MetaAdAccountSelect
                    id={`client-${client.id}-meta-account`}
                    value={pendingAdAccountId}
                    onChange={(accountId) => {
                      setPendingAdAccountId(accountId);
                      setMetaAssignmentStatus('idle');
                      setMetaAssignmentError('');
                    }}
                    disabled={metaAssignmentStatus === 'saving'}
                  />
                  <Button
                    type="button"
                    onClick={handleSaveMetaAccount}
                    disabled={
                      metaAssignmentStatus === 'saving' ||
                      pendingAdAccountId === assignedAdAccountId
                    }
                    className="h-8 w-full bg-zinc-100 text-[10px] font-bold text-zinc-950 hover:bg-white"
                  >
                    {metaAssignmentStatus === 'saving' && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    )}
                    {metaAssignmentStatus === 'saving' ? 'Saving association…' : 'Save account association'}
                  </Button>
                  {metaAssignmentStatus === 'success' && (
                    <p className="text-[10px] text-emerald-400" role="status">
                      Meta ad account association updated.
                    </p>
                  )}
                  {metaAssignmentError && (
                    <p className="text-[10px] text-rose-300" role="alert">
                      {metaAssignmentError}
                    </p>
                  )}
                </div>
              )}
              {adAccountId ? <div className="space-y-3 pt-2">
                <div className="p-2.5 bg-zinc-950/40 border border-zinc-800 text-zinc-400 text-[9.5px] rounded-lg flex items-start gap-2">
                  <ShieldCheck className="h-4 w-4 text-zinc-500 shrink-0 mt-0.5" />
                  <span><strong>Synced account:</strong> {adAccountId}. Metrics are shown only after data is imported from Meta.</span>
                </div>
                <Button
                  onClick={handleSyncAccount}
                  disabled={syncingAdAccount}
                  className="w-full h-8.5 bg-white text-zinc-950 hover:bg-zinc-200 text-[10px] font-bold rounded-md flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:hover:bg-white"
                >
                  {syncingAdAccount ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Syncing Campaigns...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-3.5 w-3.5" />
                      <span>Sync Account Metrics</span>
                  </>
                )}
                </Button>
                {metaPerformanceError && (
                  <p className="text-[10px] text-rose-300" role="alert">
                    {metaPerformanceError}
                  </p>
                )}
              </div> : <p className="p-3 border border-zinc-800 text-xs text-zinc-500">No Meta ad account is associated with this client.</p>}
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
          {(resolvedAgencyType.includes('marketing') || resolvedAgencyType.includes('advertising')) && (
            <div className="space-y-6">
              
              {/* Top Section: Ad Campaign Performance & Metrics */}
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-zinc-800/60">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <BarChart3 className="h-4 w-4 text-indigo-500" />
                    <span>Ad Campaign Performance & Metrics</span>
                  </h3>
                  <Badge variant="outline" className="text-[8px] bg-zinc-900 border-zinc-800 text-zinc-400">
                    Meta-synced data
                  </Badge>
                </div>

                {hasMetaPerformance ? (
                <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                  <Card>
                    <CardHeader className="pb-1">
                      <CardTitle className="text-[9px] font-bold uppercase tracking-wider text-zinc-550">Ad Spend</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-base font-bold font-mono tracking-tight text-white">{formatCurrency(totalSpend)}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-1">
                      <CardTitle className="text-[9px] font-bold uppercase tracking-wider text-zinc-550">Impressions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-base font-bold font-mono tracking-tight text-white">{totalImpressions.toLocaleString()}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-1">
                      <CardTitle className="text-[9px] font-bold uppercase tracking-wider text-zinc-550">Clicks</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-base font-bold font-mono tracking-tight text-white">{totalClicks.toLocaleString()}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-1">
                      <CardTitle className="text-[9px] font-bold uppercase tracking-wider text-zinc-550">CTR</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-base font-bold font-mono tracking-tight text-white">{clickThroughRate?.toFixed(2) ?? '—'}%</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-1">
                      <CardTitle className="text-[9px] font-bold uppercase tracking-wider text-zinc-550">Avg CPC</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-base font-bold font-mono tracking-tight text-white">{formatCurrency(costPerClick, 2)}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-1">
                      <CardTitle className="text-[9px] font-bold uppercase tracking-wider text-zinc-550">Avg CPM</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-base font-bold font-mono tracking-tight text-white">{formatCurrency(costPerThousandImpressions, 2)}</div>
                    </CardContent>
                  </Card>
                  <Card className="col-span-2">
                    <CardHeader className="pb-1">
                      <CardTitle className="text-[9px] font-bold uppercase tracking-wider text-zinc-550">Reach Scope</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-base font-bold font-mono tracking-tight text-white">{totalReach.toLocaleString()} Users</div>
                    </CardContent>
                  </Card>
                </div>
                ) : (
                  <Card>
                    <CardContent className="p-6 text-center text-xs text-zinc-500">
                      No Meta performance data has been synchronized for this account. Use &ldquo;Sync Account Metrics&rdquo; to pull delivery data from Meta.
                    </CardContent>
                  </Card>
                )}

                {/* Ad Creatives list table */}
                <Card>
                  <CardHeader className="pb-3 border-b border-zinc-900 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Meta Campaign Creatives</CardTitle>
                      <CardDescription className="text-[10px] text-zinc-500">Delivery data imported from the connected Meta ad account.</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 p-0">
                    {loadingMeta ? (
                      <div className="p-8 text-center text-zinc-500 flex items-center justify-center gap-2">
                        <Loader2 className="h-4.5 w-4.5 animate-spin" />
                        <span>Syncing ad creatives...</span>
                      </div>
                    ) : !hasMetaPerformance ? (
                      <div className="p-8 text-center text-zinc-650 italic">No Meta performance data has been synchronized for this account.</div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Creative Name</TableHead>
                            <TableHead>Platform</TableHead>
                            <TableHead>Spend</TableHead>
                            <TableHead>Impressions</TableHead>
                            <TableHead>Clicks</TableHead>
                            <TableHead className="text-right">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {metaCampaigns.flatMap(camp => camp.ads || []).map((ad: any) => (
                            <TableRow key={ad.id}>
                              <TableCell className="font-semibold text-white">{ad.name}</TableCell>
                              <TableCell className="font-mono text-[9px] uppercase text-zinc-450">{ad.platform}</TableCell>
                              <TableCell className="font-mono text-zinc-300">{formatCurrency(ad.spend)}</TableCell>
                              <TableCell className="font-mono text-zinc-300">{ad.impressions.toLocaleString()}</TableCell>
                              <TableCell className="font-mono text-zinc-300">{ad.clicks.toLocaleString()}</TableCell>
                              <TableCell className="text-right">
                                <Badge variant={ad.status === 'ACTIVE' ? 'risk-low' : 'outline'} className="rounded-none uppercase tracking-wider text-[8px]">
                                  {ad.status}
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

              {/* Bottom Section: Leads Captured Feed & Pipeline Metrics */}
              <div className="space-y-4 pt-4 border-t border-zinc-900">
                <div className="flex justify-between items-center pb-2 border-b border-zinc-800/60">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <Megaphone className="h-4 w-4 text-emerald-500" />
                    <span>Leads Feed & Pipeline Metrics</span>
                  </h3>
                  <Badge variant="outline" className="text-[8px] bg-zinc-900 border-zinc-800 text-zinc-400">
                    Real-time Leads Router
                  </Badge>
                </div>

                <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                  <Card>
                    <CardHeader className="pb-1">
                      <CardTitle className="text-[9px] font-bold uppercase tracking-wider text-zinc-550">Leads Captured</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-base font-bold font-mono tracking-tight text-white">{totalLeads} Leads</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-1">
                      <CardTitle className="text-[9px] font-bold uppercase tracking-wider text-zinc-550">Average CPL</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-base font-bold font-mono tracking-tight text-white">{formatCurrency(avgCpl, 2)}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-1">
                      <CardTitle className="text-[9px] font-bold uppercase tracking-wider text-zinc-550">Conversion Rate</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-base font-bold font-mono tracking-tight text-white">
                        {totalClicks > 0 ? ((totalLeads / totalClicks) * 100).toFixed(2) : '0.00'}%
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-1">
                      <CardTitle className="text-[9px] font-bold uppercase tracking-wider text-zinc-550">Closed Leads</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-base font-bold font-mono tracking-tight text-emerald-450">
                        {metaLeads.filter((l: any) => l.status === 'closed').length} Won
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Leads Preview List Table */}
                <Card>
                  <CardHeader className="pb-3 border-b border-zinc-900 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Leads Pipeline Preview</CardTitle>
                      <CardDescription className="text-[10px] text-zinc-500">Most recent leads routed from live ad forms.</CardDescription>
                    </div>
                    <Button
                      onClick={() => setIsLeadsModalOpen(true)}
                      className="h-7 px-3 bg-white text-zinc-950 hover:bg-zinc-200 text-[10px] rounded-md font-bold cursor-pointer"
                    >
                      <span>View Full Leads Feed</span>
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </CardHeader>
                  <CardContent className="pt-4 p-0">
                    {loadingMeta ? (
                      <div className="p-8 text-center text-zinc-500 flex items-center justify-center gap-2">
                        <Loader2 className="h-4.5 w-4.5 animate-spin" />
                        <span>Loading leads...</span>
                      </div>
                    ) : metaLeads.length === 0 ? (
                      <div className="p-8 text-center text-zinc-650 italic">No leads collected yet.</div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Lead Profile</TableHead>
                            <TableHead>Contact Detail</TableHead>
                            <TableHead>Collection Source</TableHead>
                            <TableHead className="text-right">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {metaLeads.slice(0, 5).map((lead: any) => (
                            <TableRow key={lead.id}>
                              <TableCell className="font-semibold text-white">{lead.fullName}</TableCell>
                              <TableCell>
                                <span className="block text-[10px] text-zinc-300 font-mono">{lead.email}</span>
                              </TableCell>
                              <TableCell className="font-mono text-zinc-400 text-[10px]">{lead.collectionMethod || 'FB Form'}</TableCell>
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

            </div>
          )}

          {/* SEO AGENCY WIDGETS */}
          {resolvedAgencyType.includes('seo') && (
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
          {resolvedAgencyType.includes('web design') && (
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
          {resolvedAgencyType.includes('social media') && (
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

      {/* Centered Expanded Leads Feed Modal */}
      {isLeadsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-850 w-full max-w-4xl p-6 shadow-2xl relative max-h-[90vh] flex flex-col rounded-2xl">
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-4 border-b border-zinc-900">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Megaphone className="h-4 w-4 text-emerald-500 animate-pulse" />
                  <span>Client Leads Pipeline - Full Feed</span>
                </h3>
                <p className="text-[10px] text-zinc-550 mt-0.5">Filter, search, and qualify routed leads below.</p>
              </div>
              <button 
                onClick={() => setIsLeadsModalOpen(false)} 
                className="text-zinc-500 hover:text-white p-1.5 hover:bg-zinc-900 rounded-md transition-colors cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row gap-3 py-4 border-b border-zinc-900">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-650" />
                <input
                  type="text"
                  placeholder="Search lead profiles by name, email..."
                  value={leadsSearchQuery}
                  onChange={(e) => setLeadsSearchQuery(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-850 pl-9 pr-4 py-2 text-[11px] text-white outline-none rounded-md focus:border-zinc-700 placeholder-zinc-650"
                />
              </div>
              <div className="w-full sm:w-44">
                <select
                  value={selectedLeadStatus}
                  onChange={(e) => setSelectedLeadStatus(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-850 px-2 py-2 text-[11px] text-white outline-none rounded-md cursor-pointer focus:border-zinc-700"
                >
                  <option value="all">All Lead Statuses</option>
                  <option value="new">New</option>
                  <option value="cold-call in progress">Cold-call In Progress</option>
                  <option value="call back required">Call Back Required</option>
                  <option value="closed">Closed / Won</option>
                  <option value="unqualified">Unqualified</option>
                </select>
              </div>
            </div>

            {/* Modal Body: Leads List Table */}
            <div className="flex-1 overflow-y-auto my-4 scrollbar-none">
              {metaLeads.filter((lead: any) => {
                const matchesSearch = (lead.fullName || '').toLowerCase().includes(leadsSearchQuery.toLowerCase()) ||
                  (lead.email || '').toLowerCase().includes(leadsSearchQuery.toLowerCase());
                const matchesStatus = selectedLeadStatus === 'all' || lead.status === selectedLeadStatus;
                return matchesSearch && matchesStatus;
              }).length === 0 ? (
                <div className="p-12 border border-dashed border-zinc-850 text-center text-zinc-650 italic rounded-xl bg-zinc-900/10">
                  No matching leads located in the pipeline.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lead Profile</TableHead>
                      <TableHead>Contact Info</TableHead>
                      <TableHead>Funnel / Method</TableHead>
                      <TableHead>Approach Source</TableHead>
                      <TableHead>Routing Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {metaLeads
                      .filter((lead: any) => {
                        const matchesSearch = (lead.fullName || '').toLowerCase().includes(leadsSearchQuery.toLowerCase()) ||
                          (lead.email || '').toLowerCase().includes(leadsSearchQuery.toLowerCase());
                        const matchesStatus = selectedLeadStatus === 'all' || lead.status === selectedLeadStatus;
                        return matchesSearch && matchesStatus;
                      })
                      .map((lead: any) => (
                        <TableRow key={lead.id}>
                          <TableCell className="font-semibold text-white">{lead.fullName || 'Name not provided'}</TableCell>
                          <TableCell>
                            <div>
                              <span className="block text-[10px] text-zinc-300 font-mono">{lead.email || 'Not provided'}</span>
                              <span className="block text-[9px] text-zinc-500 font-mono mt-0.5">{lead.phone || 'N/A'}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <span className="block text-zinc-350">{lead.funnelName || 'Default Funnel'}</span>
                              <span className="block text-[8.5px] text-zinc-550 font-mono uppercase mt-0.5">{lead.collectionMethod || 'FB Form'}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="rounded-md font-semibold uppercase text-[8px]">
                              {lead.approachMethod || 'Cold Email'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                lead.status === 'closed'
                                  ? 'risk-low'
                                  : lead.status === 'unqualified'
                                  ? 'outline'
                                  : 'risk-medium'
                              }
                              className="rounded-md uppercase tracking-wider text-[8px]"
                            >
                              {lead.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right select-none">
                            <select
                              value={lead.status}
                              onChange={(e) => handleUpdateLeadStatus(lead.leadId, e.target.value)}
                              className="text-[10px] bg-zinc-900 border border-zinc-800 p-1 text-white outline-none rounded-md cursor-pointer hover:border-zinc-700"
                            >
                              <option value="new">New</option>
                              <option value="cold-call in progress">In Progress</option>
                              <option value="call back required">CallBack Req</option>
                              <option value="closed">Closed / Won</option>
                              <option value="unqualified">Unqualified</option>
                            </select>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-zinc-900 flex justify-end">
              <Button
                onClick={() => setIsLeadsModalOpen(false)}
                className="bg-white text-zinc-950 hover:bg-zinc-200 text-[10px] font-bold px-4 h-8 rounded-md"
              >
                Close View
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* --- ADD TASK MODAL DIALOG --- */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 w-full max-w-md p-6 shadow-2xl relative rounded-xl">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Create Client Task</h3>
            
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-550">Task Title *</label>
                <input
                  type="text"
                  required
                  placeholder="E.g. Setup landing page conversions"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  className="w-full text-xs bg-zinc-900 border border-zinc-800 focus:border-zinc-700 px-3 py-2 text-white outline-none rounded-md"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-550">Task Description</label>
                <textarea
                  placeholder="Detail the deliverable details..."
                  rows={3}
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  className="w-full text-xs bg-zinc-900 border border-zinc-800 focus:border-zinc-700 p-2.5 text-white outline-none rounded-md"
                />
              </div>

              <div className="grid gap-4 grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-550">Assign Staff</label>
                  <select
                    value={taskForm.assignedToId}
                    onChange={(e) => setTaskForm({ ...taskForm, assignedToId: e.target.value })}
                    className="w-full text-xs bg-zinc-900 border border-zinc-800 focus:border-zinc-700 px-3 py-2 text-white outline-none rounded-md"
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
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-550">Initial Status</label>
                  <select
                    value={taskForm.status}
                    onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value })}
                    className="w-full text-xs bg-zinc-900 border border-zinc-800 focus:border-zinc-700 px-3 py-2 text-white outline-none rounded-md"
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
                  className="rounded-md text-xs text-zinc-500 hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-white text-zinc-955 hover:bg-zinc-200 rounded-md text-xs font-semibold px-6"
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
