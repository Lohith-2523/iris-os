'use client';

import * as React from 'react';
import { CheckCircle2, ExternalLink, FileSignature, FileText, Loader2, ReceiptText } from 'lucide-react';
import { workspaceFetch as fetch } from '@/lib/workspace-data-cache';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageSkeleton } from '@/components/ui/page-skeletons';
import { ClientEmptyState, ClientWorkspacePageHeader } from '@/components/clients/client-workspace-ui';

type Invoice = { id: string; invoiceNumber: string; status: string; amount: number; paidAmount: number; issuedDate: string; dueDate?: string | null; project?: { name: string } | null; downloadUrl: string };
type DocumentRow = { id: string; kind: 'PROPOSAL' | 'CONTRACT' | 'SOW'; title: string; documentNumber: string; status: string; createdAt: string; recipientSignedAt?: string | null; agencySignedAt?: string | null; fullySignedAt?: string | null; signingToken?: string | null; signingTokenExpiresAt?: string | null };

function statusVariant(status: string) {
  if (['EXECUTED', 'FULLY_PAID'].includes(status)) return 'risk-low' as const;
  if (['PARTIALLY_SIGNED', 'UNPAID'].includes(status)) return 'risk-medium' as const;
  return 'outline' as const;
}

export default function ClientDocumentsPage() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [invoices, setInvoices] = React.useState<Invoice[]>([]);
  const [documents, setDocuments] = React.useState<DocumentRow[]>([]);
  const [currency, setCurrency] = React.useState('USD');
  const [signing, setSigning] = React.useState<DocumentRow | null>(null);
  const [signerName, setSignerName] = React.useState('');
  const [consent, setConsent] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    const [invoiceResponse, documentResponse, userResponse] = await Promise.all([
      fetch('/api/invoices?documentType=INVOICE&limit=100', { cache: 'no-store' }),
      fetch('/api/generated-documents?clientWorkspace=true&limit=100', { cache: 'no-store' }),
      fetch('/api/user', { cache: 'no-store' }),
    ]);
    const [invoicePayload, documentPayload, userPayload] = await Promise.all([invoiceResponse.json().catch(() => null), documentResponse.json().catch(() => null), userResponse.json().catch(() => null)]);
    if (!invoiceResponse.ok) throw new Error(invoicePayload?.error || 'Unable to load invoices.');
    if (!documentResponse.ok) throw new Error(documentPayload?.error || 'Unable to load documents.');
    if (!userResponse.ok) throw new Error(userPayload?.error || 'Unable to load workspace settings.');
    setInvoices(invoicePayload || []); setDocuments(documentPayload.documents || []); setCurrency(userPayload.organization?.currency || 'USD');
  }, []);

  React.useEffect(() => { let active = true; load().catch(reason => { if (active) setError(reason instanceof Error ? reason.message : 'Unable to load documents.'); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [load]);

  async function submitSignature(event: React.FormEvent) {
    event.preventDefault();
    if (!signing?.signingToken) return;
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/document-signing/${signing.signingToken}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ signerName, consent }) });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Unable to sign this contract.');
      await load(); setSigning(null); setSignerName(''); setConsent(false);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to sign this contract.'); }
    finally { setBusy(false); }
  }

  if (loading) return <PageSkeleton variant="client-portal" />;
  const proposals = documents.filter(document => document.kind === 'PROPOSAL');
  const contracts = documents.filter(document => document.kind !== 'PROPOSAL');

  return <div className="dashboard-canvas space-y-6">
    <ClientWorkspacePageHeader eyebrow="Client workspace" title="Documents" description="Review project invoices, proposals, and contracts shared with your account. Contracts can be signed securely without leaving this workspace." />
    {error && <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">{error}</div>}
    <div className="grid gap-6 xl:grid-cols-3">
      <DocumentSection title="Project invoices" description="Billing documents issued for your projects" icon={ReceiptText} empty="No project invoices have been issued.">
        {invoices.map(invoice => <div key={invoice.id} className="border-b border-zinc-900 p-4 last:border-0"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-xs font-semibold text-white">{invoice.invoiceNumber}</p><p className="mt-1 truncate text-[10px] text-zinc-500">{invoice.project?.name || 'Project invoice'} · {new Date(invoice.issuedDate).toLocaleDateString()}</p></div><Badge variant={statusVariant(invoice.status)}>{invoice.status.replaceAll('_', ' ')}</Badge></div><div className="mt-3 flex items-center justify-between"><span className="font-mono text-xs font-bold text-zinc-200">{new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(invoice.amount)}</span><a href={invoice.downloadUrl} target="_blank" rel="noreferrer" className="workspace-button inline-flex h-8 items-center justify-center gap-2 rounded-md border border-zinc-800 bg-transparent px-3 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-900 hover:text-white"><ExternalLink className="h-3.5 w-3.5" />View</a></div></div>)}
      </DocumentSection>
      <DocumentSection title="Proposals" description="Proposals sent to your organization" icon={FileText} empty="No proposals have been shared.">
        {proposals.map(document => <DocumentItem key={document.id} document={document} />)}
      </DocumentSection>
      <DocumentSection title="Contracts" description="Contracts and statements of work" icon={FileSignature} empty="No contracts have been shared.">
        {contracts.map(document => <DocumentItem key={document.id} document={document} onSign={() => { setSigning(document); setSignerName(''); setConsent(false); }} />)}
      </DocumentSection>
    </div>
    {signing && <div className="fixed inset-0 z-[80] grid place-items-center bg-black/75 p-4 backdrop-blur-sm" role="presentation" onMouseDown={event => { if (event.currentTarget === event.target && !busy) setSigning(null); }}><Card role="dialog" aria-modal="true" aria-labelledby="client-sign-title" className="w-full max-w-lg bg-zinc-950"><CardHeader><div className="mb-2 grid h-11 w-11 place-items-center rounded-full border border-zinc-700 bg-zinc-900"><FileSignature className="h-5 w-5 text-zinc-200" /></div><CardTitle id="client-sign-title">Sign {signing.title}</CardTitle><CardDescription>Your typed legal name, consent, timestamp, and signature audit details will be recorded with this document.</CardDescription></CardHeader><CardContent><form className="space-y-4" onSubmit={submitSignature}><label className="block space-y-2"><span className="text-xs font-semibold text-zinc-300">Full legal name</span><input required minLength={2} maxLength={160} value={signerName} onChange={event => setSignerName(event.target.value)} className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-sm text-white outline-none focus:border-zinc-600" /></label><label className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 text-xs text-zinc-400"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} className="mt-0.5 h-4 w-4 accent-zinc-200" /><span>I consent to use this electronic signature and confirm that I am authorized to sign this document.</span></label><div className="flex justify-end gap-3"><Button type="button" variant="ghost" disabled={busy} onClick={() => setSigning(null)}>Cancel</Button><Button type="submit" disabled={busy || !consent || signerName.trim().length < 2}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}Sign contract</Button></div></form></CardContent></Card></div>}
  </div>;
}

