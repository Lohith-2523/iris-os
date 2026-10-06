'use client';

import * as React from 'react';
import { Download, FileText, LayoutDashboard, ListPlus, Loader2, Pencil, Plus, ReceiptText, Send, Sparkles, Trash2, X } from 'lucide-react';
import { downloadFileFromUrl } from '@/lib/browser-download';
import { missingBillingProfileFields } from '@/lib/invoices/billing-profile';
import { AgencyBillingProfileNotice } from '@/components/invoices/agency-billing-profile-notice';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';
import { PageSkeleton } from '@/components/ui/page-skeletons';
import { DateInput } from '@/components/ui/date-input';
import { useWorkspaceRuntime } from '@/components/demo/demo-mode-provider';
import { WORKSPACE_INVOICES_PREVIEW_EVENT } from '@/lib/workspace-tour-config';

type PageTab = 'OVERVIEW' | 'TAX' | 'PROFORMA';
type LineItemForm = { description: string; quantity: number; unitPrice: number };
type LeadOption = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
};

const emptyItem = (): LineItemForm => ({ description: '', quantity: 1, unitPrice: 0 });
const fieldClass = 'w-full border border-zinc-850 bg-zinc-900/40 p-2.5 text-white outline-none placeholder:text-zinc-600 focus:border-zinc-700';

function statusLabel(status: string, documentType?: string) {
  if (documentType === 'PROFORMA') return 'Proforma';
  if (status === 'PARTIALLY_PAID') return 'Partially paid';
  if (status === 'FULLY_PAID') return 'Fully paid';
  return 'Unpaid';
}

function statusClass(status: string, documentType?: string) {
  if (documentType === 'PROFORMA') return 'border-zinc-700 bg-zinc-800/60 text-zinc-200';
  if (status === 'FULLY_PAID') return 'border-emerald-900/40 bg-emerald-950/20 text-emerald-400';
  if (status === 'PARTIALLY_PAID') return 'border-amber-900/40 bg-amber-950/20 text-amber-400';
  return 'border-zinc-700 bg-zinc-900 text-zinc-300';
}

function ItemEditor({
  items,
  taxRate,
  onChange,
}: {
  items: LineItemForm[];
  taxRate: number;
  onChange: (items: LineItemForm[]) => void;
}) {
  const update = (index: number, key: keyof LineItemForm, value: string | number) => {
    onChange(items.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item));
  };
  const subtotal = items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0);
  const tax = subtotal * Number(taxRate || 0) / 100;

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto border border-zinc-850">
        <div className="min-w-[650px]">
          <div className="grid grid-cols-[minmax(250px,1fr)_100px_170px_44px] gap-2 border-b border-zinc-850 bg-zinc-950/50 px-3 py-2 text-[9px] font-bold uppercase tracking-wider text-zinc-500">
            <span>Item / deliverable</span><span>Quantity</span><span>Price per unit</span><span />
          </div>
          {items.map((item, index) => (
            <div key={index} className="grid grid-cols-[minmax(250px,1fr)_100px_170px_44px] gap-2 border-b border-zinc-850/70 px-3 py-3 last:border-0">
              <input
                required
                value={item.description}
                onChange={(event) => update(index, 'description', event.target.value)}
                placeholder="Deliverable name"
                maxLength={300}
                className="border border-zinc-800 bg-zinc-900/50 px-2.5 py-2 text-xs text-white outline-none placeholder:text-zinc-600 focus:border-zinc-600"
              />
              <input
                required
                type="number"
                min="0.01"
                step="0.01"
                value={item.quantity}
                onChange={(event) => update(index, 'quantity', Number(event.target.value))}
                onFocus={(event) => event.currentTarget.select()}
                className="border border-zinc-800 bg-zinc-900/50 px-2.5 py-2 text-xs text-white outline-none focus:border-zinc-600"
              />
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={item.unitPrice}
                onChange={(event) => update(index, 'unitPrice', Number(event.target.value))}
                onFocus={(event) => {
                  if (Number(event.currentTarget.value) === 0) {
                    event.currentTarget.value = '';
                  } else {
                    event.currentTarget.select();
                  }
                }}
                onBlur={(event) => {
                  if (!event.currentTarget.value) event.currentTarget.value = '0';
                }}
                className="border border-zinc-800 bg-zinc-900/50 px-2.5 py-2 text-xs text-white outline-none focus:border-zinc-600"
              />
              <button
                type="button"
                aria-label={`Remove item ${index + 1}`}
                disabled={items.length === 1}
                onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}
                className="flex items-center justify-center border border-zinc-800 text-zinc-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={items.length >= 8}
          onClick={() => onChange([...items, emptyItem()])}
          className="gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" /> Add item
        </Button>
        <div className="flex gap-5 text-right text-[10px]">
          <div><span className="block text-zinc-600">Subtotal</span><strong className="font-mono text-zinc-300">{formatCurrency(subtotal)}</strong></div>
          <div><span className="block text-zinc-600">Tax ({Number(taxRate || 0)}%)</span><strong className="font-mono text-zinc-300">{formatCurrency(tax)}</strong></div>
          <div><span className="block text-zinc-500">Total</span><strong className="font-mono text-white">{formatCurrency(subtotal + tax)}</strong></div>
        </div>
      </div>
    </div>
  );
}

