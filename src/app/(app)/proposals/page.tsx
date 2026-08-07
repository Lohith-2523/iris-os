'use client';

import * as React from 'react';
import { Download, FileText, ImagePlus, Loader2, Plus, Trash2 } from 'lucide-react';
import { workspaceFetch as fetch } from '@/lib/workspace-data-cache';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageSkeleton } from '@/components/ui/page-skeletons';
import { formatUserMessage } from '@/lib/utils';
import type { ProposalInput } from '@/lib/proposals/types';
import { DocumentWorkspace } from '@/components/documents/document-workspace';
import { DateInput } from '@/components/ui/date-input';

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
  nextSteps: 'Confirm the selected scope and commercial terms; approve the proposal in Iris OS; schedule the project kickoff; provide the required access and materials.',
};

function Field({ label, children, span = false }: { label: string; children: React.ReactNode; span?: boolean }) {
  return <label className={`space-y-1.5 ${span ? 'md:col-span-2' : ''}`}><span className="block font-semibold text-muted-foreground">{label}</span>{children}</label>;
}

const inputClass = 'w-full rounded-xl border border-border bg-background px-3 py-2.5 text-foreground outline-none placeholder:text-muted-foreground focus:border-ring';
const textareaClass = `${inputClass} min-h-28 resize-y leading-relaxed`;

export default function ProposalsPage() {
  const [form, setForm] = React.useState<ProposalInput>(initialProposal);
  const [loading, setLoading] = React.useState(true);
  const [generating, setGenerating] = React.useState(false);
  const [error, setError] = React.useState('');
  const [pdfUrl, setPdfUrl] = React.useState('');
  const [pdfBlob, setPdfBlob] = React.useState<Blob | null>(null);

  React.useEffect(() => {
    let active = true;
    const loadInitialData = async () => {
      try {
        const leadId = new URLSearchParams(window.location.search).get('leadId')?.trim() || '';
        const [workspaceResponse, leadsResponse] = await Promise.all([
          fetch('/api/workspace'),
          leadId ? fetch('/api/agency-leads') : Promise.resolve(null),
        ]);
        if (!workspaceResponse.ok) throw new Error('Unable to load agency branding.');
        const data = await workspaceResponse.json();
        if (!active) return;
        const organization = data.organization || {};
        const address = [organization.billingAddressLine1, organization.billingAddressLine2, [organization.billingCity, organization.billingState, organization.billingPostalCode].filter(Boolean).join(', '), organization.billingCountry].filter(Boolean).join('\n');
        const jurisdiction = [organization.billingState || organization.billingCity, organization.billingCountry].filter(Boolean).join(', ') || 'the agency jurisdiction';
        let selectedLead: { id: string; fullName: string; email: string; phone?: string | null } | undefined;
        if (leadId && leadsResponse?.ok) {
          const leadData = await leadsResponse.json();
          selectedLead = (leadData.leads || []).find((lead: { id: string }) => lead.id === leadId);
        }
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
      const response = await fetch('/api/proposals/pdf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const firstIssue = payload.issues?.[0]?.message;
        throw new Error(firstIssue || payload.error || 'Unable to generate proposal.');
      }
      const blob = await response.blob();
      const saveResponse = await fetch('/api/generated-documents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'save', kind: 'PROPOSAL', content: form }) });
      if (!saveResponse.ok) { const payload = await saveResponse.json().catch(() => ({})); throw new Error(payload.error || 'The proposal was generated but could not be saved.'); }
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      const nextUrl = URL.createObjectURL(blob);
      setPdfBlob(blob);
      setPdfUrl(nextUrl);
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

  if (loading) return <PageSkeleton variant="reporting" />;

  return <DocumentWorkspace family="PROPOSAL" title="Proposals" description="Create, manage, and send agency-branded proposals with Atlas AI or the complete native editor."><form onSubmit={generate} className="space-y-6">
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
  </form></DocumentWorkspace>;
}