function DocumentSection({ title, description, icon: Icon, empty, children }: { title: string; description: string; icon: typeof FileText; empty: string; children: React.ReactNode }) {
  const hasChildren = React.Children.count(children) > 0;
  return <Card className="min-w-0 overflow-hidden"><CardHeader className="border-b border-zinc-900"><div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-lg border border-zinc-800 bg-zinc-900/60"><Icon className="h-4 w-4 text-zinc-300" /></div><div><CardTitle className="text-sm">{title}</CardTitle><CardDescription className="mt-1 text-[10px]">{description}</CardDescription></div></div></CardHeader><CardContent className="p-0">{hasChildren ? children : <ClientEmptyState>{empty}</ClientEmptyState>}</CardContent></Card>;
}

function DocumentItem({ document, onSign }: { document: DocumentRow; onSign?: () => void }) {
  const canSign = Boolean(onSign && document.signingToken && !document.recipientSignedAt && (!document.signingTokenExpiresAt || new Date(document.signingTokenExpiresAt) > new Date()));
  return <div className="border-b border-zinc-900 p-4 last:border-0"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-xs font-semibold text-white">{document.title}</p><p className="mt-1 text-[10px] text-zinc-500">{document.documentNumber} · {new Date(document.createdAt).toLocaleDateString()}</p></div><Badge variant={statusVariant(document.status)}>{document.status.replaceAll('_', ' ')}</Badge></div><div className="mt-3 flex flex-wrap justify-end gap-2"><a href={`/api/generated-documents/${document.id}/pdf`} target="_blank" rel="noreferrer" className="workspace-button inline-flex h-8 items-center justify-center gap-2 rounded-md border border-zinc-800 bg-transparent px-3 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-900 hover:text-white"><ExternalLink className="h-3.5 w-3.5" />View</a>{canSign && <Button type="button" size="sm" onClick={onSign}><FileSignature className="h-3.5 w-3.5" />E-sign</Button>}{document.recipientSignedAt && <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400"><CheckCircle2 className="h-3.5 w-3.5" />Signed</span>}</div></div>;
}
