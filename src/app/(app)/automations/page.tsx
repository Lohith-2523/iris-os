'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { InsightPanel } from '@/components/ui/insight-panel';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Cpu, Play, Plus, Zap, ToggleLeft, ToggleRight } from 'lucide-react';
import { formatUserMessage } from '@/lib/utils';

export default function AutomationsPage() {
  const [automations, setAutomations] = React.useState([
    { id: '1', name: 'Invoice Alert Slack Sync', trigger: 'Invoice Created', action: 'Slack Message Dispatch', status: 'ACTIVE' },
    { id: '2', name: 'Design Approval Email', trigger: 'Design Approved', action: 'Email Send', status: 'ACTIVE' },
    { id: '3', name: 'Churn Risk Alert Notification', trigger: 'Client Health Drop', action: 'Slack Team Alert', status: 'ACTIVE' },
    { id: '4', name: 'Weekly Executive Report Email', trigger: 'Scheduled Time (Mon 9 AM)', action: 'Compile Report & Send', status: 'INACTIVE' },
  ]);

  const toggleStatus = (id: string) => {
    setAutomations(
      automations.map((a) =>
        a.id === id ? { ...a, status: a.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' } : a
      )
    );
  };

  const runs = [
    { id: '1', name: 'Invoice Alert Slack Sync', time: '10:15 AM', status: 'SUCCESS', log: 'Payload dispatched successfully to #finance-alerts.' },
    { id: '2', name: 'Design Approval Email', time: 'Yesterday', status: 'SUCCESS', log: 'Email sent successfully to marcus.a@apex.co.' },
    { id: '3', name: 'Churn Risk Alert Notification', time: '2 days ago', status: 'FAILED', log: 'Webhook timeout. Slack integration token expired.' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-zinc-800/60 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white silver-text-gradient">Workflow Automations</h1>
          <p className="text-xs text-zinc-500">Configure triggers, sync behaviors, notification webhooks, and audit automated run histories.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="default" size="sm" className="h-8 gap-1.5 font-semibold">
            <Plus className="h-3.5 w-3.5" />
            <span>Create Automation</span>
          </Button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card hoverEffect>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Active Rules</CardTitle>
            <Cpu className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight text-white">3 Rules</div>
            <div className="flex items-center gap-1.5 mt-2 text-[10px] text-zinc-500 font-medium">
              <span>Syncing connected API endpoints</span>
            </div>
          </CardContent>
        </Card>

        <Card hoverEffect>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Automation Runs (24h)</CardTitle>
            <Zap className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight text-white">14 executions</div>
            <div className="flex items-center gap-1.5 mt-2 text-[10px] text-emerald-400 font-semibold">
              <span>99.1% execution success rating</span>
            </div>
          </CardContent>
        </Card>

        <Card hoverEffect>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Average Execution Latency</CardTitle>
            <Cpu className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight text-white">124 ms</div>
            <div className="flex items-center gap-1.5 mt-2 text-[10px] text-zinc-500 font-medium">
              <span>Highly optimized edge dispatches</span>
            </div>
          </CardContent>
        </Card>

        <Card hoverEffect>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">System Webhooks</CardTitle>
            <Zap className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight text-white">4 Active</div>
            <div className="flex items-center gap-1.5 mt-2 text-[10px] text-zinc-500 font-medium">
              <span>Consolidated listeners active</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main split */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Rules Board */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-white">Active Automation Rules</CardTitle>
              <CardDescription>Custom triggers configured to run actions programmatically.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Workflow Name</TableHead>
                    <TableHead>Trigger</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Toggle</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {automations.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-semibold text-white">{a.name}</TableCell>
                      <TableCell className="font-mono text-xs">{a.trigger}</TableCell>
                      <TableCell className="font-mono text-xs text-zinc-400">{a.action}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={a.status === 'ACTIVE' ? 'risk-low' : 'outline'}>
                          {a.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <button onClick={() => toggleStatus(a.id)} className="text-zinc-500 hover:text-white cursor-pointer select-none">
                          {a.status === 'ACTIVE' ? (
                            <ToggleRight className="h-6 w-6 text-zinc-300" />
                          ) : (
                            <ToggleLeft className="h-6 w-6" />
                          )}
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Execution Logs */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-white">Recent Automation Runs</CardTitle>
              <CardDescription>Audited execution logs of programmatic dispatches.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Workflow</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Execution Logs</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {runs.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-semibold text-white">{r.name}</TableCell>
                      <TableCell>{r.time}</TableCell>
                      <TableCell>
                        <Badge variant={r.status === 'SUCCESS' ? 'risk-low' : 'risk-high'}>
                          {r.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-xs text-zinc-500 font-mono max-w-[200px] truncate">
                        {r.log}
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
            title="Prisma Automation Compliance"
            score="99.1%"
            scoreLabel="SYNC RUN RELIABILITY"
            riskLevel="LOW"
          >
            {formatUserMessage("Lohith, our QuickBooks billing automation is running stable. However, the **Hubspot API integration** webhook has failed twice due to token expirations. Re-authenticating credentials in settings is advised.")}
          </InsightPanel>
        </div>
      </div>
    </div>
  );
}
