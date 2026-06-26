'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { InsightPanel } from '@/components/ui/insight-panel';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Activity, Check, X, ShieldAlert } from 'lucide-react';
import { formatUserMessage } from '@/lib/utils';

export default function OperationsPage() {
  const [queues, setQueues] = React.useState([
    { id: '1', request: 'Contractor Rate Increase Approval', client: 'Vortex Retail', cost: '$120/hr', submittedBy: 'Elena Rostova', status: 'PENDING' },
    { id: '2', request: 'Extra Design Seat Provisioning', client: 'Aether Digital', cost: '$30/mo', submittedBy: 'Marcus Aurelius', status: 'PENDING' },
    { id: '3', request: 'Budget Overage Buffer Authorization', client: 'Solaria Energy', cost: '$4,500', submittedBy: 'Sarah Chen', status: 'PENDING' },
  ]);

  const handleAction = (id: string, newStatus: 'APPROVED' | 'REJECTED') => {
    setQueues(queues.map((q) => (q.id === id ? { ...q, status: newStatus } : q)));
    alert(formatUserMessage(`Lohith, request status updated to: ${newStatus}`));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-zinc-800/60 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white silver-text-gradient">Operational Control</h1>
          <p className="text-xs text-zinc-500">Audit agency policy compliances, track team resource budgets, and manage the executive approval queue.</p>
        </div>
      </div>

      {/* Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card hoverEffect>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Pending Approvals</CardTitle>
            <Activity className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight text-white">
              {queues.filter((q) => q.status === 'PENDING').length} Requests
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[10px] text-zinc-500 font-medium">
              <span>Awaiting executive sign-off</span>
            </div>
          </CardContent>
        </Card>

        <Card hoverEffect>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Compliance Audits</CardTitle>
            <Activity className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight text-white">100% Pass</div>
            <div className="flex items-center gap-1.5 mt-2 text-[10px] text-emerald-400 font-semibold">
              <span>All brand standards verified</span>
            </div>
          </CardContent>
        </Card>

        <Card hoverEffect>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">SLA Delivery Score</CardTitle>
            <Activity className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight text-white">96.8%</div>
            <div className="flex items-center gap-1.5 mt-2 text-[10px] text-emerald-400 font-semibold">
              <span>Stable milestone delivery compliance</span>
            </div>
          </CardContent>
        </Card>

        <Card hoverEffect>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Average Turnaround</CardTitle>
            <Activity className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight text-white">4.2 hours</div>
            <div className="flex items-center gap-1.5 mt-2 text-[10px] text-zinc-500 font-medium">
              <span>Approval SLA queue latency</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Split */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Approvals Queue */}
        <div className="md:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-white">Executive Approval Pipeline</CardTitle>
              <CardDescription>Authorize budget adjustments, contractor extensions, or resource provisioning requests.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Request Description</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Impact Value</TableHead>
                    <TableHead>Submitted By</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {queues.map((q) => (
                    <TableRow key={q.id}>
                      <TableCell className="font-semibold text-white">{q.request}</TableCell>
                      <TableCell>{q.client}</TableCell>
                      <TableCell className="font-mono text-xs font-semibold text-zinc-300">{q.cost}</TableCell>
                      <TableCell>{q.submittedBy}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={q.status === 'PENDING' ? 'outline' : q.status === 'APPROVED' ? 'risk-low' : 'risk-high'}>
                          {q.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right flex justify-end gap-2">
                        {q.status === 'PENDING' ? (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleAction(q.id, 'APPROVED')}
                              className="h-7 w-7 text-emerald-400 hover:bg-emerald-950/20 rounded"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleAction(q.id, 'REJECTED')}
                              className="h-7 w-7 text-rose-400 hover:bg-rose-950/20 rounded"
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        ) : (
                          <span className="text-[10px] text-zinc-500 uppercase font-semibold">Processed</span>
                        )}
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
            type="leak"
            title="Prism Operational Control Alert"
            score="Budget Alert"
            scoreLabel="PORTFOLIO COMPLIANCE"
            riskLevel="MEDIUM"
          >
            {formatUserMessage('Lohith, the request **"Budget Overage Buffer Authorization"** for **Solaria Energy** relates to scope creep issues. I advise review of the contract parameters before signing off on the $4,500 overage.')}
          </InsightPanel>
        </div>
      </div>
    </div>
  );
}
