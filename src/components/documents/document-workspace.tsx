'use client';

import * as React from 'react';
import { Eye, FilePlus2, FileSignature, List, Loader2, Send, Trash2 } from 'lucide-react';
import { workspaceFetch as fetch } from '@/lib/workspace-data-cache';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AtlasIcon } from '@/components/ui/atlas-icon';
import { formatUserMessage } from '@/lib/utils';

type Kind = 'PROPOSAL' | 'CONTRACT' | 'SOW';
type Recipient = { id: string; type: 'LEAD' | 'CLIENT'; name: string; company: string; email: string };
type DocumentRow = { id: string; kind: Kind; title: string; documentNumber: string; status: string; recipientName: string; recipientEmail: string; createdAt: string; sentAt?: string | null; recipientSignedAt?: string | null; agencySignedAt?: string | null; fullySignedAt?: string | null; automationStatus?: string | null; automationError?: string | null };

const fieldClass = 'w-full rounded-xl border border-border bg-background px-3 py-3 text-foreground outline-none placeholder:text-muted-foreground focus:border-ring';

export function DocumentWorkspace({ family, title, description, children }: { family: 'PROPOSAL' | 'LEGAL'; title: string; description: string; children: React.ReactNode }) {
  const [tab, setTab] = React.useState<'list' | 'create'>('list');
  const [mode, setMode] = React.useState<'simple' | 'advanced'>('simple');
  const [documents, setDocuments] = React.useState<DocumentRow[]>([]);
  const [recipients, setRecipients] = React.useState<Recipient[]>([]);
  const [recipientKey, setRecipientKey] = React.useState('');
  const [atlasLeadKey, setAtlasLeadKey] = React.useState('');
  const [kind, setKind] = React.useState<Kind>(family === 'PROPOSAL' ? 'PROPOSAL' : 'CONTRACT');
  const [simpleDetails, setSimpleDetails] = React.useState({ workProvided: '', timeline: '', paymentTerms: '', termsAndConditions: '' });
  const [atlasPrompt, setAtlasPrompt] = React.useState('');
  const [busy, setBusy] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [requestedLeadId, setRequestedLeadId] = React.useState('');
  const prefillApplied = React.useRef(false);

  const load = React.useCallback(async () => {
    const response = await fetch(`/api/generated-documents?family=${family === 'PROPOSAL' ? 'PROPOSAL' : 'LEGAL'}`);
    if (!response.ok) throw new Error('Unable to load documents.');
    const data = await response.json();
    setDocuments(data.documents || []);
    setRecipients(data.recipients || []);
  }, [family]);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const leadId = family === 'PROPOSAL' ? params.get('leadId')?.trim() || '' : '';
    if (leadId) {
      setRequestedLeadId(leadId);
      setTab('create');
    }
    void load().catch(error => setMessage(formatUserMessage(error.message)));
  }, [family, load]);

  React.useEffect(() => {
    if (!requestedLeadId || prefillApplied.current || recipients.length === 0) return;
    const lead = recipients.find(recipient => recipient.type === 'LEAD' && recipient.id === requestedLeadId);
    if (!lead) {
      setMessage('The selected lead is no longer available. Choose another lead.');
      prefillApplied.current = true;
      return;
    }
    setRecipientKey(`LEAD:${lead.id}`);
    setAtlasLeadKey(lead.id);
    prefillApplied.current = true;
  }, [recipients, requestedLeadId]);

  const selectedRecipient = recipients.find(recipient => `${recipient.type}:${recipient.id}` === recipientKey);
  const selectedAtlasLead = recipients.find(recipient => recipient.type === 'LEAD' && recipient.id === atlasLeadKey);
  const selectableRecipients = kind === 'SOW' ? recipients : recipients.filter(recipient => recipient.type === 'LEAD');
  React.useEffect(() => { if (selectedRecipient && kind !== 'SOW' && selectedRecipient.type === 'CLIENT') setRecipientKey(''); }, [kind, selectedRecipient]);
  const createSimpleDocument = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedRecipient) return setMessage('Select a lead or client.');
    setBusy('create'); setMessage('');
    try {
      const response = await fetch('/api/generated-documents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'simple_create', kind, recipientType: selectedRecipient.type, recipientId: selectedRecipient.id, simpleDetails }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to create the document.');
      await load();
      setSimpleDetails({ workProvided: '', timeline: '', paymentTerms: '', termsAndConditions: '' });
      setTab('list');
      setMessage(data.sent ? `${kind === 'SOW' ? 'SOW' : kind.toLowerCase()} created and sent to ${selectedRecipient.email}.` : `Document created, but delivery needs attention: ${data.warning || 'email was not sent.'}`);
    } catch (error) { setMessage(formatUserMessage(error instanceof Error ? error.message : 'Unable to create document.')); }
    finally { setBusy(''); }
  };

  const createLeadDocumentWithAtlas = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedAtlasLead) return setMessage('Select a lead for Atlas AI.');
    if (atlasPrompt.trim().length < 10) return setMessage('Enter a clear instruction for Atlas AI.');
    setBusy('atlas-create'); setMessage('');
    try {
      const response = await fetch('/api/generated-documents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'atlas_create', kind, recipientType: 'LEAD', recipientId: selectedAtlasLead.id, prompt: atlasPrompt }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Atlas AI could not create the document.');
      await load();
      setAtlasPrompt('');
      setTab('list');
      setMessage(data.sent ? `${kind === 'SOW' ? 'SOW' : kind.toLowerCase()} created by Atlas AI and sent to ${selectedAtlasLead.email}.` : `Document created, but delivery needs attention: ${data.warning || 'email was not sent.'}`);
    } catch (error) { setMessage(formatUserMessage(error instanceof Error ? error.message : 'Unable to create document with Atlas AI.')); }
    finally { setBusy(''); }
  };

  const send = async (id: string) => {
    setBusy(id); setMessage('');
    try {
      const response = await fetch('/api/generated-documents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'send', id }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to send document.');
      await load(); setMessage('Document sent successfully.');
    } catch (error) { setMessage(formatUserMessage(error instanceof Error ? error.message : 'Unable to send document.')); }
    finally { setBusy(''); }
  };

  const agencySign = async (id: string) => {
    if (!window.confirm('Countersign this document using your authenticated Iris OS identity? This signature makes the document immutable.')) return;
    setBusy(id); setMessage('');
    try {
      const response = await fetch('/api/generated-documents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'agency_sign', id }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to countersign the document.');
      await load();
      setMessage(data.document?.fullySignedAt ? 'Document fully executed. Atlas onboarding has started.' : 'Agency signature recorded. The recipient signature is still pending.');
    } catch (error) { setMessage(formatUserMessage(error instanceof Error ? error.message : 'Unable to countersign the document.')); }
    finally { setBusy(''); }
  };

  const remove = async (id: string) => {
    if (!window.confirm('Delete this document? This cannot be undone.')) return;
    setBusy(id); setMessage('');
    try {
      const response = await fetch(`/api/generated-documents?id=${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to delete document.');
      setDocuments(current => current.filter(document => document.id !== id));
    } catch (error) { setMessage(formatUserMessage(error instanceof Error ? error.message : 'Unable to delete document.')); }
    finally { setBusy(''); }
  };

  return <div className="document-workspace space-y-6 text-foreground">
    <header className="border-b border-border pb-5">
      <span className="font-mono font-bold uppercase tracking-[0.2em] text-muted-foreground">Iris Documents</span>
      <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">{title}</h1>
      <p className="mt-1 max-w-3xl text-muted-foreground">{description}</p>
    </header>
    <div className="border-b border-border pb-4">
      <div className="agency-leads-tabs workspace-segmented-control inline-flex items-center gap-1 border border-zinc-900 bg-zinc-950 p-1" role="tablist" aria-label="Document workspace">
        <button type="button" role="tab" aria-selected={tab === 'list'} aria-pressed={tab === 'list'} onClick={() => setTab('list')} className={`workspace-segmented-trigger flex cursor-pointer items-center gap-1.5 px-3 py-1.5 text-sm font-semibold transition-all ${tab === 'list' ? 'bg-white font-bold text-zinc-950' : 'text-zinc-400 hover:text-white'}`}><List className="h-4 w-4" /><span>Documents</span></button>
        <button type="button" role="tab" aria-selected={tab === 'create'} aria-pressed={tab === 'create'} onClick={() => setTab('create')} className={`workspace-segmented-trigger flex cursor-pointer items-center gap-1.5 px-3 py-1.5 text-sm font-semibold transition-all ${tab === 'create' ? 'bg-white font-bold text-zinc-950' : 'text-zinc-400 hover:text-white'}`}><FilePlus2 className="h-4 w-4" /><span>Create</span></button>
      </div>
    </div>
    {message && <div role="status" className="rounded-xl border border-border bg-muted/50 px-4 py-3 text-foreground">{message}</div>}
    {tab === 'list' ? <Card>
      <CardHeader><CardTitle>Created documents</CardTitle><CardDescription>View, send, or remove documents created manually or with Atlas AI.</CardDescription></CardHeader>
      <CardContent>
        {documents.length === 0 ? <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">No documents created yet.</div> : <div className="overflow-x-auto"><table className="w-full text-left"><thead><tr className="border-b border-border text-muted-foreground"><th className="px-3 py-3">Document</th><th className="px-3 py-3">Recipient</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Created</th><th className="px-3 py-3 text-right">Actions</th></tr></thead><tbody>{documents.map(document => <tr key={document.id} className="border-b border-border text-foreground"><td className="px-3 py-4"><div className="font-semibold">{document.title}</div><div className="text-muted-foreground">{document.kind === 'SOW' ? 'SOW' : document.kind} · {document.documentNumber}</div></td><td className="px-3 py-4"><div>{document.recipientName}</div><div className="text-muted-foreground">{document.recipientEmail}</div></td><td className="px-3 py-4"><span className="rounded-full border border-border bg-muted/40 px-2 py-1 text-foreground">{document.status}</span>{document.kind !== 'PROPOSAL' && <div className="mt-2 text-sm text-muted-foreground">Recipient: {document.recipientSignedAt ? 'signed' : 'pending'} · Agency: {document.agencySignedAt ? 'signed' : 'pending'}</div>}{document.automationStatus === 'NEEDS_REVIEW' && <div className="mt-1 text-sm text-amber-500">Atlas review required</div>}</td><td className="px-3 py-4 text-muted-foreground">{new Date(document.createdAt).toLocaleDateString()}</td><td className="px-3 py-4"><div className="flex justify-end gap-2"><Button type="button" variant="outline" size="icon" title="View document" aria-label="View document" onClick={() => window.open(`/api/generated-documents/${document.id}/pdf`, '_blank', 'noopener,noreferrer')}><Eye className="h-4 w-4" /></Button><Button type="button" variant="outline" size="icon" title="Send document" aria-label="Send document" disabled={busy === document.id || Boolean(document.fullySignedAt)} onClick={() => void send(document.id)}>{busy === document.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</Button>{document.kind !== 'PROPOSAL' && !document.agencySignedAt && <Button type="button" variant="outline" size="icon" title="Countersign for agency" aria-label="Countersign for agency" disabled={busy === document.id} onClick={() => void agencySign(document.id)}><FileSignature className="h-4 w-4" /></Button>}<Button type="button" variant="outline" size="icon" title="Delete document" aria-label="Delete document" disabled={busy === document.id || Boolean(document.recipientSignedAt || document.agencySignedAt)} onClick={() => void remove(document.id)} className="text-rose-400"><Trash2 className="h-4 w-4" /></Button></div></td></tr>)}</tbody></table></div>}
      </CardContent>
    </Card> : <>
      <div className="agency-leads-tabs workspace-segmented-control inline-flex w-fit items-center gap-1 border border-zinc-900 bg-zinc-950 p-1" role="tablist" aria-label="Creation mode">
        <button type="button" role="tab" aria-selected={mode === 'simple'} aria-pressed={mode === 'simple'} onClick={() => setMode('simple')} className={`workspace-segmented-trigger cursor-pointer px-3 py-1.5 text-sm font-semibold transition-all ${mode === 'simple' ? 'bg-white font-bold text-zinc-950' : 'text-zinc-400 hover:text-white'}`}><span>Simple</span></button>
        <button type="button" role="tab" aria-selected={mode === 'advanced'} aria-pressed={mode === 'advanced'} onClick={() => setMode('advanced')} className={`workspace-segmented-trigger cursor-pointer px-3 py-1.5 text-sm font-semibold transition-all ${mode === 'advanced' ? 'bg-white font-bold text-zinc-950' : 'text-zinc-400 hover:text-white'}`}><span>Edit everything</span></button>
      </div>
      {mode === 'simple' ? <div className="space-y-6"><Card><CardHeader><CardTitle>Simple document creation</CardTitle><CardDescription>Select a recipient and enter only the engagement essentials. Iris OS completes the branded document with its standard clauses and sends it directly.</CardDescription></CardHeader><CardContent>
        <form className="space-y-5" onSubmit={createSimpleDocument}>
          {family === 'LEGAL' && <label className="block space-y-2"><span className="font-semibold text-foreground">Document type</span><select value={kind} onChange={event => setKind(event.target.value as Kind)} className={fieldClass}><option value="CONTRACT">Contract</option><option value="SOW">Statement of Work</option></select></label>}
          <label className="block space-y-2"><span className="font-semibold text-foreground">{kind === 'SOW' ? 'Client or lead' : 'Lead'}</span><select required value={recipientKey} onChange={event => setRecipientKey(event.target.value)} className={fieldClass}><option value="">{kind === 'SOW' ? 'Select a lead or client' : 'Select a lead'}</option>{kind === 'SOW' && <optgroup label="Clients">{selectableRecipients.filter(r => r.type === 'CLIENT').map(r => <option key={`CLIENT:${r.id}`} value={`CLIENT:${r.id}`}>{r.company} — {r.email}</option>)}</optgroup>}<optgroup label="Leads">{selectableRecipients.filter(r => r.type === 'LEAD').map(r => <option key={`LEAD:${r.id}`} value={`LEAD:${r.id}`}>{r.name} — {r.email}</option>)}</optgroup></select>{kind !== 'SOW' && <span className="block text-sm text-muted-foreground">Proposals and contracts can only be issued to saved leads.</span>}</label>
          {selectedRecipient && <div className="grid gap-3 rounded-xl border border-border bg-muted/35 p-4 sm:grid-cols-3"><div><span className="block text-sm text-muted-foreground">Contact</span><strong className="text-foreground">{selectedRecipient.name}</strong></div><div><span className="block text-sm text-muted-foreground">Company</span><strong className="text-foreground">{selectedRecipient.company}</strong></div><div><span className="block text-sm text-muted-foreground">Email</span><strong className="break-all text-foreground">{selectedRecipient.email}</strong></div></div>}
          <label className="block space-y-2"><span className="font-semibold text-foreground">Work provided</span><textarea required minLength={2} maxLength={8000} value={simpleDetails.workProvided} onChange={event => setSimpleDetails(current => ({ ...current, workProvided: event.target.value }))} className={`${fieldClass} min-h-32 resize-y`} placeholder="Describe the services, scope, and deliverables included." /></label>
          <div className="grid gap-5 md:grid-cols-2">
            <label className="block space-y-2"><span className="font-semibold text-foreground">Timeline</span><textarea required minLength={2} maxLength={2000} value={simpleDetails.timeline} onChange={event => setSimpleDetails(current => ({ ...current, timeline: event.target.value }))} className={`${fieldClass} min-h-28 resize-y`} placeholder="For example: Kickoff on 10 August, delivery within 6 weeks." /></label>
            <label className="block space-y-2"><span className="font-semibold text-foreground">Payment terms</span><textarea required minLength={2} maxLength={4000} value={simpleDetails.paymentTerms} onChange={event => setSimpleDetails(current => ({ ...current, paymentTerms: event.target.value }))} className={`${fieldClass} min-h-28 resize-y`} placeholder="For example: 50% upfront and 50% on final delivery; invoices due in 14 days." /></label>
          </div>
          <label className="block space-y-2"><span className="font-semibold text-foreground">Terms and conditions <span className="font-normal text-muted-foreground">(optional)</span></span><textarea maxLength={10000} value={simpleDetails.termsAndConditions} onChange={event => setSimpleDetails(current => ({ ...current, termsAndConditions: event.target.value }))} className={`${fieldClass} min-h-28 resize-y`} placeholder="Add any engagement-specific terms." /><span className="block text-sm text-muted-foreground">Leave this blank to use the standard Iris OS terms and conditions.</span></label>
          <Button type="submit" disabled={Boolean(busy)} className="min-w-56">{busy === 'create' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FilePlus2 className="h-4 w-4" />}{busy === 'create' ? 'Creating and sending...' : 'Create and send document'}</Button>
        </form>
      </CardContent></Card>
      <Card className="overflow-hidden border-foreground/20"><CardHeader className="border-b border-border bg-muted/35"><div className="flex items-center gap-2"><AtlasIcon className="h-5 w-5" /><CardTitle>Create from a lead with Atlas AI</CardTitle></div><CardDescription>Select an existing lead and tell Atlas what the document should accomplish. Atlas uses the lead profile and your agency details to prepare and send it.</CardDescription></CardHeader><CardContent className="pt-6">
        <form className="space-y-5" onSubmit={createLeadDocumentWithAtlas}>
          {family === 'LEGAL' && <label className="block space-y-2"><span className="font-semibold text-foreground">Document type</span><select value={kind} onChange={event => setKind(event.target.value as Kind)} className={fieldClass}><option value="CONTRACT">Contract</option><option value="SOW">Statement of Work</option></select></label>}
          <label className="block space-y-2"><span className="font-semibold text-foreground">Lead</span><select required value={atlasLeadKey} onChange={event => setAtlasLeadKey(event.target.value)} className={fieldClass}><option value="">Select a lead</option>{recipients.filter(recipient => recipient.type === 'LEAD').map(lead => <option key={lead.id} value={lead.id}>{lead.name} — {lead.email}</option>)}</select></label>
          {selectedAtlasLead && <div className="grid gap-3 rounded-xl border border-border bg-background p-4 sm:grid-cols-3"><div><span className="block text-sm text-muted-foreground">Lead</span><strong className="text-foreground">{selectedAtlasLead.name}</strong></div><div><span className="block text-sm text-muted-foreground">Company</span><strong className="text-foreground">{selectedAtlasLead.company}</strong></div><div><span className="block text-sm text-muted-foreground">Email</span><strong className="break-all text-foreground">{selectedAtlasLead.email}</strong></div></div>}
          <label className="block space-y-2"><span className="font-semibold text-foreground">Instructions for Atlas AI</span><textarea required minLength={10} maxLength={8000} value={atlasPrompt} onChange={event => setAtlasPrompt(event.target.value)} className={`${fieldClass} min-h-36 resize-y`} placeholder="Describe the offer, desired outcome, scope, timeline, pricing, and any special terms. Atlas will use the selected lead and agency details automatically." /></label>
          <Button type="submit" disabled={Boolean(busy)} className="min-w-64">{busy === 'atlas-create' ? <Loader2 className="h-4 w-4 animate-spin" /> : <AtlasIcon className="h-4 w-4" />}{busy === 'atlas-create' ? 'Atlas is creating and sending...' : 'Create and send with Atlas AI'}</Button>
        </form>
      </CardContent></Card></div> : children}
    </>}
  </div>;
}
