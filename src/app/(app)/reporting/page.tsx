'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { InsightPanel } from '@/components/ui/insight-panel';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { FileText, Download, Plus, Sparkles, CheckCircle, RefreshCw, ArrowRight } from 'lucide-react';
import { formatUserMessage, renderFormattedText } from '@/lib/utils';

export default function ReportingPage() {
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [reports, setReports] = React.useState([
    { id: '1', title: 'Q2 Financial Performance Brief', client: 'Apex Creative Group', type: 'FINANCE', status: 'READY', date: 'June 15, 2026' },
    { id: '2', title: 'Solaria Energy Account Health Assessment', client: 'Solaria Energy', type: 'CLIENT', status: 'READY', date: 'June 10, 2026' },
    { id: '3', title: 'Vertex Retail Summer Campaign Performance', client: 'Vertex Retail', type: 'CREATIVE', status: 'READY', date: 'June 08, 2026' },
    { id: '4', title: 'Aether Technologies Growth Forecast', client: 'Aether Technologies', type: 'FINANCE', status: 'READY', date: 'June 01, 2026' },
  ]);

  const triggerReportGeneration = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      const newReport = {
        id: (reports.length + 1).toString(),
        title: `Automated Executive Brief - ${new Date().toLocaleDateString()}`,
        client: 'Apex Creative Group',
        type: 'FINANCE',
        status: 'READY',
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      };
      setReports([newReport, ...reports]);
      alert(formatUserMessage('Lohith, Prism AI has generated the Executive Performance Report successfully.'));
    }, 2000);
  };

  const downloadReport = (title: string) => {
    const fileContent = `Report Title: ${title}\nDate: ${new Date().toLocaleDateString()}\nGenerated via Iris OS Executive Reporting.`;
    const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-zinc-800/60 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white silver-text-gradient">Executive Reporting</h1>
          <p className="text-xs text-zinc-500">Configure report automation pipelines, audit executive performance logs, and generate client-facing briefs.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="default"
            size="sm"
            onClick={triggerReportGeneration}
            disabled={isGenerating}
            className="h-8 gap-1.5 font-semibold bg-zinc-100 hover:bg-zinc-200 text-zinc-950 flex items-center"
          >
            {isGenerating ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            <span>{isGenerating ? 'Generating...' : 'One-Click Report'}</span>
          </Button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card hoverEffect>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Active Schedules</CardTitle>
            <FileText className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight text-white">4 Automated</div>
            <div className="flex items-center gap-1.5 mt-2 text-[10px] text-zinc-500 font-medium">
              <span>Weekly & monthly executive syncs</span>
            </div>
          </CardContent>
        </Card>

        <Card hoverEffect>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Reports Ready (Q2)</CardTitle>
            <CheckCircle className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight text-white">18 Briefs</div>
            <div className="flex items-center gap-1.5 mt-2 text-[10px] text-zinc-500 font-medium">
              <span>All client audits verified</span>
            </div>
          </CardContent>
        </Card>

        <Card hoverEffect>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Average Generation Speed</CardTitle>
            <FileText className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight text-white">1.8 seconds</div>
            <div className="flex items-center gap-1.5 mt-2 text-[10px] text-emerald-400 font-semibold">
              <span>Powered by Prism compiler</span>
            </div>
          </CardContent>
        </Card>

        <Card hoverEffect>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Client Delivery Rating</CardTitle>
            <CheckCircle className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight text-white">99.2%</div>
            <div className="flex items-center gap-1.5 mt-2 text-[10px] text-emerald-400 font-semibold">
              <span>Stable compliance metrics</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Split */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Reports Table */}
        <div className="md:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-white">Report Archives</CardTitle>
              <CardDescription>Generated and cached PDF report briefs for agency files.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Report Name</TableHead>
                    <TableHead>Client Account</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-semibold text-white">{r.title}</TableCell>
                      <TableCell>{r.client}</TableCell>
                      <TableCell>{r.date}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{r.type}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => downloadReport(r.title)}
                          className="h-7 w-7 text-zinc-400 hover:text-white rounded cursor-pointer"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Insights */}
        <div className="space-y-6">
          <InsightPanel
            type="general"
            title="Prism Report Automation Scheduler"
            score="Active"
            scoreLabel="SCHEDULE COMPLIANCE"
            riskLevel="LOW"
          >
            {renderFormattedText("Lohith, the monthly **Client Profitability Report** is scheduled to compile on **June 30**. All connected ledger items are fully reconciled and sync verified.")}
          </InsightPanel>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-white">One-Click Client Reporting</CardTitle>
              <CardDescription>Generate individual client health summaries instantly.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full text-xs font-semibold h-9" variant="secondary" onClick={triggerReportGeneration}>
                Compile Aether Performance Brief
              </Button>
              <Button className="w-full text-xs font-semibold h-9" variant="secondary" onClick={triggerReportGeneration}>
                Compile Solaria Churn Audit
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-white">Data Explorer Hub</CardTitle>
              <CardDescription>Create interactive charts, scatter plots, and telemetry reports dynamically.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full text-xs font-semibold h-9 bg-white text-zinc-950 hover:bg-zinc-200 flex items-center justify-center gap-1.5 rounded-md cursor-pointer" 
                onClick={() => window.location.href = '/explorer'}
              >
                <span>Open Data Explorer</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
