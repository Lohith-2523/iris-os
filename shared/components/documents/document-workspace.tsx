'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, ChevronDown, Download, Eye, FilePlus2, FileSignature, List, Loader2, Send, Trash2 } from 'lucide-react';
import { workspaceFetch as fetch } from '@/lib/workspace-data-cache';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AtlasIcon } from '@/components/ui/atlas-icon';
import { formatUserMessage } from '@/lib/utils';
import { TranscribeButton } from '@/components/ui/transcribe-button';

type Kind = 'PROPOSAL' | 'CONTRACT' | 'SOW';
type Recipient = { id: string; type: 'LEAD' | 'CLIENT'; name: string; company: string; email: string };
type DocumentRow = { id: string; kind: Kind; title: string; documentNumber: string; status: string; recipientName: string; recipientEmail: string; createdAt: string; sentAt?: string | null; approvedAt?: string | null; approvedByName?: string | null; artifactsGeneratedAt?: string | null; recipientSignedAt?: string | null; agencySignedAt?: string | null; fullySignedAt?: string | null; automationStatus?: string | null; automationError?: string | null };

const fieldClass = 'w-full rounded-xl border border-border bg-background px-3 py-3 text-foreground outline-none placeholder:text-muted-foreground focus:border-ring';

export function DocumentWorkspace({ family, title, description, children }: { family: 'PROPOSAL' | 'LEGAL'; title: string; description: string; children: React.ReactNode }) {
  const [tab, setTab] = React.useState<'list' | 'create'>('list');
  const [mode, setMode] = React.useState<'simple' | 'advanced'>('simple');
  const [documents, setDocuments] = React.useState<DocumentRow[]>([]);
  const [recipients, setRecipients] = React.useState<Recipient[]>([]);
  const [atlasLeadKey, setAtlasLeadKey] = React.useState('');
  const [kind, setKind] = React.useState<Kind>(family === 'PROPOSAL' ? 'PROPOSAL' : 'CONTRACT');
  const [atlasPrompt, setAtlasPrompt] = React.useState('');
  const [busy, setBusy] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [requestedLeadId, setRequestedLeadId] = React.useState('');
  const [approvalTarget, setApprovalTarget] = React.useState<DocumentRow | null>(null);
  const [downloadMenu, setDownloadMenu] = React.useState<{ document: DocumentRow; left: number; top: number } | null>(null);
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
    setAtlasLeadKey(lead.id);
    prefillApplied.current = true;
  }, [recipients, requestedLeadId]);

  React.useEffect(() => {
    if (!downloadMenu) return;
    const closeMenu = () => setDownloadMenu(null);
    window.addEventListener('resize', closeMenu);
    window.addEventListener('scroll', closeMenu, true);
    return () => {
      window.removeEventListener('resize', closeMenu);
      window.removeEventListener('scroll', closeMenu, true);
    };
  }, [downloadMenu]);

  const selectedAtlasLead = recipients.find(recipient => recipient.type === 'LEAD' && recipient.id === atlasLeadKey);

  const createLeadDocumentWithAtlas = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedAtlasLead) return setMessage('Select a lead for Miles AI.');
    if (atlasPrompt.trim().length < 10) return setMessage('Enter a clear instruction for Miles AI.');
    setBusy('atlas-create'); setMessage('');
    try {
      const response = await fetch('/api/generated-documents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'atlas_create', kind, recipientType: 'LEAD', recipientId: selectedAtlasLead.id, prompt: atlasPrompt }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Miles AI could not create the document.');
      await load();
      setAtlasPrompt('');
      setTab('list');
      setMessage(data.pendingApproval ? `${kind.toLowerCase()} created by Miles AI and queued for approval.` : data.sent ? `SOW created by Miles AI and sent to ${selectedAtlasLead.email}.` : `Document created, but delivery needs attention: ${data.warning || 'email was not sent.'}`);
    } catch (error) { setMessage(formatUserMessage(error instanceof Error ? error.message : 'Unable to create document with Miles AI.')); }
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

  const approve = async () => {
    if (!approvalTarget) return;
    const target = approvalTarget;
    setBusy(target.id); setMessage('');
    try {
      const response = await fetch('/api/generated-documents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'approve', id: target.id }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to approve the document.');
      await load();
      setApprovalTarget(null);
      setMessage(target.kind === 'PROPOSAL' ? 'Proposal approved. Its PDF and Word copies are saved and ready to send.' : 'Contract approved and ready to send.');
    } catch (error) { setMessage(formatUserMessage(error instanceof Error ? error.message : 'Unable to approve document.')); }
    finally { setBusy(''); }
  };

  const download = (document: DocumentRow, format: 'pdf' | 'docx' | 'both') => {
    setDownloadMenu(null);
    window.location.assign(`/api/generated-documents/${document.id}/download?format=${format}`);
  };

  const openDownloadMenu = (event: React.MouseEvent<HTMLButtonElement>, document: DocumentRow) => {
    if (downloadMenu?.document.id === document.id) return setDownloadMenu(null);
    const rect = event.currentTarget.getBoundingClientRect();
    const width = 208;
    const estimatedHeight = document.kind === 'PROPOSAL' ? 174 : 94;
    const left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8));
    const top = rect.bottom + estimatedHeight + 8 <= window.innerHeight ? rect.bottom + 8 : Math.max(8, rect.top - estimatedHeight - 8);
    setDownloadMenu({ document, left, top });
  };

  const agencySign = async (id: string) => {
    if (!window.confirm('Countersign this document using your authenticated IrisOS identity? This signature makes the document non-editable.')) return;
    setBusy(id); setMessage('');
    try {
      const response = await fetch('/api/generated-documents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'agency_sign', id }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to countersign the document.');
      await load();
      setMessage(data.document?.fullySignedAt ? 'Document fully executed. Miles onboarding has started.' : 'Agency signature recorded. The recipient signature is still pending.');
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

  const renderDocumentRow = (document: DocumentRow) => {
    const needsApproval = (document.kind === 'PROPOSAL' || document.kind === 'CONTRACT') && !document.approvedAt;
    const canDownload = document.kind !== 'PROPOSAL' || Boolean(document.approvedAt);
    return <tr key={document.id} className="border-b border-border text-foreground">
      <td className="px-3 py-4"><div className="font-semibold">{document.title}</div><div className="text-muted-foreground">{document.kind === 'SOW' ? 'SOW' : document.kind} · {document.documentNumber}</div></td>
      <td className="px-3 py-4"><div>{document.recipientName}</div><div className="text-muted-foreground">{document.recipientEmail}</div></td>
      <td className="px-3 py-4"><span className={`rounded-full border px-2 py-1 text-sm font-medium ${document.approvedAt && !document.sentAt ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300' : needsApproval ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300' : 'border-border bg-muted/40 text-foreground'}`}>{document.status.replaceAll('_', ' ')}</span>{document.approvedAt && <div className="mt-2 text-sm text-muted-foreground">Approved by {document.approvedByName || 'team member'}</div>}{document.kind !== 'PROPOSAL' && <div className="mt-1 text-sm text-muted-foreground">Recipient: {document.recipientSignedAt ? 'signed' : 'pending'} · Agency: {document.agencySignedAt ? 'signed' : 'pending'}</div>}{document.automationStatus === 'NEEDS_REVIEW' && <div className="mt-1 text-sm text-amber-500">Miles review required</div>}</td>
      <td className="px-3 py-4 text-muted-foreground">{new Date(document.createdAt).toLocaleDateString()}</td>
      <td className="px-3 py-4"><div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="icon" title="View document" aria-label="View document" onClick={() => window.open(`/api/generated-documents/${document.id}/pdf`, '_blank', 'noopener,noreferrer')}><Eye className="h-4 w-4" /></Button>
        {needsApproval && <Button type="button" variant="outline" title="Approve document" aria-label="Approve document" disabled={busy === document.id} onClick={() => setApprovalTarget(document)}><CheckCircle2 className="h-4 w-4" />Approve</Button>}
        <Button type="button" variant="outline" size="icon" title={needsApproval ? 'Approval required before sending' : 'Send document'} aria-label={needsApproval ? 'Approval required before sending' : 'Send document'} disabled={busy === document.id || Boolean(document.fullySignedAt) || needsApproval} onClick={() => void send(document.id)}>{busy === document.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</Button>
        <Button type="button" variant="outline" title={canDownload ? 'Download a copy' : 'Approve before downloading'} aria-label={canDownload ? 'Choose download format' : 'Approve before downloading'} aria-haspopup="menu" aria-expanded={downloadMenu?.document.id === document.id} disabled={!canDownload} onClick={event => openDownloadMenu(event, document)}><Download className="h-4 w-4" /><ChevronDown className="h-3.5 w-3.5" /></Button>
        {document.kind !== 'PROPOSAL' && !document.agencySignedAt && <Button type="button" variant="outline" size="icon" title={needsApproval ? 'Approval required before countersigning' : 'Countersign for agency'} aria-label={needsApproval ? 'Approval required before countersigning' : 'Countersign for agency'} disabled={busy === document.id || needsApproval} onClick={() => void agencySign(document.id)}><FileSignature className="h-4 w-4" /></Button>}
        <Button type="button" variant="outline" size="icon" title="Delete document" aria-label="Delete document" disabled={busy === document.id || Boolean(document.recipientSignedAt || document.agencySignedAt)} onClick={() => void remove(document.id)} className="text-rose-400"><Trash2 className="h-4 w-4" /></Button>
      </div></td>
    </tr>;
  };

  return <div className="document-workspace space-y-6 text-foreground">
    <header className="border-b border-border pb-5">
      <span className="font-mono font-bold uppercase tracking-[0.2em] text-muted-foreground">IrisOS Documents</span>
      <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">{title}</h1>
      <p className="mt-1 max-w-3xl text-muted-foreground">{description}</p>
    </header>
    <div className="border-b border-border pb-4">
      <div className="agency-leads-tabs workspace-segmented-control inline-flex items-center gap-1 border border-zinc-900 bg-zinc-950 p-1" role="tablist" aria-label="Document workspace">
        <button type="button" role="tab" aria-selected={tab === 'list'} onClick={() => { setTab('list'); void load().catch(error => setMessage(formatUserMessage(error.message))); }} className={`workspace-segmented-trigger flex cursor-pointer items-center gap-1.5 px-3 py-1.5 text-sm font-semibold transition-all ${tab === 'list' ? 'bg-white font-bold text-zinc-950' : 'text-zinc-400 hover:text-white'}`}><List className="h-4 w-4" /><span>Documents</span></button>
        <button type="button" role="tab" aria-selected={tab === 'create'} onClick={() => setTab('create')} className={`workspace-segmented-trigger flex cursor-pointer items-center gap-1.5 px-3 py-1.5 text-sm font-semibold transition-all ${tab === 'create' ? 'bg-white font-bold text-zinc-950' : 'text-zinc-400 hover:text-white'}`}><FilePlus2 className="h-4 w-4" /><span>Create</span></button>
      </div>
    </div>
    {message && <div role="status" className="rounded-xl border border-border bg-muted/50 px-4 py-3 text-foreground">{message}</div>}
    {tab === 'list' ? <Card>
      <CardHeader><CardTitle>Created documents</CardTitle><CardDescription>Review and approve proposals and contracts before sending them to the client.</CardDescription></CardHeader>
      <CardContent>
        {documents.length === 0 ? <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">No documents created yet.</div> : <div className="overflow-x-auto"><table className="w-full text-left"><thead><tr className="border-b border-border text-muted-foreground"><th className="px-3 py-3">Document</th><th className="px-3 py-3">Recipient</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Created</th><th className="px-3 py-3 text-right">Actions</th></tr></thead><tbody>{documents.map(renderDocumentRow)}</tbody></table></div>}
      </CardContent>
    </Card> : <>
      <div className="flex items-start justify-between gap-3"><div className="agency-leads-tabs workspace-segmented-control inline-flex w-fit items-center gap-1 border border-zinc-900 bg-zinc-950 p-1" role="tablist" aria-label="Creation mode">
        <button type="button" role="tab" aria-selected={mode === 'simple'} onClick={() => setMode('simple')} className={`workspace-segmented-trigger cursor-pointer px-3 py-1.5 text-sm font-semibold transition-all ${mode === 'simple' ? 'bg-white font-bold text-zinc-950' : 'text-zinc-400 hover:text-white'}`}><span>Simple</span></button>
        <button type="button" role="tab" aria-selected={mode === 'advanced'} onClick={() => setMode('advanced')} className={`workspace-segmented-trigger cursor-pointer px-3 py-1.5 text-sm font-semibold transition-all ${mode === 'advanced' ? 'bg-white font-bold text-zinc-950' : 'text-zinc-400 hover:text-white'}`}><span>Edit everything</span></button>
      </div><TranscribeButton /></div>
      {mode === 'simple' ? <div className="space-y-6"><Card className="overflow-hidden border-foreground/20"><CardHeader className="border-b border-border bg-muted/35"><div className="flex items-center gap-2"><AtlasIcon className="h-5 w-5" /><CardTitle>Create from a lead with Miles AI</CardTitle></div><CardDescription>Select an existing lead and tell Miles what the document should accomplish. Miles prepares it for your review and approval.</CardDescription></CardHeader><CardContent className="pt-6">
        <form className="space-y-5" onSubmit={createLeadDocumentWithAtlas}>
          {family === 'LEGAL' && <label className="block space-y-2"><span className="font-semibold text-foreground">Document type</span><select value={kind} onChange={event => setKind(event.target.value as Kind)} className={fieldClass}><option value="CONTRACT">Contract</option><option value="SOW">Statement of Work</option></select></label>}
          <label className="block space-y-2"><span className="font-semibold text-foreground">Lead</span><select required value={atlasLeadKey} onChange={event => setAtlasLeadKey(event.target.value)} className={fieldClass}><option value="">Select a lead</option>{recipients.filter(recipient => recipient.type === 'LEAD').map(lead => <option key={lead.id} value={lead.id}>{lead.name} — {lead.email}</option>)}</select></label>
          {selectedAtlasLead && <div className="grid gap-3 rounded-xl border border-border bg-background p-4 sm:grid-cols-3"><div><span className="block text-sm text-muted-foreground">Lead</span><strong className="text-foreground">{selectedAtlasLead.name}</strong></div><div><span className="block text-sm text-muted-foreground">Company</span><strong className="text-foreground">{selectedAtlasLead.company}</strong></div><div><span className="block text-sm text-muted-foreground">Email</span><strong className="break-all text-foreground">{selectedAtlasLead.email}</strong></div></div>}
          <label className="block space-y-2"><span className="font-semibold text-foreground">Instructions for Miles AI</span><textarea required minLength={10} maxLength={8000} value={atlasPrompt} onChange={event => setAtlasPrompt(event.target.value)} className={`${fieldClass} min-h-36 resize-y`} placeholder="Describe the offer, desired outcome, scope, timeline, pricing, and any special terms. Miles will use the selected lead and agency details automatically." /></label>
          <Button type="submit" disabled={Boolean(busy)} className="min-w-64">{busy === 'atlas-create' ? <Loader2 className="h-4 w-4 animate-spin" /> : <AtlasIcon className="h-4 w-4" />}{busy === 'atlas-create' ? 'Miles is creating...' : kind === 'SOW' ? 'Create and send with Miles AI' : 'Create for approval with Miles AI'}</Button>
        </form>
      </CardContent></Card></div> : children}
    </>}
    {approvalTarget && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="presentation" onMouseDown={event => { if (event.currentTarget === event.target && busy !== approvalTarget.id) setApprovalTarget(null); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="approve-document-title" className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-2xl">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500/12 text-emerald-600 dark:text-emerald-300"><CheckCircle2 className="h-6 w-6" /></div>
        <h2 id="approve-document-title" className="mt-4 text-xl font-bold">Approve {approvalTarget.kind.toLowerCase()}</h2>
        <p className="mt-2 text-muted-foreground">Confirm that you reviewed <strong className="text-foreground">{approvalTarget.title}</strong>. Approval is recorded under your name and must be completed before the document can be sent to {approvalTarget.recipientName}.</p>
        {approvalTarget.kind === 'PROPOSAL' && <p className="mt-3 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">Approval also creates and saves the final PDF and Word copies that will be attached to the client email.</p>}
        <div className="mt-6 flex justify-end gap-3"><Button type="button" variant="outline" disabled={busy === approvalTarget.id} onClick={() => setApprovalTarget(null)}>Cancel</Button><Button type="button" disabled={busy === approvalTarget.id} onClick={() => void approve()}>{busy === approvalTarget.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}Confirm approval</Button></div>
      </div>
    </div>}
    {downloadMenu && typeof document !== 'undefined' && createPortal(<>
      <button type="button" aria-label="Close download menu" className="fixed inset-0 z-40 cursor-default border-0 bg-transparent p-0" onClick={() => setDownloadMenu(null)} />
      <div className="fixed z-50 w-52 rounded-xl border border-border bg-card p-2 text-card-foreground shadow-xl" style={{ left: downloadMenu.left, top: downloadMenu.top }} role="menu" aria-label="Download format">
        <div className="px-2 pb-2 pt-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Download copy</div>
        <button type="button" role="menuitem" onClick={() => download(downloadMenu.document, 'pdf')} className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium hover:bg-muted">PDF document</button>
        {downloadMenu.document.kind === 'PROPOSAL' && <><button type="button" role="menuitem" onClick={() => download(downloadMenu.document, 'docx')} className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium hover:bg-muted">Word document</button><button type="button" role="menuitem" onClick={() => download(downloadMenu.document, 'both')} className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium hover:bg-muted">PDF and Word (.zip)</button></>}
      </div>
    </>, document.body)}
  </div>;
}
