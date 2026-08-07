'use client';

import * as React from 'react';
import { CheckCircle2, FileSignature, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

type SigningDocument = { title: string; documentNumber: string; kind: 'CONTRACT' | 'SOW'; agencyName: string; recipientName: string; recipientEmail: string; status: string; recipientSignerName?: string | null; recipientSignedAt?: string | null; agencySignerName?: string | null; agencySignedAt?: string | null; fullySignedAt?: string | null };

export default function SignDocumentPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = React.use(params);
  const [document, setDocument] = React.useState<SigningDocument | null>(null);
  const [signerName, setSignerName] = React.useState('');
  const [consent, setConsent] = React.useState(false);
  const [busy, setBusy] = React.useState(true);
  const [error, setError] = React.useState('');

  const load = React.useCallback(async () => {
    const response = await fetch(`/api/document-signing/${token}`, { cache: 'no-store' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Unable to load the document.');
    setDocument(data); setSignerName(data.recipientSignerName || data.recipientName || '');
  }, [token]);
  React.useEffect(() => { void load().catch(reason => setError(reason instanceof Error ? reason.message : 'Unable to load the document.')).finally(() => setBusy(false)); }, [load]);

  const sign = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const response = await fetch(`/api/document-signing/${token}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ signerName, consent }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to record the signature.');
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to record the signature.'); }
    finally { setBusy(false); }
  };

  if (busy && !document) return <main className="grid min-h-screen place-items-center bg-zinc-950 text-white"><div className="flex items-center gap-3"><Loader2 className="h-6 w-6 animate-spin" /><span>Loading secure document…</span></div></main>;
  if (!document) return <main className="grid min-h-screen place-items-center bg-zinc-950 p-6 text-white"><div className="max-w-lg border border-zinc-800 bg-zinc-900 p-8"><h1 className="text-2xl font-bold">Document unavailable</h1><p className="mt-3 text-zinc-400">{error}</p></div></main>;
  const signed = Boolean(document.recipientSignedAt);

  return <main className="min-h-screen bg-zinc-950 px-4 py-8 text-white sm:px-6"><div className="mx-auto max-w-7xl space-y-6">
    <header className="flex flex-col gap-4 border-b border-zinc-800 pb-6 sm:flex-row sm:items-end sm:justify-between"><div><div className="flex items-center gap-2 text-zinc-400"><ShieldCheck className="h-5 w-5" /><span className="font-mono text-sm font-bold uppercase tracking-[0.18em]">Secure Iris OS e-sign</span></div><h1 className="mt-2 text-3xl font-bold">{document.title}</h1><p className="mt-1 text-zinc-400">{document.kind === 'SOW' ? 'Statement of Work' : 'Contract'} · {document.documentNumber} · {document.agencyName}</p></div><span className="w-fit border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm font-semibold">{document.fullySignedAt ? 'Fully executed' : signed ? 'Your signature recorded' : 'Awaiting your signature'}</span></header>
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,.55fr)]"><section className="overflow-hidden border border-zinc-800 bg-white"><iframe title="Document preview" src={`/api/document-signing/${token}/pdf#view=FitH`} className="h-[78vh] min-h-[640px] w-full" /></section>
      <aside className="h-fit border border-zinc-800 bg-zinc-900 p-6 xl:sticky xl:top-6">{signed ? <div className="space-y-4"><CheckCircle2 className="h-10 w-10 text-zinc-200" /><div><h2 className="text-xl font-bold">Signature recorded</h2><p className="mt-2 text-zinc-400">Signed by {document.recipientSignerName} on {new Date(document.recipientSignedAt!).toLocaleString()}.</p></div><div className="border-t border-zinc-800 pt-4 text-sm text-zinc-400">{document.fullySignedAt ? 'Both parties have signed. The executed copy now includes the electronic-signature audit certificate.' : `Iris OS has notified ${document.agencyName} that its countersignature is required.`}</div></div> : <form className="space-y-5" onSubmit={sign}><div><FileSignature className="h-8 w-8" /><h2 className="mt-3 text-xl font-bold">Electronic signature</h2><p className="mt-2 text-sm leading-6 text-zinc-400">Review the complete document before signing. Your typed legal name, timestamp, and a privacy-preserving request audit will be recorded.</p></div><label className="block space-y-2"><span className="font-semibold">Full legal name</span><input required minLength={2} maxLength={160} value={signerName} onChange={event => setSignerName(event.target.value)} className="w-full border border-zinc-700 bg-zinc-950 px-3 py-3 text-white outline-none focus:border-zinc-400" /></label><label className="flex items-start gap-3 border border-zinc-800 bg-zinc-950 p-4"><input required type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} className="mt-1 h-4 w-4" /><span className="text-sm leading-6 text-zinc-300">I have reviewed this document, agree to its terms, and consent to use my typed name as my electronic signature.</span></label>{error && <div role="alert" className="border border-rose-900 bg-rose-950/30 px-3 py-2 text-sm text-rose-200">{error}</div>}<Button type="submit" disabled={busy || !consent} className="w-full">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSignature className="h-4 w-4" />}{busy ? 'Recording signature…' : 'Sign document'}</Button></form>}</aside>
    </div>
  </div></main>;
}
