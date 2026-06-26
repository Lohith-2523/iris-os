'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { InsightPanel } from '@/components/ui/insight-panel';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { FolderKanban, AlertCircle, Plus, Filter } from 'lucide-react';
import { formatUserMessage } from '@/lib/utils';

export default function ProjectsPage() {
  const [dbProjects, setDbProjects] = React.useState<any[]>([]);

  React.useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/data?domain=projects');
        if (res.ok) {
          const json = await res.json();
          setDbProjects(json);
        }
      } catch (e) {
        console.error(e);
      }
    }
    load();
  }, []);

  const projects = dbProjects.length > 0 ? dbProjects : [
    { id: '1', name: 'Aether Technologies - Web Portal Redesign', status: 'IN_PROGRESS', progress: 45, risk: 'LOW', client: 'Aether Technologies' },
    { id: '2', name: 'Vertex Retail - Brand Identity Suite', status: 'IN_PROGRESS', progress: 80, risk: 'LOW', client: 'Vertex Retail' },
    { id: '3', name: 'Pulse Media - Video Ads Production', status: 'IN_PROGRESS', progress: 35, risk: 'LOW', client: 'Pulse Media' },
    { id: '4', name: 'Solaria Energy - E-Commerce Integrations', status: 'IN_PROGRESS', progress: 20, risk: 'HIGH', client: 'Solaria Energy' },
    { id: '5', name: 'Nova BioLabs - Operational Audit', status: 'COMPLETED', progress: 100, risk: 'LOW', client: 'Nova BioLabs' },
    { id: '6', name: 'Onyx Logistics - Brand Guidelines Playbook', status: 'COMPLETED', progress: 100, risk: 'LOW', client: 'Onyx Logistics' },
    { id: '7', name: 'Pinnacle Health - SEO Campaign Assets', status: 'IN_PROGRESS', progress: 75, risk: 'LOW', client: 'Pinnacle Health' },
    { id: '8', name: 'Vortex Studio - B2B Brand Kit Evolution', status: 'OVERDUE', progress: 85, risk: 'HIGH', client: 'Vertex Retail' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-zinc-800/60 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white silver-text-gradient">Project Delivery</h1>
          <p className="text-xs text-zinc-500">Track active client deliverables, project progression, milestones, and resource workloads.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="h-8 border-zinc-800 text-zinc-300 gap-1.5">
            <Filter className="h-3.5 w-3.5" />
            <span>Filter Projects</span>
          </Button>
          <Button variant="default" size="sm" className="h-8 gap-1.5 font-semibold">
            <Plus className="h-3.5 w-3.5" />
            <span>Create Project</span>
          </Button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card hoverEffect>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">In Progress</CardTitle>
            <FolderKanban className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight text-white">
              {dbProjects.length > 0
                ? `${dbProjects.filter(p => p.status === 'IN_PROGRESS' || p.status === 'OVERDUE').length} Projects`
                : '12 Projects'}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[10px] text-zinc-500 font-medium">
              <span>Steady progression across active milestones</span>
            </div>
          </CardContent>
        </Card>

        <Card hoverEffect>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Overdue Milestones</CardTitle>
            <AlertCircle className="h-4 w-4 text-rose-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight text-rose-400">
              {dbProjects.length > 0 ? dbProjects.filter(p => p.status === 'OVERDUE').length : 1} Milestone
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[10px] text-rose-400/80 font-medium">
              <span>Timeline overage alert criteria</span>
            </div>
          </CardContent>
        </Card>

        <Card hoverEffect>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Risk Flagged</CardTitle>
            <AlertCircle className="h-4 w-4 text-rose-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight text-rose-400">
              {dbProjects.length > 0 ? dbProjects.filter(p => p.risk === 'HIGH' || p.risk === 'MEDIUM').length : 2} Flagged
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[10px] text-zinc-500 font-medium">
              <span>Timeline risks needing attention</span>
            </div>
          </CardContent>
        </Card>

        <Card hoverEffect>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Average Completion Rate</CardTitle>
            <FolderKanban className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight text-white">74.2%</div>
            <div className="flex items-center gap-1.5 mt-2 text-[10px] text-emerald-400 font-semibold">
              <span>+3.2% vs last quarter velocity</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid Split */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Project Table */}
        <div className="md:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-white">Active Delivery Board</CardTitle>
              <CardDescription>Status and progress percentages across active client projects.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead className="text-right">Risk</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-semibold text-white">{p.name}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            p.status === 'COMPLETED' ? 'risk-low' : p.status === 'OVERDUE' ? 'risk-high' : 'outline'
                          }
                        >
                          {p.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="w-[140px]">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
                            <div style={{ width: `${p.progress}%` }} className="h-full bg-zinc-300" />
                          </div>
                          <span className="font-mono text-xs text-zinc-400">{p.progress}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={p.risk === 'HIGH' ? 'risk-high' : 'risk-low'}>
                          {p.risk}
                        </Badge>
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
            title="Prism Delivery Risk Advisory"
            score="High Alert"
            scoreLabel="RISK MITIGATION STATUS"
            riskLevel="HIGH"
          >
            {formatUserMessage("Lohith, the project **Solaria Energy - E-Commerce Integrations** is delayed due to asset delivery lags. Reassigning internal bandwidth or sending automated reminders is recommended.")}
          </InsightPanel>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-white">Milestone Forecast</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-400">Design Deliverables (Aether)</span>
                <span className="font-semibold text-white">June 20</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-400">Brand Kit Approval (Vertex)</span>
                <span className="font-semibold text-white">June 25</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-400">API Integration Audit (Solaria)</span>
                <span className="font-semibold text-zinc-500">July 02 (Risk)</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
