'use client';

import * as React from 'react';
import { Download, FileText, ImagePlus, Loader2, Plus, ReceiptText, Trash2, X } from 'lucide-react';
import { workspaceFetch as fetch } from '@/lib/workspace-data-cache';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageSkeleton } from '@/components/ui/page-skeletons';
import { formatUserMessage } from '@/lib/utils';
import type { ProposalInput } from '@/lib/proposals/types';
import { DocumentWorkspace } from '@/components/documents/document-workspace';
import { DateInput } from '@/components/ui/date-input';
import { RequiredFieldLabel } from '@/components/ui/required-field-label';

const today = new Date();
const thirtyDays = new Date(today.getTime() + 30 * 86400000);

const initialProposal: ProposalInput = {
  proposalNumber: `PROP-${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-001`,
  title: 'Business Growth & Delivery Proposal',
  issueDate: today.toISOString().slice(0, 10),
  validUntil: thirtyDays.toISOString().slice(0, 10),
  agencyName: '', agencyEmail: '', agencyPhone: '', agencyAddress: '', brandColor: '#09090B', logoDataUrl: '',
  clientName: '', clientCompany: '', clientEmail: '', clientPhone: '', clientAddress: '', projectName: '',
  introduction: 'Thank you for the opportunity to present this proposal. We have prepared the following approach around your priorities, expected outcomes, and delivery requirements.',
  executiveSummary: '', objectives: '', scope: '', deliverables: '', exclusions: 'Work not expressly described in the scope or deliverables requires written change approval.', timeline: '',
  currency: 'USD', taxRate: 0,
  services: [{ name: '', description: '', duration: '', price: 0 }],
  paymentSchedule: [{ phase: 'Project commencement', due: 'Upon proposal approval', amount: 0, description: 'Initial payment to reserve capacity and begin discovery.' }],
  assumptions: 'Client feedback and required source materials will be supplied within the agreed review windows.',
  clientResponsibilities: 'Provide accurate information; nominate a decision-maker; review deliverables within agreed timelines; provide access to required systems.',
  agencyResponsibilities: 'Deliver the agreed scope professionally; communicate progress and risks; protect client information; maintain appropriate quality controls.',
  changeControl: 'Any request outside the agreed scope will be documented with its impact on fees and schedule and will proceed only after written approval.',
  confidentiality: 'Each party will protect confidential information and use it only to perform or receive the services described in this proposal.',
  intellectualProperty: 'Upon full payment, the client receives the rights described for final deliverables. Pre-existing tools, methods, templates, and know-how remain the property of their original owner.',
  termination: 'Either party may terminate with 30 days written notice. Fees for work completed and committed third-party costs remain payable.',
  governingLaw: '',
  additionalTerms: '',
  nextSteps: 'Confirm the selected scope and commercial terms; approve the proposal in IrisOS; schedule the project kickoff; provide the required access and materials.',
};

function Field({ label, children, span = false }: { label: string; children: React.ReactNode; span?: boolean }) {
  return <label className={`space-y-1.5 ${span ? 'md:col-span-2' : ''}`}><span className="block font-semibold text-muted-foreground"><RequiredFieldLabel label={label} /></span>{children}</label>;
}

const inputClass = 'w-full rounded-xl border border-border bg-background px-3 py-2.5 text-foreground outline-none placeholder:text-muted-foreground focus:border-ring';
const textareaClass = `${inputClass} min-h-28 resize-y leading-relaxed`;

type ProformaDraft = {
  leadId: string;
  invoiceNumber: string;
  issuedDate: string;
  validUntil: string;
  referenceName: string;
  customerName: string;
  customerLegalName: string;
  customerEmail: string;
  customerAddressLine1: string;
  customerAddressLine2: string;
  customerCity: string;
  customerState: string;
  customerPostalCode: string;
  customerCountry: string;
  customerGstNumber: string;
  description: string;
  taxRate: number;
  termsOfSale: string;
};

type ProformaItem = { description: string; quantity: number; unitPrice: number };

