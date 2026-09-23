'use client';

import * as React from 'react';
import { workspaceFetch as fetch } from '@/lib/workspace-data-cache';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { BarChart3, BriefcaseBusiness, Building2, Download, Eye, FileText, Loader2, Megaphone, RefreshCw, Sparkles, Users, X } from 'lucide-react';
import { formatUserMessage } from '@/lib/utils';
import type { ReportKind } from '@/lib/reports/types';
import { PageSkeleton } from '@/components/ui/page-skeletons';
import type { ReportingInitialReadModel } from '@/server/domains/reporting-read-service';

type ReportArchive = {
  id: string;
  title: string;
  type: ReportKind | string;
  status: string;
  client: string;
  author: string;
  pageCount: number | null;
  pdfUrl: string | null;
  date: string;
};

type ClientOption = { id: string; name: string };

const REPORT_OPTIONS: Array<{
  kind: ReportKind;
  title: string;
  description: string;
  detail: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { kind: 'EXECUTIVE', title: 'Executive summary', description: 'Agency-wide leadership brief', detail: 'Clients, delivery, pipeline, commercial value, risks, and Miles recommendations.', icon: BriefcaseBusiness },
  { kind: 'LEADS', title: 'Leads breakdown', description: 'Granular pipeline register', detail: 'Lead-level records, stages, sources, estimated value, conversion, and acquisition timing.', icon: BarChart3 },
  { kind: 'MARKETING', title: 'Marketing breakdown', description: 'Campaign and ad performance', detail: 'Spend, impressions, clicks, CTR, cost per lead, campaigns, and individual ads.', icon: Megaphone },
  { kind: 'CLIENTS', title: 'Client breakdown', description: 'Portfolio or account detail', detail: 'Health, churn, ROI, contacts, invoices, projects, and tasks. Meta metrics are excluded.', icon: Building2 },
  { kind: 'PROJECTS', title: 'Projects breakdown', description: 'Delivery and risk detail', detail: 'Progress, schedules, risk, milestones, team ownership, and commercial terms.', icon: FileText },
  { kind: 'TEAM', title: 'Team breakdown', description: 'Capacity and ownership', detail: 'Roster, roles, project coverage, task ownership, workload, and completion.', icon: Users },
];