function RequiredLabel({ children }: { children: React.ReactNode }) {
  return <span className="font-semibold text-zinc-400">{children} <span className="text-rose-500" aria-hidden="true">*</span></span>;
}

export default function InvoicesPage() {
  const { fetch } = useWorkspaceRuntime();
  const [invoices, setInvoices] = React.useState<any[]>([]);
  const [projects, setProjects] = React.useState<any[]>([]);
  const [leads, setLeads] = React.useState<LeadOption[]>([]);
  const [agencyBillingMissingFields, setAgencyBillingMissingFields] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [creating, setCreating] = React.useState(false);
  const [creatingProjectInvoice, setCreatingProjectInvoice] = React.useState(false);

  React.useEffect(() => {
    const showTourTab = (event: Event) => {
      const tab = (event as CustomEvent<{ tab?: PageTab }>).detail?.tab;
      if (tab === 'OVERVIEW' || tab === 'TAX' || tab === 'PROFORMA') setTab(tab);
    };
    window.addEventListener(WORKSPACE_INVOICES_PREVIEW_EVENT, showTourTab);
    return () => window.removeEventListener(WORKSPACE_INVOICES_PREVIEW_EVENT, showTourTab);
  }, []);
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState('');
  const [tab, setTab] = React.useState<PageTab>('OVERVIEW');
  const [downloadingInvoiceId, setDownloadingInvoiceId] = React.useState<string | null>(null);
  const [projectInvoiceProjectId, setProjectInvoiceProjectId] = React.useState('');
  const [taxForm, setTaxForm] = React.useState({
    projectId: '',
    description: '',
    taxRate: 18,
    termsOfSale: '',
  });
  const [taxItems, setTaxItems] = React.useState<LineItemForm[]>([emptyItem()]);
  const [proformaForm, setProformaForm] = React.useState({
    leadId: '',
    invoiceNumber: '',
    issuedDate: '',
    validUntil: '',
    referenceName: '',
    customerName: '',
    customerLegalName: '',
    customerEmail: '',
    customerAddressLine1: '',
    customerAddressLine2: '',
    customerCity: '',
    customerState: '',
    customerPostalCode: '',
    customerCountry: '',
    customerGstNumber: '',
    description: '',
    taxRate: 18,
    termsOfSale: '',
  });
  const [proformaItems, setProformaItems] = React.useState<LineItemForm[]>([emptyItem()]);
  const [mutatingInvoiceId, setMutatingInvoiceId] = React.useState<string | null>(null);
  const [editingInvoice, setEditingInvoice] = React.useState<any | null>(null);
  const [editForm, setEditForm] = React.useState<{
    invoiceNumber: string; issuedDate: string; dueDate: string; description: string;
    termsOfSale: string; taxRate: number; lineItems: LineItemForm[];
  } | null>(null);

  const openInvoiceEditor = (invoice: any) => {
    const savedItems = Array.isArray(invoice.lineItems) ? invoice.lineItems : [];
    setEditingInvoice(invoice);
    setEditForm({
      invoiceNumber: invoice.invoiceNumber,
      issuedDate: String(invoice.issuedDate || invoice.createdAt).slice(0, 10),
      dueDate: invoice.dueDate ? String(invoice.dueDate).slice(0, 10) : '',
      description: invoice.description || '',
      termsOfSale: invoice.termsOfSale || '',
      taxRate: Number(invoice.taxRate || 0),
      lineItems: savedItems.length ? savedItems.map((item: any) => ({ description: String(item.description || ''), quantity: Number(item.quantity || 1), unitPrice: Number(item.unitPrice || 0) })) : [{ description: invoice.description || invoice.invoiceNumber, quantity: 1, unitPrice: Number(invoice.subtotal || invoice.amount || 0) }],
    });
  };

  const saveInvoiceEdits = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingInvoice || !editForm || mutatingInvoiceId) return;
    setMutatingInvoiceId(editingInvoice.id); setError(''); setSuccess('');
    try {
      const response = await fetch('/api/invoices', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editingInvoice.id, ...editForm }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Unable to update the invoice.');
      setSuccess(`Invoice ${editForm.invoiceNumber} was updated.`); setEditingInvoice(null); setEditForm(null); await load();
    } catch (updateError) { setError(updateError instanceof Error ? updateError.message : 'Unable to update the invoice.'); }
    finally { setMutatingInvoiceId(null); }
  };

  const deleteInvoice = async (invoice: any) => {
    if (!window.confirm(`Delete ${invoice.invoiceNumber}? This cannot be undone.`)) return;
    setMutatingInvoiceId(invoice.id); setError(''); setSuccess('');
    try {
      const response = await fetch(`/api/invoices?id=${encodeURIComponent(invoice.id)}`, { method: 'DELETE' });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Unable to delete the invoice.');
      setSuccess(`Invoice ${invoice.invoiceNumber} was deleted.`); await load();
    } catch (deleteError) { setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete the invoice.'); }
    finally { setMutatingInvoiceId(null); }
  };

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [invoiceResponse, projectResponse, leadResponse, organizationResponse] = await Promise.all([
        fetch('/api/invoices'),
        fetch('/api/projects'),
        fetch('/api/agency-leads'),
        fetch('/api/organization'),
      ]);
      if (!invoiceResponse.ok) throw new Error('Unable to load invoices.');
      setInvoices(await invoiceResponse.json());
      if (projectResponse.ok) setProjects(await projectResponse.json());
      if (leadResponse.ok) {
        const leadData = await leadResponse.json();
        setLeads(Array.isArray(leadData.leads) ? leadData.leads : []);
      }
      if (organizationResponse.ok) {
        const organization = await organizationResponse.json();
        if (organization) {
          setAgencyBillingMissingFields(missingBillingProfileFields(organization, {
            requireLegalName: true,
            label: 'agency',
          }));
        }
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load invoices.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const createInvoice = async (event: React.FormEvent) => {
    event.preventDefault();
    if (creating || tab === 'OVERVIEW') return;
    setCreating(true);
    setError('');
    setSuccess('');
    const payload = tab === 'TAX'
      ? { mode: 'DETAILED', ...taxForm, lineItems: taxItems }
      : { mode: 'PROFORMA', ...proformaForm, lineItems: proformaItems };
    try {
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Unable to create invoice.');
      setSuccess(`${result.invoice.documentType === 'PROFORMA' ? 'Proforma invoice' : 'Tax invoice'} ${result.invoice.invoiceNumber} was created.`);
      if (tab === 'TAX') {
        setTaxForm({ projectId: '', description: '', taxRate: 18, termsOfSale: '' });
        setTaxItems([emptyItem()]);
      } else {
        setProformaForm({
          leadId: '', invoiceNumber: '', issuedDate: '', validUntil: '', referenceName: '',
          customerName: '', customerLegalName: '', customerEmail: '',
          customerAddressLine1: '', customerAddressLine2: '', customerCity: '',
          customerState: '', customerPostalCode: '', customerCountry: '',
          customerGstNumber: '', description: '', taxRate: 18, termsOfSale: '',
        });
        setProformaItems([emptyItem()]);
      }
      await load();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Unable to create invoice.');
    } finally {
      setCreating(false);
    }
  };

  const downloadInvoice = async (invoice: any) => {
    if (downloadingInvoiceId) return false;
    setDownloadingInvoiceId(invoice.id);
    setError('');
    try {
      downloadFileFromUrl(invoice.downloadUrl, `${invoice.invoiceNumber || 'invoice'}.pdf`);
      return true;
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : 'Unable to download this invoice.');
      return false;
    } finally {
      setDownloadingInvoiceId(null);
    }
  };

  const createProjectInvoice = async () => {
    if (!projectInvoiceProjectId || creatingProjectInvoice) return;
    setCreatingProjectInvoice(true);
    setError('');
    setSuccess('');
    try {
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'PROJECT', projectId: projectInvoiceProjectId }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Unable to create the project tax invoice.');
      const downloaded = await downloadInvoice({
        ...result.invoice,
        downloadUrl: `/api/invoices/${result.invoice.id}/pdf`,
      });
      if (downloaded) {
        setSuccess(`Tax invoice ${result.invoice.invoiceNumber} was generated, emailed to the client, and downloaded.`);
      }
      setProjectInvoiceProjectId('');
      await load();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Unable to create the project tax invoice.');
    } finally {
      setCreatingProjectInvoice(false);
    }
  };

  const outstanding = invoices.reduce((sum, invoice) => sum + Number(invoice.balanceDue || 0), 0);
  const partialCount = invoices.filter((invoice) => invoice.status === 'PARTIALLY_PAID').length;
  const selectedInvoiceProject = projects.find((project) => project.id === projectInvoiceProjectId);
  const selectedProformaLead = leads.find((lead) => lead.id === proformaForm.leadId);
  const validItems = (items: LineItemForm[]) => items.every((item) => item.description.trim() && item.quantity > 0 && item.unitPrice >= 0);
  const canSubmitTax = Boolean(taxForm.projectId && validItems(taxItems) && taxForm.taxRate >= 0 && taxForm.taxRate <= 40);
  const canSubmitProforma = Boolean(
    proformaForm.leadId
    && proformaForm.invoiceNumber.trim()
    && proformaForm.issuedDate
    && proformaForm.referenceName.trim()
    && proformaForm.customerName.trim()
    && proformaForm.customerEmail.trim()
    && proformaForm.customerAddressLine1.trim()
    && proformaForm.customerCity.trim()
    && proformaForm.customerState.trim()
    && proformaForm.customerPostalCode.trim()
    && proformaForm.customerCountry.trim()
    && proformaForm.description.trim()
    && validItems(proformaItems)
    && proformaForm.taxRate >= 0
    && proformaForm.taxRate <= 40
  );

  const invoiceRegister = (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold text-white">Invoice register</CardTitle>
        <CardDescription>Tax invoices and proforma quotations created for this workspace.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Document</TableHead><TableHead>Customer / Project</TableHead><TableHead>Due / Valid</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="text-right">Balance</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {!loading && invoices.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="py-14 text-center text-zinc-500">No invoices or proformas yet.</TableCell></TableRow>
              ) : invoices.map((invoice) => {
                const buyer = invoice.buyerSnapshot as { name?: string; legalEntityName?: string } | null;
                const customerName = invoice.client?.name || invoice.lead?.fullName || buyer?.legalEntityName || buyer?.name || 'Manual customer';
                return (
                  <TableRow key={invoice.id}>
                    <TableCell><span className="block font-mono font-semibold text-white">{invoice.invoiceNumber}</span><span className="mt-1 block text-[9px] uppercase text-zinc-600">{invoice.documentType === 'PROFORMA' ? 'Proforma invoice' : 'Tax invoice'}</span></TableCell>
                    <TableCell><span className="block font-semibold text-zinc-300">{customerName}</span><span className="mt-1 block text-[10px] text-zinc-500">{invoice.project?.name || 'Standalone quotation'}</span></TableCell>
                    <TableCell className="text-zinc-400">{invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : '—'}</TableCell>
                    <TableCell><Badge className={statusClass(invoice.status, invoice.documentType)}>{statusLabel(invoice.status, invoice.documentType)}</Badge></TableCell>
                    <TableCell className="text-right font-mono text-white">{formatCurrency(invoice.amount)}</TableCell>
                    <TableCell className="text-right font-mono text-zinc-300">{invoice.documentType === 'PROFORMA' ? '—' : formatCurrency(invoice.balanceDue)}</TableCell>
                    <TableCell className="text-right"><div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => downloadInvoice(invoice)} disabled={downloadingInvoiceId === invoice.id} aria-label={`Download ${invoice.invoiceNumber}`}>
                        {downloadingInvoiceId === invoice.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openInvoiceEditor(invoice)} disabled={mutatingInvoiceId === invoice.id} aria-label={`Edit ${invoice.invoiceNumber}`}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => void deleteInvoice(invoice)} disabled={mutatingInvoiceId === invoice.id} aria-label={`Delete ${invoice.invoiceNumber}`} className="text-rose-400 hover:text-rose-300"><Trash2 className="h-4 w-4" /></Button>
                    </div></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) return <PageSkeleton variant="invoices" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 border-b border-zinc-800/60 pb-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="silver-text-gradient text-2xl font-bold tracking-tight text-white">Invoices</h1>
          <p className="text-xs text-zinc-500">Review your register, create tax invoices, and prepare standalone proforma quotations.</p>
        </div>
        <Badge className="border-zinc-800 bg-zinc-900 text-zinc-300">{invoices.length} documents</Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-[10px] uppercase tracking-wider text-zinc-500">Outstanding</CardTitle></CardHeader><CardContent className="font-mono text-xl font-bold text-white">{formatCurrency(outstanding)}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-[10px] uppercase tracking-wider text-zinc-500">Partially paid</CardTitle></CardHeader><CardContent className="font-mono text-xl font-bold text-amber-400">{partialCount}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-[10px] uppercase tracking-wider text-zinc-500">Proforma invoices</CardTitle></CardHeader><CardContent className="font-mono text-xl font-bold text-white">{invoices.filter((invoice) => invoice.documentType === 'PROFORMA').length}</CardContent></Card>
      </div>

      <AgencyBillingProfileNotice missingFields={agencyBillingMissingFields} />

      {error && <div role="alert" className="border border-amber-900/40 bg-amber-950/15 p-3 text-xs text-amber-300">{error}</div>}
      {success && <div role="status" className="border border-zinc-700 bg-zinc-900/60 p-3 text-xs text-zinc-200">{success}</div>}

      <div className="w-full min-w-0 overflow-x-auto overscroll-x-contain border-b border-zinc-800 scrollbar-none" role="tablist" aria-label="Invoice workspace">
        <div className="flex min-w-max gap-7">
          {([
            ['OVERVIEW', LayoutDashboard, 'Overview'],
            ['TAX', ListPlus, 'Tax Invoice'],
            ['PROFORMA', ReceiptText, 'Proforma Invoice'],
          ] as const).map(([value, Icon, label]) => (
            <button
              data-tour={value === 'TAX' ? 'create-invoice' : value === 'PROFORMA' ? 'create-proforma' : undefined}
              key={value}
              type="button"
              role="tab"
              aria-selected={tab === value}
              onClick={() => {
                setTab(value);
                setError('');
                setSuccess('');
              }}
              className={`relative flex shrink-0 items-center gap-2 whitespace-nowrap pb-3 text-xs font-semibold transition-colors ${tab === value ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <Icon className="h-4 w-4" />
              {label}
              {tab === value && <span className="absolute inset-x-0 -bottom-px h-px bg-white" />}
            </button>
          ))}
        </div>
      </div>

      {tab === 'OVERVIEW' && (
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          {invoiceRegister}
          <Card className="min-h-[282px]">
            <CardHeader>
              <div className="mb-3 flex h-9 w-9 items-center justify-center border border-zinc-800 bg-zinc-950">
                <ReceiptText className="h-4 w-4 text-white" />
              </div>
              <CardTitle className="text-sm font-semibold text-white">Project tax invoice</CardTitle>
              <CardDescription>Select a project to generate, email, and download its invoice.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="block space-y-1.5 text-xs">
                <RequiredLabel>Project</RequiredLabel>
                <select
                  required
                  value={projectInvoiceProjectId}
                  onChange={(event) => setProjectInvoiceProjectId(event.target.value)}
                  className={fieldClass}
                >
                  <option value="">Select project...</option>
                  {projects.map((project) => <option key={project.id} value={project.id}>{project.client?.name} — {project.name}</option>)}
                </select>
              </label>
              <div className="border border-zinc-850 bg-zinc-950/40 p-3 text-[10px] leading-relaxed text-zinc-500">
                {selectedInvoiceProject
                  ? `${selectedInvoiceProject.tasks?.length || 1} deliverable${selectedInvoiceProject.tasks?.length === 1 ? '' : 's'} will be picked automatically and allocated across the project value.`
                  : 'Project deliverables are picked automatically and divided across the configured project value.'}
              </div>
              <Button
                type="button"
                className="w-full gap-2"
                disabled={!projectInvoiceProjectId || creatingProjectInvoice || agencyBillingMissingFields.length > 0}
                onClick={createProjectInvoice}
              >
                {creatingProjectInvoice ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {creatingProjectInvoice ? 'Generating Invoice…' : 'Generate Invoice'}
              </Button>
              <p className="text-[9px] leading-relaxed text-zinc-600">One click creates a tax invoice, emails the attached PDF to the client, and downloads a copy.</p>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'TAX' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-white"><FileText className="h-4 w-4 text-zinc-500" /> Create tax invoice</CardTitle>
            <CardDescription>Enter line items manually, then apply one tax rate to the invoice subtotal.</CardDescription>
          </CardHeader>
          <CardContent>
            <form data-tour="invoice-form" onSubmit={createInvoice} className="space-y-5 text-xs">
              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
                <label className="space-y-1.5"><RequiredLabel>Project</RequiredLabel>
                  <select required value={taxForm.projectId} onChange={(event) => setTaxForm((current) => ({ ...current, projectId: event.target.value }))} className={fieldClass}>
                    <option value="">Select project...</option>
                    {projects.map((project) => <option key={project.id} value={project.id}>{project.client?.name} — {project.name}</option>)}
                  </select>
                </label>
                <label className="space-y-1.5"><RequiredLabel>Tax on subtotal</RequiredLabel>
                  <div className="relative">
                    <input required type="number" min="0" max="40" step="0.01" value={taxForm.taxRate} onChange={(event) => setTaxForm((current) => ({ ...current, taxRate: Number(event.target.value) }))} onFocus={(event) => event.currentTarget.select()} className={`${fieldClass} pr-8`} />
                    <span className="pointer-events-none absolute right-3 top-2.5 text-zinc-500">%</span>
                  </div>
                </label>
              </div>
              <label className="block space-y-1.5"><span className="font-semibold text-zinc-400">Invoice description</span>
                <input value={taxForm.description} onChange={(event) => setTaxForm((current) => ({ ...current, description: event.target.value }))} maxLength={2000} placeholder="Optional invoice summary" className={fieldClass} />
              </label>
              <ItemEditor items={taxItems} taxRate={taxForm.taxRate} onChange={setTaxItems} />
              <label className="block space-y-1.5"><span className="font-semibold text-zinc-400">Terms and Conditions</span>
                <textarea value={taxForm.termsOfSale} onChange={(event) => setTaxForm((current) => ({ ...current, termsOfSale: event.target.value }))} maxLength={4000} rows={3} placeholder="Optional payment, delivery, or cancellation terms" className={fieldClass} />
              </label>
              <div className="flex justify-end">
                <Button data-tour="invoice-generate" type="submit" disabled={creating || !canSubmitTax || agencyBillingMissingFields.length > 0} className="gap-2">
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {creating ? 'Creating and sending…' : 'Create tax invoice'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {tab === 'PROFORMA' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-white"><ReceiptText className="h-4 w-4 text-zinc-500" /> Create proforma invoice</CardTitle>
            <CardDescription>Prepare a quotation for a lead. Contact details are pulled from the selected lead automatically.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={createInvoice} className="space-y-6 text-xs">
              <section data-tour="proforma-details" className="space-y-4">
                <h3 className="border-b border-zinc-850 pb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Quotation details</h3>
                <label data-tour="proforma-lead" className="block space-y-1.5">
                  <RequiredLabel>Lead</RequiredLabel>
                  <select
                    required
                    value={proformaForm.leadId}
                    onChange={(event) => {
                      const leadId = event.target.value;
                      const lead = leads.find((item) => item.id === leadId);
                      setProformaForm((current) => ({
                        ...current,
                        leadId,
                        customerName: lead?.fullName || '',
                        customerEmail: lead?.email || '',
                        customerLegalName: current.customerLegalName || lead?.fullName || '',
                      }));
                    }}
                    className={fieldClass}
                  >
                    <option value="">Select a lead</option>
                    {leads.map((lead) => (
                      <option key={lead.id} value={lead.id}>{lead.fullName} — {lead.email}</option>
                    ))}
                  </select>
                </label>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <label className="space-y-1.5"><RequiredLabel>Proforma number</RequiredLabel><input required value={proformaForm.invoiceNumber} onChange={(event) => setProformaForm((current) => ({ ...current, invoiceNumber: event.target.value }))} maxLength={80} placeholder="PF-2026-001" className={fieldClass} /></label>
                  <label className="space-y-1.5"><RequiredLabel>Issue date</RequiredLabel><DateInput required value={proformaForm.issuedDate} onChange={(value) => setProformaForm((current) => ({ ...current, issuedDate: value }))} className={fieldClass} /></label>
                  <label className="space-y-1.5"><span className="font-semibold text-zinc-400">Valid until <span className="text-zinc-600">(optional)</span></span><DateInput value={proformaForm.validUntil} onChange={(value) => setProformaForm((current) => ({ ...current, validUntil: value }))} className={fieldClass} /></label>
                  <label className="space-y-1.5"><RequiredLabel>Reference / quotation title</RequiredLabel><input required value={proformaForm.referenceName} onChange={(event) => setProformaForm((current) => ({ ...current, referenceName: event.target.value }))} maxLength={200} placeholder="Website redesign quotation" className={fieldClass} /></label>
                </div>
                <label className="block space-y-1.5"><RequiredLabel>Description</RequiredLabel><textarea required value={proformaForm.description} onChange={(event) => setProformaForm((current) => ({ ...current, description: event.target.value }))} maxLength={2000} rows={3} placeholder="Describe the proposed work or supply" className={fieldClass} /></label>
              </section>

              <section data-tour="proforma-billing" className="space-y-4">
                <h3 className="border-b border-zinc-850 pb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Lead and billing details</h3>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <label className="space-y-1.5"><RequiredLabel>Lead contact</RequiredLabel><input required readOnly value={proformaForm.customerName} maxLength={200} className={`${fieldClass} cursor-not-allowed opacity-70`} /></label>
                  <label className="space-y-1.5"><span className="font-semibold text-zinc-400">Legal entity name</span><input value={proformaForm.customerLegalName} onChange={(event) => setProformaForm((current) => ({ ...current, customerLegalName: event.target.value }))} maxLength={200} className={fieldClass} /></label>
                  <label className="space-y-1.5"><RequiredLabel>Email</RequiredLabel><input required readOnly type="email" value={proformaForm.customerEmail} maxLength={320} className={`${fieldClass} cursor-not-allowed opacity-70`} /></label>
                  <label className="space-y-1.5"><span className="font-semibold text-zinc-400">Phone</span><input readOnly value={selectedProformaLead?.phone || 'Not provided'} className={`${fieldClass} cursor-not-allowed opacity-70`} /></label>
                  <label className="space-y-1.5"><RequiredLabel>Address line 1</RequiredLabel><input required value={proformaForm.customerAddressLine1} onChange={(event) => setProformaForm((current) => ({ ...current, customerAddressLine1: event.target.value }))} maxLength={300} className={fieldClass} /></label>
                  <label className="space-y-1.5"><span className="font-semibold text-zinc-400">Address line 2</span><input value={proformaForm.customerAddressLine2} onChange={(event) => setProformaForm((current) => ({ ...current, customerAddressLine2: event.target.value }))} maxLength={300} className={fieldClass} /></label>
                  <label className="space-y-1.5"><RequiredLabel>City</RequiredLabel><input required value={proformaForm.customerCity} onChange={(event) => setProformaForm((current) => ({ ...current, customerCity: event.target.value }))} maxLength={120} className={fieldClass} /></label>
                  <label className="space-y-1.5"><RequiredLabel>State / region</RequiredLabel><input required value={proformaForm.customerState} onChange={(event) => setProformaForm((current) => ({ ...current, customerState: event.target.value }))} maxLength={120} className={fieldClass} /></label>
                  <label className="space-y-1.5"><RequiredLabel>Postal code</RequiredLabel><input required value={proformaForm.customerPostalCode} onChange={(event) => setProformaForm((current) => ({ ...current, customerPostalCode: event.target.value }))} maxLength={40} className={fieldClass} /></label>
                  <label className="space-y-1.5"><RequiredLabel>Country</RequiredLabel><input required value={proformaForm.customerCountry} onChange={(event) => setProformaForm((current) => ({ ...current, customerCountry: event.target.value }))} maxLength={120} className={fieldClass} /></label>
                  <label className="space-y-1.5"><span className="font-semibold text-zinc-400">GST / tax registration</span><input value={proformaForm.customerGstNumber} onChange={(event) => setProformaForm((current) => ({ ...current, customerGstNumber: event.target.value }))} maxLength={80} className={fieldClass} /></label>
                </div>
              </section>

              <section data-tour="proforma-items" className="space-y-4">
                <div className="flex flex-col gap-3 border-b border-zinc-850 pb-2 sm:flex-row sm:items-end sm:justify-between">
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Quotation items</h3>
                  <label className="w-full space-y-1.5 sm:w-48"><RequiredLabel>Tax on subtotal</RequiredLabel>
                    <div className="relative">
                      <input required type="number" min="0" max="40" step="0.01" value={proformaForm.taxRate} onChange={(event) => setProformaForm((current) => ({ ...current, taxRate: Number(event.target.value) }))} onFocus={(event) => event.currentTarget.select()} className={`${fieldClass} pr-8`} />
                      <span className="pointer-events-none absolute right-3 top-2.5 text-zinc-500">%</span>
                    </div>
                  </label>
                </div>
                <ItemEditor items={proformaItems} taxRate={proformaForm.taxRate} onChange={setProformaItems} />
              </section>

              <label className="block space-y-1.5"><span className="font-semibold text-zinc-400">Terms and Conditions</span><textarea value={proformaForm.termsOfSale} onChange={(event) => setProformaForm((current) => ({ ...current, termsOfSale: event.target.value }))} maxLength={4000} rows={3} placeholder="Optional validity, delivery, payment, or cancellation terms" className={fieldClass} /></label>
              <div className="flex justify-end">
                <Button data-tour="proforma-generate" type="submit" disabled={creating || !canSubmitProforma || agencyBillingMissingFields.length > 0} className="gap-2">
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {creating ? 'Creating and sending…' : 'Create proforma invoice'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {editingInvoice && editForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="edit-invoice-title">
          <button type="button" className="absolute inset-0 bg-black/80 backdrop-blur-sm" aria-label="Close invoice editor" onClick={() => { setEditingInvoice(null); setEditForm(null); }} />
          <Card className="relative z-10 max-h-[92vh] w-full max-w-5xl overflow-y-auto border-zinc-700 shadow-2xl">
            <CardHeader className="sticky top-0 z-10 flex flex-row items-start justify-between border-b border-zinc-800 bg-[#0d0e12]">
              <div><CardTitle id="edit-invoice-title" className="text-base text-white">Edit invoice</CardTitle><CardDescription>Update invoice details and recalculate the total before saving.</CardDescription></div>
              <Button type="button" variant="ghost" size="icon" onClick={() => { setEditingInvoice(null); setEditForm(null); }} aria-label="Close invoice editor"><X className="h-4 w-4" /></Button>
            </CardHeader>
            <CardContent className="pt-5">
              <form onSubmit={saveInvoiceEdits} className="space-y-5 text-xs">
                <div className="grid gap-4 md:grid-cols-3">
                  <label className="space-y-1.5"><RequiredLabel>Invoice number</RequiredLabel><input required value={editForm.invoiceNumber} onChange={(event) => setEditForm((current) => current ? { ...current, invoiceNumber: event.target.value } : current)} className={fieldClass} /></label>
                  <label className="space-y-1.5"><RequiredLabel>Issue date</RequiredLabel><DateInput required value={editForm.issuedDate} onChange={(value) => setEditForm((current) => current ? { ...current, issuedDate: value } : current)} className={fieldClass} /></label>
                  <label className="space-y-1.5"><span className="font-semibold text-zinc-400">Due / valid date</span><DateInput value={editForm.dueDate} onChange={(value) => setEditForm((current) => current ? { ...current, dueDate: value } : current)} className={fieldClass} /></label>
                </div>
                <label className="block space-y-1.5"><span className="font-semibold text-zinc-400">Description</span><textarea rows={2} value={editForm.description} onChange={(event) => setEditForm((current) => current ? { ...current, description: event.target.value } : current)} className={fieldClass} /></label>
                <div className="flex justify-end"><label className="w-full space-y-1.5 sm:w-56"><RequiredLabel>Tax on subtotal</RequiredLabel><div className="relative"><input required type="number" min="0" max="40" step="0.01" value={editForm.taxRate} onChange={(event) => setEditForm((current) => current ? { ...current, taxRate: Number(event.target.value) } : current)} className={`${fieldClass} pr-8`} /><span className="pointer-events-none absolute right-3 top-2.5 text-zinc-500">%</span></div></label></div>
                <ItemEditor items={editForm.lineItems} taxRate={editForm.taxRate} onChange={(lineItems) => setEditForm((current) => current ? { ...current, lineItems } : current)} />
                <label className="block space-y-1.5"><span className="font-semibold text-zinc-400">Terms and Conditions</span><textarea rows={3} value={editForm.termsOfSale} onChange={(event) => setEditForm((current) => current ? { ...current, termsOfSale: event.target.value } : current)} className={fieldClass} /></label>
                <div className="flex justify-end gap-2 border-t border-zinc-800 pt-4"><Button type="button" variant="outline" onClick={() => { setEditingInvoice(null); setEditForm(null); }}>Cancel</Button><Button type="submit" disabled={mutatingInvoiceId === editingInvoice.id || !validItems(editForm.lineItems)}>{mutatingInvoiceId === editingInvoice.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{mutatingInvoiceId === editingInvoice.id ? 'Saving…' : 'Save invoice'}</Button></div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