export default function ProposalsPage() {
  const [form, setForm] = React.useState<ProposalInput>(initialProposal);
  const [loading, setLoading] = React.useState(true);
  const [generating, setGenerating] = React.useState(false);
  const [error, setError] = React.useState('');
  const [pdfUrl, setPdfUrl] = React.useState('');
  const [pdfBlob, setPdfBlob] = React.useState<Blob | null>(null);
  const [leads, setLeads] = React.useState<any[]>([]);
  const [proformas, setProformas] = React.useState<any[]>([]);
  const [selectedLeadId, setSelectedLeadId] = React.useState('');
  const [proformaMode, setProformaMode] = React.useState<'NONE' | 'EXISTING'>('NONE');
  const [selectedProformaId, setSelectedProformaId] = React.useState('');
  const [proformaAddress, setProformaAddress] = React.useState({ line1: '', line2: '', city: '', state: '', postalCode: '', country: '' });
  const [proformaModalOpen, setProformaModalOpen] = React.useState(false);
  const [creatingProforma, setCreatingProforma] = React.useState(false);
  const [proformaModalError, setProformaModalError] = React.useState('');
  const [proformaDraft, setProformaDraft] = React.useState<ProformaDraft>({
    leadId: '', invoiceNumber: '', issuedDate: '', validUntil: '', referenceName: '', customerName: '',
    customerLegalName: '', customerEmail: '', customerAddressLine1: '', customerAddressLine2: '',
    customerCity: '', customerState: '', customerPostalCode: '', customerCountry: '', customerGstNumber: '',
    description: '', taxRate: 0, termsOfSale: '',
  });
  const [proformaItems, setProformaItems] = React.useState<ProformaItem[]>([{ description: '', quantity: 1, unitPrice: 0 }]);

  React.useEffect(() => {
    let active = true;
    const loadInitialData = async () => {
      try {
        const leadId = new URLSearchParams(window.location.search).get('leadId')?.trim() || '';
        const [workspaceResponse, leadsResponse, proformasResponse] = await Promise.all([
          fetch('/api/workspace'),
          fetch('/api/agency-leads'),
          fetch('/api/invoices?documentType=PROFORMA'),
        ]);
        if (!workspaceResponse.ok) throw new Error('Unable to load agency branding.');
        const data = await workspaceResponse.json();
        if (!active) return;
        const organization = data.organization || {};
        setProformaAddress((current) => ({ ...current, country: current.country || organization.billingCountry || '' }));
        const address = [organization.billingAddressLine1, organization.billingAddressLine2, [organization.billingCity, organization.billingState, organization.billingPostalCode].filter(Boolean).join(', '), organization.billingCountry].filter(Boolean).join('\n');
        const jurisdiction = [organization.billingState || organization.billingCity, organization.billingCountry].filter(Boolean).join(', ') || 'the agency jurisdiction';
        let selectedLead: { id: string; fullName: string; email: string; phone?: string | null } | undefined;
        if (leadsResponse.ok) {
          const leadData = await leadsResponse.json();
          setLeads(leadData.leads || []);
          selectedLead = (leadData.leads || []).find((lead: { id: string }) => lead.id === leadId);
        }
        if (proformasResponse.ok) setProformas(await proformasResponse.json());
        if (selectedLead) setSelectedLeadId(selectedLead.id);
        setForm((current) => ({
          ...current,
          agencyName: organization.legalEntityName || organization.name || '',
          agencyEmail: organization.billingEmail || data.user?.email || '',
          agencyAddress: address,
          currency: organization.currency || 'USD',
          brandColor: organization.invoiceBrandColor || '#09090B',
          logoDataUrl: organization.invoiceLogoDataUrl || '',
          governingLaw: `The laws of ${jurisdiction} govern this proposal, and its courts of competent jurisdiction will have exclusive jurisdiction.`,
          ...(selectedLead ? {
            clientName: selectedLead.fullName,
            clientCompany: selectedLead.fullName,
            clientEmail: selectedLead.email,
            clientPhone: selectedLead.phone || '',
            projectName: `Proposal for ${selectedLead.fullName}`,
          } : {}),
        }));
        if (leadId && !selectedLead) setError('The selected lead could not be loaded. Select another lead from the Simple form.');
      } catch (loadError) {
        if (active) setError(formatUserMessage(loadError instanceof Error ? loadError.message : 'Unable to load proposal details.'));
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadInitialData();
    return () => { active = false; };
  }, []);

  React.useEffect(() => () => { if (pdfUrl) URL.revokeObjectURL(pdfUrl); }, [pdfUrl]);

  const set = <K extends keyof ProposalInput>(key: K, value: ProposalInput[K]) => setForm((current) => ({ ...current, [key]: value }));

  const selectLead = (leadId: string) => {
    setSelectedLeadId(leadId);
    const lead = leads.find((item) => item.id === leadId);
    if (!lead) return;
    setForm((current) => ({ ...current, clientName: lead.fullName, clientCompany: lead.fullName, clientEmail: lead.email, clientPhone: lead.phone || '', projectName: current.projectName || `Proposal for ${lead.fullName}` }));
  };

  const setExistingProforma = (invoiceId: string) => {
    setSelectedProformaId(invoiceId);
    const invoice = proformas.find((item) => item.id === invoiceId);
    setForm((current) => ({ ...current, proformaInvoice: invoice ? { id: invoice.id, invoiceNumber: invoice.invoiceNumber, amount: Number(invoice.amount || 0), currency: current.currency, validUntil: invoice.dueDate ? String(invoice.dueDate).slice(0, 10) : '' } : undefined }));
  };

  const openProformaModal = () => {
    const lead = leads.find((item) => item.id === selectedLeadId);
    setProformaDraft({
      leadId: selectedLeadId,
      invoiceNumber: `PF-${today.getFullYear()}-${String(Date.now()).slice(-6)}`,
      issuedDate: form.issueDate,
      validUntil: form.validUntil,
      referenceName: form.projectName,
      customerName: lead?.fullName || form.clientName,
      customerLegalName: form.clientCompany,
      customerEmail: lead?.email || form.clientEmail,
      customerAddressLine1: proformaAddress.line1,
      customerAddressLine2: proformaAddress.line2,
      customerCity: proformaAddress.city,
      customerState: proformaAddress.state,
      customerPostalCode: proformaAddress.postalCode,
      customerCountry: proformaAddress.country,
      customerGstNumber: '',
      description: form.scope,
      taxRate: form.taxRate,
      termsOfSale: form.additionalTerms || 'As set out in the attached proposal.',
    });
    setProformaItems(form.services.map((service) => ({ description: service.name, quantity: 1, unitPrice: service.price })));
    setProformaModalError('');
    setProformaModalOpen(true);
  };

  const selectProformaLead = (leadId: string) => {
    const lead = leads.find((item) => item.id === leadId);
    setProformaDraft((current) => ({
      ...current,
      leadId,
      customerName: lead?.fullName || '',
      customerLegalName: lead?.fullName || '',
      customerEmail: lead?.email || '',
    }));
  };

  const createProforma = async () => {
    if (creatingProforma) return;
    const requiredValues = [
      proformaDraft.leadId, proformaDraft.invoiceNumber, proformaDraft.issuedDate, proformaDraft.referenceName,
      proformaDraft.customerName, proformaDraft.customerEmail, proformaDraft.customerAddressLine1,
      proformaDraft.customerCity, proformaDraft.customerState, proformaDraft.customerPostalCode,
      proformaDraft.customerCountry, proformaDraft.description,
    ];
    if (requiredValues.some((value) => !String(value).trim())) {
      setProformaModalError('Complete all required proforma and billing fields.');
      return;
    }
    if (!proformaItems.length || proformaItems.some((item) => !item.description.trim() || item.quantity <= 0 || item.unitPrice < 0)) {
      setProformaModalError('Every quotation item needs a description, a quantity above zero, and a valid price.');
      return;
    }
    setCreatingProforma(true);
    setProformaModalError('');
    try {
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'PROFORMA', ...proformaDraft, lineItems: proformaItems, sendEmail: false }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Unable to create the proforma invoice.');
      const invoice = payload.invoice;
      const linkedProforma = {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        amount: Number(invoice.amount || 0),
        currency: form.currency,
        validUntil: invoice.dueDate ? String(invoice.dueDate).slice(0, 10) : '',
      };
      setProformas((current) => [invoice, ...current.filter((item) => item.id !== invoice.id)]);
      setSelectedProformaId(invoice.id);
      setProformaMode('EXISTING');
      selectLead(proformaDraft.leadId);
      setForm((current) => ({ ...current, proformaInvoice: linkedProforma }));
      setProformaAddress({
        line1: proformaDraft.customerAddressLine1,
        line2: proformaDraft.customerAddressLine2,
        city: proformaDraft.customerCity,
        state: proformaDraft.customerState,
        postalCode: proformaDraft.customerPostalCode,
        country: proformaDraft.customerCountry,
      });
      setProformaModalOpen(false);
    } catch (creationError) {
      setProformaModalError(formatUserMessage(creationError instanceof Error ? creationError.message : 'Unable to create the proforma invoice.'));
    } finally {
      setCreatingProforma(false);
    }
  };

  const uploadLogo = (file?: File) => {
    if (!file) return;
    if (!['image/png', 'image/jpeg'].includes(file.type) || file.size > 3_000_000) {
      setError('Use a PNG or JPG logo smaller than 3 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => set('logoDataUrl', String(reader.result || ''));
    reader.readAsDataURL(file);
  };

  const generate = async (event: React.FormEvent) => {
    event.preventDefault();
    setGenerating(true);
    setError('');
    try {
      let proposal = { ...form };
      let proformaInvoiceId = '';
      if (proformaMode === 'EXISTING') {
        const invoice = proformas.find((item) => item.id === selectedProformaId);
        if (!invoice) throw new Error('Select a proforma invoice to attach, or choose to create one.');
        proposal = { ...proposal, proformaInvoice: { id: invoice.id, invoiceNumber: invoice.invoiceNumber, amount: Number(invoice.amount || 0), currency: proposal.currency, validUntil: invoice.dueDate ? String(invoice.dueDate).slice(0, 10) : '' } };
        proformaInvoiceId = invoice.id;
      } else {
        const { proformaInvoice: _ignored, ...withoutProforma } = proposal;
        proposal = withoutProforma;
      }
      const response = await fetch('/api/proposals/pdf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(proposal) });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const firstIssue = payload.issues?.[0]?.message;
        throw new Error(firstIssue || payload.error || 'Unable to generate proposal.');
      }
      const blob = await response.blob();
      const saveResponse = await fetch('/api/generated-documents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'save', kind: 'PROPOSAL', content: proposal, ...(proformaInvoiceId ? { proformaInvoiceId } : {}) }) });
      if (!saveResponse.ok) { const payload = await saveResponse.json().catch(() => ({})); throw new Error(payload.error || 'The proposal was generated but could not be saved.'); }
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      const nextUrl = URL.createObjectURL(blob);
      setPdfBlob(blob);
      setPdfUrl(nextUrl);
      setForm(proposal);
    } catch (generationError) {
      setError(formatUserMessage(generationError instanceof Error ? generationError.message : 'Unable to generate proposal.'));
    } finally {
      setGenerating(false);
    }
  };

  const download = () => {
    if (!pdfBlob) return;
    const anchor = document.createElement('a');
    anchor.href = URL.createObjectURL(pdfBlob);
    anchor.download = `${form.proposalNumber.replace(/[^A-Za-z0-9._-]/g, '_')}.pdf`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(anchor.href), 0);
  };

  const proformaSubtotal = proformaItems.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0);
  const proformaTax = proformaSubtotal * Number(proformaDraft.taxRate || 0) / 100;

  if (loading) return <PageSkeleton variant="reporting" />;

  return <DocumentWorkspace family="PROPOSAL" title="Proposals" description="Create, manage, and send agency-branded proposals with Miles AI or the complete native editor."><><form onSubmit={generate} className="space-y-6">
    <div className="flex justify-end border-b border-border pb-5">
      <div className="flex gap-2"><Button type="button" variant="outline" disabled={!pdfBlob} onClick={download} className="gap-2"><Download className="h-4 w-4" />Download PDF</Button><Button type="submit" disabled={generating} className="min-w-44 gap-2">{generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}{generating ? 'Generating...' : 'Generate proposal'}</Button></div>
    </div>
    {error && <div className="rounded-xl border border-rose-900/50 bg-rose-950/20 px-4 py-3 text-rose-300">{error}</div>}

    <div className={`grid gap-6 ${pdfUrl ? '2xl:grid-cols-[minmax(0,1fr)_minmax(520px,.85fr)]' : ''}`}>
      <div className="space-y-6">
        <Card><CardHeader><CardTitle>Brand and proposal identity</CardTitle><CardDescription>Defaults come from agency settings and can be changed for this proposal.</CardDescription></CardHeader><CardContent className="grid gap-4 md:grid-cols-2">
          <Field label="Proposal number *"><input required value={form.proposalNumber} onChange={(e) => set('proposalNumber', e.target.value)} className={inputClass} /></Field>
          <Field label="Proposal title *"><input required value={form.title} onChange={(e) => set('title', e.target.value)} className={inputClass} /></Field>
          <Field label="Issue date *"><DateInput required value={form.issueDate} onChange={(value) => set('issueDate', value)} className={inputClass} /></Field>
          <Field label="Valid until *"><DateInput required value={form.validUntil} onChange={(value) => set('validUntil', value)} className={inputClass} /></Field>
          <Field label="Agency / brand name *"><input required value={form.agencyName} onChange={(e) => set('agencyName', e.target.value)} className={inputClass} /></Field>
          <Field label="Brand colour *"><div className="flex gap-2"><input aria-label="Select brand colour" type="color" value={form.brandColor} onChange={(e) => set('brandColor', e.target.value.toUpperCase())} className="h-12 w-16 cursor-pointer rounded-xl border border-border bg-background p-1" /><input required pattern="#[0-9A-Fa-f]{6}" value={form.brandColor} onChange={(e) => set('brandColor', e.target.value)} className={inputClass} /></div></Field>
          <Field label="Agency email *"><input required type="email" value={form.agencyEmail} onChange={(e) => set('agencyEmail', e.target.value)} className={inputClass} /></Field>
          <Field label="Agency phone"><input value={form.agencyPhone} onChange={(e) => set('agencyPhone', e.target.value)} className={inputClass} /></Field>
          <Field label="Agency address *" span><textarea required value={form.agencyAddress} onChange={(e) => set('agencyAddress', e.target.value)} className={textareaClass} /></Field>
          <Field label="Proposal logo" span><label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-border bg-muted/35 p-4 text-foreground"><ImagePlus className="h-5 w-5" /><span>{form.logoDataUrl ? 'Replace logo (PNG/JPG)' : 'Upload logo (PNG/JPG)'}</span><input type="file" accept="image/png,image/jpeg" className="sr-only" onChange={(e) => uploadLogo(e.target.files?.[0])} /></label></Field>
        </CardContent></Card>

        <Card><CardHeader><CardTitle>Client and project</CardTitle><CardDescription>Details shown on the proposal cover and contact page.</CardDescription></CardHeader><CardContent className="grid gap-4 md:grid-cols-2">
          <Field label="Client contact name *"><input required value={form.clientName} onChange={(e) => set('clientName', e.target.value)} className={inputClass} /></Field>
          <Field label="Client company *"><input required value={form.clientCompany} onChange={(e) => set('clientCompany', e.target.value)} className={inputClass} /></Field>
          <Field label="Client email *"><input required type="email" value={form.clientEmail} onChange={(e) => set('clientEmail', e.target.value)} className={inputClass} /></Field>
          <Field label="Client phone"><input value={form.clientPhone} onChange={(e) => set('clientPhone', e.target.value)} className={inputClass} /></Field>
          <Field label="Client address *" span><textarea required value={form.clientAddress} onChange={(e) => set('clientAddress', e.target.value)} className={textareaClass} /></Field>
          <Field label="Project name *" span><input required value={form.projectName} onChange={(e) => set('projectName', e.target.value)} className={inputClass} /></Field>
        </CardContent></Card>

        <Card><CardHeader><div className="flex items-center gap-2"><ReceiptText className="h-5 w-5 text-muted-foreground" /><CardTitle>Proforma invoice</CardTitle></div><CardDescription>Attach an existing lead proforma or create one from this proposal&apos;s services. The linked proforma is referenced in the proposal and included when it is sent.</CardDescription></CardHeader><CardContent className="space-y-5">
          <Field label="Saved lead for the proposal"><select value={selectedLeadId} onChange={(event) => selectLead(event.target.value)} className={inputClass}><option value="">Select a saved lead to attach or create a proforma</option>{leads.map((lead) => <option key={lead.id} value={lead.id}>{lead.fullName} — {lead.email}</option>)}</select></Field>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {([['NONE', 'No proforma'], ['EXISTING', 'Attach existing']] as const).map(([mode, label]) => <button key={mode} type="button" onClick={() => { setProformaMode(mode); if (mode === 'NONE') { setSelectedProformaId(''); set('proformaInvoice', undefined); } }} className={`rounded-xl border p-4 text-left text-sm font-semibold transition-colors ${proformaMode === mode ? 'border-foreground bg-muted text-foreground' : 'border-border text-muted-foreground hover:text-foreground'}`}>{label}</button>)}
            <button type="button" onClick={openProformaModal} className="rounded-xl border border-border p-4 text-left text-sm font-semibold text-muted-foreground transition-colors hover:border-foreground hover:text-foreground">Create New</button>
          </div>
          {proformaMode === 'EXISTING' && <Field label="Available proforma invoice"><select required value={selectedProformaId} onChange={(event) => setExistingProforma(event.target.value)} className={inputClass} disabled={!selectedLeadId}><option value="">{selectedLeadId ? 'Select a proforma invoice' : 'Select the proposal lead first'}</option>{proformas.filter((invoice) => !selectedLeadId || invoice.leadId === selectedLeadId).map((invoice) => <option key={invoice.id} value={invoice.id}>{invoice.invoiceNumber} — {form.currency} {Number(invoice.amount || 0).toLocaleString()} {invoice.dueDate ? `· valid until ${String(invoice.dueDate).slice(0, 10)}` : ''}</option>)}</select></Field>}
        </CardContent></Card>

        <Card><CardHeader><CardTitle>Proposal narrative</CardTitle><CardDescription>State the business case, desired outcomes, boundaries, and delivery plan.</CardDescription></CardHeader><CardContent className="grid gap-4 md:grid-cols-2">
          {([['introduction','Cover letter'],['executiveSummary','Executive summary'],['objectives','Objectives (one per line)'],['scope','Scope of work (one per line)'],['deliverables','Deliverables (one per line)'],['timeline','Timeline and milestones'],['exclusions','Out of scope']] as const).map(([key,label]) => <Field key={key} label={`${label} *`} span={key === 'introduction' || key === 'executiveSummary'}><textarea required value={form[key]} onChange={(e) => set(key, e.target.value)} className={textareaClass} /></Field>)}
        </CardContent></Card>

        <Card><CardHeader className="flex flex-row items-start justify-between"><div><CardTitle>Services and investment</CardTitle><CardDescription>Add each priced service included in the proposal.</CardDescription></div><Button type="button" variant="outline" onClick={() => set('services', [...form.services, { name: '', description: '', duration: '', price: 0 }])}><Plus className="h-4 w-4" />Add service</Button></CardHeader><CardContent className="space-y-4">
          {form.services.map((service, index) => <div key={index} className="grid gap-3 rounded-xl border border-border bg-muted/25 p-4 md:grid-cols-2">
            <Field label="Service *"><input required value={service.name} onChange={(e) => set('services', form.services.map((item, i) => i === index ? { ...item, name: e.target.value } : item))} className={inputClass} /></Field>
            <Field label="Duration *"><input required value={service.duration} onChange={(e) => set('services', form.services.map((item, i) => i === index ? { ...item, duration: e.target.value } : item))} className={inputClass} /></Field>
            <Field label="Description *" span><textarea required value={service.description} onChange={(e) => set('services', form.services.map((item, i) => i === index ? { ...item, description: e.target.value } : item))} className={textareaClass} /></Field>
            <Field label={`Price (${form.currency}) *`}><input required min="0" step="0.01" type="number" value={service.price} onChange={(e) => set('services', form.services.map((item, i) => i === index ? { ...item, price: Number(e.target.value) } : item))} className={inputClass} /></Field>
            <div className="flex items-end justify-end"><Button type="button" variant="ghost" disabled={form.services.length === 1} onClick={() => set('services', form.services.filter((_, i) => i !== index))} className="text-rose-400"><Trash2 className="h-4 w-4" />Remove</Button></div>
          </div>)}
          <div className="grid gap-4 md:grid-cols-2"><Field label="Currency *"><input required value={form.currency} onChange={(e) => set('currency', e.target.value.toUpperCase())} className={inputClass} /></Field><Field label="Tax rate (%)"><input min="0" max="100" step="0.01" type="number" value={form.taxRate} onChange={(e) => set('taxRate', Number(e.target.value))} className={inputClass} /></Field></div>
        </CardContent></Card>

        <Card><CardHeader className="flex flex-row items-start justify-between"><div><CardTitle>Payment schedule</CardTitle><CardDescription>Define payment events without adding signature fields.</CardDescription></div><Button type="button" variant="outline" onClick={() => set('paymentSchedule', [...form.paymentSchedule, { phase: '', due: '', amount: 0, description: '' }])}><Plus className="h-4 w-4" />Add phase</Button></CardHeader><CardContent className="space-y-4">
          {form.paymentSchedule.map((payment, index) => <div key={index} className="grid gap-3 rounded-xl border border-border bg-muted/25 p-4 md:grid-cols-2">
            {(['phase','due'] as const).map((key) => <Field key={key} label={`${key === 'phase' ? 'Phase' : 'Due point'} *`}><input required value={payment[key]} onChange={(e) => set('paymentSchedule', form.paymentSchedule.map((item, i) => i === index ? { ...item, [key]: e.target.value } : item))} className={inputClass} /></Field>)}
            <Field label={`Amount (${form.currency}) *`}><input required min="0" step="0.01" type="number" value={payment.amount} onChange={(e) => set('paymentSchedule', form.paymentSchedule.map((item, i) => i === index ? { ...item, amount: Number(e.target.value) } : item))} className={inputClass} /></Field>
            <div className="flex items-end justify-end"><Button type="button" variant="ghost" disabled={form.paymentSchedule.length === 1} onClick={() => set('paymentSchedule', form.paymentSchedule.filter((_, i) => i !== index))} className="text-rose-400"><Trash2 className="h-4 w-4" />Remove</Button></div>
            <Field label="Description *" span><textarea required value={payment.description} onChange={(e) => set('paymentSchedule', form.paymentSchedule.map((item, i) => i === index ? { ...item, description: e.target.value } : item))} className={textareaClass} /></Field>
          </div>)}
        </CardContent></Card>

        <Card><CardHeader><CardTitle>Terms and next steps</CardTitle><CardDescription>Complete commercial protections and operating expectations. No signature component is generated.</CardDescription></CardHeader><CardContent className="grid gap-4 md:grid-cols-2">
          {([['assumptions','Assumptions'],['agencyResponsibilities','Agency responsibilities'],['clientResponsibilities','Client responsibilities'],['changeControl','Change control'],['confidentiality','Confidentiality'],['intellectualProperty','Intellectual property'],['termination','Term and termination'],['governingLaw','Governing law and dispute resolution'],['nextSteps','Next steps']] as const).map(([key,label]) => <Field key={key} label={`${label} *`} span={key === 'nextSteps'}><textarea required value={form[key]} onChange={(e) => set(key, e.target.value)} className={textareaClass} /></Field>)}
        </CardContent></Card>
      </div>

      {pdfUrl && <Card className="sticky top-24 h-fit overflow-hidden"><CardHeader className="border-b border-border"><CardTitle>Generated proposal</CardTitle><CardDescription>Secure preview of the latest proposal.</CardDescription></CardHeader><iframe title="Generated proposal preview" src={`${pdfUrl}#view=FitH`} className="h-[780px] w-full bg-muted" /></Card>}
    </div>
  </form>

  {proformaModalOpen && <div role="dialog" aria-modal="true" aria-labelledby="new-proforma-title" className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget && !creatingProforma) setProformaModalOpen(false); }}>
    <Card className="max-h-[94vh] w-full max-w-6xl overflow-y-auto border-border bg-background shadow-2xl">
      <CardHeader className="sticky top-0 z-10 flex flex-row items-start justify-between border-b border-border bg-background/95 backdrop-blur">
        <div><CardTitle id="new-proforma-title" className="flex items-center gap-2"><ReceiptText className="h-5 w-5" />Create proforma invoice</CardTitle><CardDescription>Build a complete proforma from this proposal. It will be saved and linked without being emailed separately.</CardDescription></div>
        <Button type="button" variant="ghost" size="icon" aria-label="Close proforma editor" disabled={creatingProforma} onClick={() => setProformaModalOpen(false)}><X className="h-5 w-5" /></Button>
      </CardHeader>
      <CardContent className="space-y-7 p-6">
        {proformaModalError && <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-500">{proformaModalError}</div>}

        <section className="space-y-4">
          <div><h3 className="font-semibold text-foreground">Proforma details</h3><p className="text-sm text-muted-foreground">Proposal values are prefilled and remain fully editable here.</p></div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Lead *"><select value={proformaDraft.leadId} onChange={(event) => selectProformaLead(event.target.value)} className={inputClass}><option value="">Select a lead</option>{leads.map((lead) => <option key={lead.id} value={lead.id}>{lead.fullName} — {lead.email}</option>)}</select></Field>
            <Field label="Proforma number *"><input value={proformaDraft.invoiceNumber} onChange={(event) => setProformaDraft((current) => ({ ...current, invoiceNumber: event.target.value }))} maxLength={80} placeholder="PF-2026-001" className={inputClass} /></Field>
            <Field label="Issue date *"><DateInput value={proformaDraft.issuedDate} onChange={(value) => setProformaDraft((current) => ({ ...current, issuedDate: value }))} className={inputClass} /></Field>
            <Field label="Valid until"><DateInput value={proformaDraft.validUntil} onChange={(value) => setProformaDraft((current) => ({ ...current, validUntil: value }))} className={inputClass} /></Field>
            <Field label="Reference / quotation title *" span><input value={proformaDraft.referenceName} onChange={(event) => setProformaDraft((current) => ({ ...current, referenceName: event.target.value }))} maxLength={200} className={inputClass} /></Field>
            <Field label="Description *" span><textarea value={proformaDraft.description} onChange={(event) => setProformaDraft((current) => ({ ...current, description: event.target.value }))} maxLength={2000} className={textareaClass} /></Field>
          </div>
        </section>

        <section className="space-y-4 border-t border-border pt-6">
          <div><h3 className="font-semibold text-foreground">Lead and billing details</h3><p className="text-sm text-muted-foreground">The selected lead supplies the contact identity; complete the billing address for the document.</p></div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Field label="Lead contact *"><input readOnly value={proformaDraft.customerName} className={`${inputClass} cursor-not-allowed opacity-70`} /></Field>
            <Field label="Legal entity name"><input value={proformaDraft.customerLegalName} onChange={(event) => setProformaDraft((current) => ({ ...current, customerLegalName: event.target.value }))} maxLength={200} className={inputClass} /></Field>
            <Field label="Email *"><input readOnly type="email" value={proformaDraft.customerEmail} className={`${inputClass} cursor-not-allowed opacity-70`} /></Field>
            <Field label="Address line 1 *"><input value={proformaDraft.customerAddressLine1} onChange={(event) => setProformaDraft((current) => ({ ...current, customerAddressLine1: event.target.value }))} maxLength={300} className={inputClass} /></Field>
            <Field label="Address line 2"><input value={proformaDraft.customerAddressLine2} onChange={(event) => setProformaDraft((current) => ({ ...current, customerAddressLine2: event.target.value }))} maxLength={300} className={inputClass} /></Field>
            <Field label="City *"><input value={proformaDraft.customerCity} onChange={(event) => setProformaDraft((current) => ({ ...current, customerCity: event.target.value }))} maxLength={120} className={inputClass} /></Field>
            <Field label="State / region *"><input value={proformaDraft.customerState} onChange={(event) => setProformaDraft((current) => ({ ...current, customerState: event.target.value }))} maxLength={120} className={inputClass} /></Field>
            <Field label="Postal code *"><input value={proformaDraft.customerPostalCode} onChange={(event) => setProformaDraft((current) => ({ ...current, customerPostalCode: event.target.value }))} maxLength={40} className={inputClass} /></Field>
            <Field label="Country *"><input value={proformaDraft.customerCountry} onChange={(event) => setProformaDraft((current) => ({ ...current, customerCountry: event.target.value }))} maxLength={120} className={inputClass} /></Field>
            <Field label="GST / tax registration"><input value={proformaDraft.customerGstNumber} onChange={(event) => setProformaDraft((current) => ({ ...current, customerGstNumber: event.target.value }))} maxLength={80} className={inputClass} /></Field>
          </div>
        </section>

        <section className="space-y-4 border-t border-border pt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div><h3 className="font-semibold text-foreground">Quotation items</h3><p className="text-sm text-muted-foreground">Edit the services copied from the proposal or add invoice-only line items.</p></div>
            <Field label="Tax on subtotal (%)"><input type="number" min="0" max="40" step="0.01" value={proformaDraft.taxRate} onChange={(event) => setProformaDraft((current) => ({ ...current, taxRate: Number(event.target.value) }))} className={`${inputClass} sm:w-48`} /></Field>
          </div>
          <div className="space-y-3">
            {proformaItems.map((item, index) => <div key={index} className="grid gap-3 rounded-xl border border-border bg-muted/25 p-4 md:grid-cols-[minmax(0,1fr)_140px_180px_auto] md:items-end">
              <Field label="Item description *"><input value={item.description} onChange={(event) => setProformaItems((current) => current.map((entry, itemIndex) => itemIndex === index ? { ...entry, description: event.target.value } : entry))} maxLength={500} className={inputClass} /></Field>
              <Field label="Quantity *"><input type="number" min="0.01" step="0.01" value={item.quantity} onChange={(event) => setProformaItems((current) => current.map((entry, itemIndex) => itemIndex === index ? { ...entry, quantity: Number(event.target.value) } : entry))} className={inputClass} /></Field>
              <Field label={`Unit price (${form.currency}) *`}><input type="number" min="0" step="0.01" value={item.unitPrice} onChange={(event) => setProformaItems((current) => current.map((entry, itemIndex) => itemIndex === index ? { ...entry, unitPrice: Number(event.target.value) } : entry))} className={inputClass} /></Field>
              <Button type="button" variant="ghost" size="icon" aria-label={`Remove item ${index + 1}`} disabled={proformaItems.length === 1} onClick={() => setProformaItems((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="text-rose-500"><Trash2 className="h-4 w-4" /></Button>
            </div>)}
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Button type="button" variant="outline" disabled={proformaItems.length >= 8} onClick={() => setProformaItems((current) => [...current, { description: '', quantity: 1, unitPrice: 0 }])}><Plus className="h-4 w-4" />Add item</Button>
            <div className="grid grid-cols-3 gap-6 rounded-xl border border-border bg-muted/30 px-5 py-4 text-right text-sm">
              <div><span className="block text-muted-foreground">Subtotal</span><strong>{form.currency} {proformaSubtotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong></div>
              <div><span className="block text-muted-foreground">Tax</span><strong>{form.currency} {proformaTax.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong></div>
              <div><span className="block text-muted-foreground">Total</span><strong className="text-foreground">{form.currency} {(proformaSubtotal + proformaTax).toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong></div>
            </div>
          </div>
        </section>

        <section className="space-y-4 border-t border-border pt-6">
          <Field label="Terms and Conditions"><textarea value={proformaDraft.termsOfSale} onChange={(event) => setProformaDraft((current) => ({ ...current, termsOfSale: event.target.value }))} maxLength={4000} rows={4} className={textareaClass} /></Field>
          <div className="flex justify-end gap-3"><Button type="button" variant="outline" disabled={creatingProforma} onClick={() => setProformaModalOpen(false)}>Cancel</Button><Button type="button" disabled={creatingProforma} onClick={createProforma} className="min-w-48 gap-2">{creatingProforma ? <Loader2 className="h-4 w-4 animate-spin" /> : <ReceiptText className="h-4 w-4" />}{creatingProforma ? 'Creating proforma...' : 'Create and attach'}</Button></div>
        </section>
      </CardContent>
    </Card>
  </div>}
  </></DocumentWorkspace>;
}
