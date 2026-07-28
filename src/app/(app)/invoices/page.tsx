'use client';

import * as React from 'react';
import { workspaceFetch as fetch } from '@/lib/workspace-data-cache';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, FileText, Loader2, Send } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

function statusLabel(status: string) {
  if (status === 'PARTIALLY_PAID') return 'Partially paid';
  if (status === 'FULLY_PAID') return 'Fully paid';
  return 'Unpaid';
}

function statusClass(status: string) {
  if (status === 'FULLY_PAID') return 'border-emerald-900/40 bg-emerald-950/20 text-emerald-400';
  if (status === 'PARTIALLY_PAID') return 'border-amber-900/40 bg-amber-950/20 text-amber-400';
  return 'border-zinc-700 bg-zinc-900 text-zinc-300';
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = React.useState<any[]>([]);
  const [projects, setProjects] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [creating, setCreating] = React.useState(false);
  const [error, setError] = React.useState('');
  const [downloadingInvoiceId, setDownloadingInvoiceId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({
    projectId: '',
    description: '',
  });

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [invoiceResponse, projectResponse] = await Promise.all([
        fetch('/api/invoices'),
        fetch('/api/projects'),
      ]);
      if (!invoiceResponse.ok) throw new Error('Unable to load invoices.');
      setInvoices(await invoiceResponse.json());
      if (projectResponse.ok) setProjects(await projectResponse.json());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load invoices.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const createInvoice = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.projectId || creating) return;
    setCreating(true);
    setError('');
    try {
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Unable to create invoice.');
      setForm({ projectId: '', description: '' });
      await load();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Unable to create invoice.');
    } finally {
      setCreating(false);
    }
  };

  const downloadInvoice = async (invoice: any) => {
    if (downloadingInvoiceId) return;
    setDownloadingInvoiceId(invoice.id);
    setError('');
    try {
      // PDF responses are binary and must bypass the workspace JSON cache.
      const response = await globalThis.fetch(invoice.downloadUrl, { cache: 'no-store' });
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
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : 'Unable to download this invoice.');
    } finally {
      setDownloadingInvoiceId(null);
    }
  };

  const outstanding = invoices.reduce((sum, invoice) => sum + Number(invoice.balanceDue || 0), 0);
  const partialCount = invoices.filter((invoice) => invoice.status === 'PARTIALLY_PAID').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 border-b border-zinc-800/60 pb-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="silver-text-gradient text-2xl font-bold tracking-tight text-white">Project Invoices</h1>
          <p className="text-xs text-zinc-500">Generate, send, reconcile, and download project-bound PDF invoices.</p>
        </div>
        <Badge className="border-zinc-800 bg-zinc-900 text-zinc-300">{invoices.length} invoices</Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] uppercase tracking-wider text-zinc-500">Outstanding</CardTitle>
          </CardHeader>
          <CardContent className="font-mono text-xl font-bold text-white">{formatCurrency(outstanding)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] uppercase tracking-wider text-zinc-500">Partially paid</CardTitle>
          </CardHeader>
          <CardContent className="font-mono text-xl font-bold text-amber-400">{partialCount}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] uppercase tracking-wider text-zinc-500">Delivered PDFs</CardTitle>
          </CardHeader>
          <CardContent className="font-mono text-xl font-bold text-white">
            {invoices.filter((invoice) => invoice.deliveryStatus === 'SENT').length}
          </CardContent>
        </Card>
      </div>

      {error && (
        <div className="rounded border border-amber-900/40 bg-amber-950/15 p-3 text-xs text-amber-300">{error}</div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-white">Invoice register</CardTitle>
            <CardDescription>Payment status is controlled by linked revenue entries and cannot be edited here.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-16 text-xs text-zinc-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading invoices...
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Client / Project</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead className="text-right">PDF</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-14 text-center text-zinc-500">No project invoices yet.</TableCell>
                    </TableRow>
                  ) : invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell>
                        <span className="block font-mono font-semibold text-white">{invoice.invoiceNumber}</span>
                        <span className="mt-1 block text-[9px] text-zinc-600">{new Date(invoice.issuedDate).toLocaleDateString()}</span>
                      </TableCell>
                      <TableCell>
                        <span className="block font-semibold text-zinc-300">{invoice.client?.name}</span>
                        <span className="mt-1 block text-[10px] text-zinc-500">{invoice.project?.name}</span>
                      </TableCell>
                      <TableCell className="text-zinc-400">{new Date(invoice.dueDate).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge className={statusClass(invoice.status)}>{statusLabel(invoice.status)}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-white">{formatCurrency(invoice.amount)}</TableCell>
                      <TableCell className="text-right font-mono text-zinc-300">{formatCurrency(invoice.balanceDue)}</TableCell>
                      <TableCell className="text-right">
                        <button
                          type="button"
                          onClick={() => downloadInvoice(invoice)}
                          disabled={downloadingInvoiceId === invoice.id}
                          className="inline-flex h-8 items-center gap-1.5 border border-zinc-800 px-2.5 text-[10px] font-semibold text-zinc-300 hover:border-zinc-600 hover:text-white"
                        >
                          {downloadingInvoiceId === invoice.id
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <Download className="h-3.5 w-3.5" />}
                          {downloadingInvoiceId === invoice.id ? 'Preparing...' : 'Download'}
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-white">
              <FileText className="h-4 w-4 text-zinc-500" /> Create invoice
            </CardTitle>
            <CardDescription>The project&apos;s configured payment value is used and the PDF is emailed immediately.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={createInvoice} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-zinc-400">Project *</label>
                <select
                  required
                  value={form.projectId}
                  onChange={(event) => setForm((current) => ({ ...current, projectId: event.target.value }))}
                  className="w-full border border-zinc-850 bg-zinc-900/40 p-2.5 text-white outline-none focus:border-zinc-700"
                >
                  <option value="">Select project...</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>{project.client?.name} - {project.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="font-semibold text-zinc-400">Line-item description</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                  placeholder="Defaults to the project's service line"
                  className="w-full resize-none border border-zinc-850 bg-zinc-900/40 p-2.5 text-white outline-none placeholder:text-zinc-650 focus:border-zinc-700"
                />
              </div>
              <Button type="submit" disabled={creating || !form.projectId} className="w-full gap-2">
                {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                {creating ? 'Generating and sending...' : 'Generate PDF and send'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