export default function ReportingClient({ initialData }: { initialData: ReportingInitialReadModel }) {
  const [reports, setReports] = React.useState<ReportArchive[]>(initialData.reports);
  const [clients, setClients] = React.useState<ClientOption[]>(initialData.clients);
  const [selectedKind, setSelectedKind] = React.useState<ReportKind>('EXECUTIVE');
  const [selectedClientId, setSelectedClientId] = React.useState('');
  const [selectedReport, setSelectedReport] = React.useState<ReportArchive | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [error, setError] = React.useState('');

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [reportResponse, clientResponse] = await Promise.all([
        fetch('/api/reports'),
        fetch('/api/data?domain=clients'),
      ]);
      if (reportResponse.ok) setReports(await reportResponse.json());
      if (clientResponse.ok) setClients(await clientResponse.json());
    } finally {
      setLoading(false);
    }
  }, []);

  const generateReport = async () => {
    setIsGenerating(true);
    setError('');
    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          kind: selectedKind,
          ...(selectedKind === 'CLIENTS' && selectedClientId ? { clientId: selectedClientId } : {}),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to generate the report.');
      setReports((current) => [data, ...current]);
      setSelectedReport(data);
    } catch (generationError) {
      setError(formatUserMessage(generationError instanceof Error ? generationError.message : 'Unable to generate the report.'));
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadReport = (report: ReportArchive) => {
    if (!report.pdfUrl) return;
    const link = document.createElement('a');
    link.href = report.pdfUrl;
    link.download = `${report.title.replace(/[^A-Za-z0-9._-]/g, '_')}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const selectedOption = REPORT_OPTIONS.find((option) => option.kind === selectedKind)!;

  if (loading) return <PageSkeleton variant="reporting" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 border-b border-zinc-800/60 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Miles Reports</span>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white silver-text-gradient">Executive Reporting Studio</h1>
          <p className="mt-1 max-w-2xl text-xs text-zinc-500">Generate polished, agency-branded PDF reports with verified workspace data, granular breakdowns, and Miles analysis.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => void loadData()} disabled={loading} className="h-9 gap-1.5 border-zinc-800 text-zinc-300">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button size="sm" onClick={() => void generateReport()} disabled={isGenerating} className="h-9 min-w-40 gap-1.5 bg-white font-semibold text-zinc-950 hover:bg-zinc-200">
            {isGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {isGenerating ? 'Compiling PDF...' : 'Generate report'}
          </Button>
        </div>
      </div>

      {error && <div className="rounded-md border border-rose-900/40 bg-rose-950/15 px-4 py-3 text-xs text-rose-300">{error}</div>}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {REPORT_OPTIONS.map((option) => {
          const Icon = option.icon;
          const selected = selectedKind === option.kind;
          return (
            <button key={option.kind} type="button" onClick={() => setSelectedKind(option.kind)} className={`min-w-0 overflow-hidden rounded-lg border p-4 text-left transition-colors ${selected ? 'border-zinc-500 bg-zinc-900/70' : 'border-zinc-850 bg-zinc-950/30 hover:border-zinc-700 hover:bg-zinc-900/35'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className={`workspace-selected-icon flex h-9 w-9 items-center justify-center rounded-md border ${selected ? 'border-zinc-600 bg-white text-zinc-950' : 'border-zinc-800 bg-zinc-900 text-zinc-400'}`}><Icon className="h-4 w-4" /></div>
                {selected && <Badge variant="outline" className="border-zinc-600 text-[9px] text-zinc-200">Selected</Badge>}
              </div>
              <div className="mt-4 min-w-0 break-words text-sm font-semibold text-white">{option.title}</div>
              <div className="mt-0.5 min-w-0 break-words text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{option.description}</div>
              <p className="mt-2 min-w-0 break-words text-[11px] leading-5 text-zinc-500">{option.detail}</p>
            </button>
          );
        })}
      </div>

      <Card className="border-zinc-800/80 bg-zinc-950/40">
        <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-sm font-semibold text-white">{selectedOption.title}</div>
            <div className="mt-1 text-xs text-zinc-500">Every generated document contains three designed pages: Miles overview, primary granular table, and secondary detail with recommended actions.</div>
          </div>
          {selectedKind === 'CLIENTS' && (
            <label className="flex min-w-72 flex-col gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              Client scope
              <select value={selectedClientId} onChange={(event) => setSelectedClientId(event.target.value)} className="h-9 rounded-md border border-zinc-800 bg-zinc-900 px-3 text-xs font-medium normal-case tracking-normal text-white outline-none">
                <option value="">All clients</option>
                {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
              </select>
            </label>
          )}
        </CardContent>
      </Card>

      <div className={`grid gap-6 ${selectedReport ? 'xl:grid-cols-[minmax(0,1fr)_minmax(520px,0.9fr)]' : ''}`}>
        <Card className="min-w-0 border-zinc-800/80 bg-zinc-950/35">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div className="min-w-0"><CardTitle className="text-sm text-white">PDF report archive</CardTitle><CardDescription>View or download any generated branded report.</CardDescription></div>
            <Badge variant="outline" className="border-zinc-800 text-zinc-400">{reports.length} reports</Badge>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Report</TableHead><TableHead>Scope</TableHead><TableHead>Created</TableHead><TableHead>Pages</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={5} className="py-12 text-center text-xs text-zinc-500"><Loader2 className="mx-auto mb-2 h-4 w-4 animate-spin" />Loading report archive...</TableCell></TableRow>
                  ) : reports.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="py-12 text-center text-xs text-zinc-500">No PDF reports yet. Select a report above and generate the first one.</TableCell></TableRow>
                  ) : reports.map((report) => (
                    <TableRow key={report.id} className={selectedReport?.id === report.id ? 'bg-zinc-900/60' : ''}>
                      <TableCell><div className="max-w-60 truncate font-semibold text-white">{report.title}</div><div className="mt-1 text-[9px] uppercase tracking-wider text-zinc-600">{report.type}</div></TableCell>
                      <TableCell className="text-xs text-zinc-400">{report.client}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-zinc-500">{report.date}</TableCell>
                      <TableCell className="font-mono text-xs text-zinc-500">{report.pageCount || 'Legacy'}</TableCell>
                      <TableCell className="text-right"><div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" disabled={!report.pdfUrl} onClick={() => setSelectedReport(report)} className="h-8 w-8 text-zinc-400 hover:text-white" title="View PDF"><Eye className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" disabled={!report.pdfUrl} onClick={() => downloadReport(report)} className="h-8 w-8 text-zinc-400 hover:text-white" title="Download PDF"><Download className="h-3.5 w-3.5" /></Button>
                      </div></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {selectedReport?.pdfUrl && (
          <Card className="min-w-0 overflow-hidden border-zinc-800/80 bg-zinc-950/35">
            <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-zinc-850 py-3">
              <div className="min-w-0"><CardTitle className="truncate text-sm text-white">{selectedReport.title}</CardTitle><CardDescription>Secure in-page PDF preview</CardDescription></div>
              <div className="flex gap-1"><Button variant="ghost" size="icon" onClick={() => downloadReport(selectedReport)} className="h-8 w-8"><Download className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="icon" onClick={() => setSelectedReport(null)} className="h-8 w-8"><X className="h-4 w-4" /></Button></div>
            </CardHeader>
            <iframe title={`Preview ${selectedReport.title}`} src={`${selectedReport.pdfUrl}?view=1`} className="h-[760px] w-full bg-zinc-900" />
          </Card>
        )}
      </div>
    </div>
  );
}
