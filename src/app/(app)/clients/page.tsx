'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { InsightPanel } from '@/components/ui/insight-panel';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { ShieldCheck, AlertTriangle, Plus, Filter, Search, UserCheck } from 'lucide-react';
import { PrismAIService } from '@/lib/prism-ai/service';
import { FormattedMarkdown } from '@/components/ui/formatted-markdown';
import { formatUserMessage } from '@/lib/utils';
import ClientDetailDashboard from '@/components/clients/client-detail-dashboard';

export default function ClientsPage() {
  const [dbClients, setDbClients] = React.useState<any[]>([]);
  const [team, setTeam] = React.useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = React.useState<string | null>(null);
  const [aiText, setAiText] = React.useState<string>(formatUserMessage('Lohith, compiling portfolio churn risks via Prism AI...'));

  React.useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/data?domain=clients');
        if (res.ok) {
          const json = await res.json();
          setDbClients(json);
        }

        const teamRes = await fetch('/api/data?domain=team');
        if (teamRes.ok) {
          const teamJson = await teamRes.json();
          setTeam(teamJson);
        }

        const churn = await PrismAIService.getChurnPredictions();
        if (churn.length > 0) {
          setAiText(formatUserMessage(`Lohith, Prism AI has flagged ${churn[0].clientName} as high risk (${churn[0].riskScore}%). Reasons: ${churn[0].reasons.join(', ')}. Recommendation: ${churn[0].recommendation}`));
        }
      } catch (e) {
        console.error(e);
      }
    }
    load();
  }, []);

  const clients = dbClients.length > 0 ? dbClients : [
    { id: '1', name: 'Aether Technologies', domain: 'aethertech.com', healthScore: 92, healthStatus: 'EXCELLENT', churnRiskScore: 5, upsellOpportunityValue: 50000, metadata: { assignedTeamMemberId: '3' } },
    { id: '2', name: 'Vertex Retail', domain: 'vertexretail.com', healthScore: 88, healthStatus: 'EXCELLENT', churnRiskScore: 12, upsellOpportunityValue: 38500, metadata: { assignedTeamMemberId: '2' } },
    { id: '3', name: 'Nova BioLabs', domain: 'novabiolabs.org', healthScore: 74, healthStatus: 'GOOD', churnRiskScore: 24, upsellOpportunityValue: 24000, metadata: { assignedTeamMemberId: '1' } },
    { id: '4', name: 'Quantum Capital', domain: 'quantumcap.io', healthScore: 61, healthStatus: 'FAIR', churnRiskScore: 35, upsellOpportunityValue: 45000, metadata: { assignedTeamMemberId: '1' } },
    { id: '5', name: 'Solaria Energy', domain: 'solaria.energy', healthScore: 42, healthStatus: 'RISK', churnRiskScore: 68, upsellOpportunityValue: 18000, metadata: { assignedTeamMemberId: '2' } },
    { id: '6', name: 'Pulse Media', domain: 'pulsemedia.agency', healthScore: 95, healthStatus: 'EXCELLENT', churnRiskScore: 3, upsellOpportunityValue: 64000, metadata: { assignedTeamMemberId: '5' } },
    { id: '7', name: 'Onyx Logistics', domain: 'onyxlogistics.com', healthScore: 55, healthStatus: 'FAIR', churnRiskScore: 48, upsellOpportunityValue: 22000, metadata: { assignedTeamMemberId: '5' } },
    { id: '8', name: 'Pinnacle Health', domain: 'pinnaclehealth.co', healthScore: 35, healthStatus: 'RISK', churnRiskScore: 78, upsellOpportunityValue: 15000, metadata: { assignedTeamMemberId: '6' } },
  ];

  const selectedClient = clients.find(c => c.id === selectedClientId);

  if (selectedClient) {
    return (
      <ClientDetailDashboard
        client={selectedClient}
        teamMembers={team.length > 0 ? team : [
          { id: '1', name: 'Lohith Sundar', role: 'Executive CEO', email: 'lohith@apex.co' },
          { id: '2', name: 'Sarah Chen', role: 'Operations Lead', email: 'sarah@apex.co' },
          { id: '3', name: 'Marcus Aurelius', role: 'Creative Director', email: 'marcus.a@apex.co' },
          { id: '4', name: 'Elena Rostova', role: 'Financial Analyst', email: 'elena@apex.co' },
          { id: '5', name: 'David Kim', role: 'Senior Designer', email: 'david@apex.co' },
          { id: '6', name: 'Sophie Dubois', role: 'Lead Copywriter', email: 'sophie.d@client.co' },
        ]}
        onBack={() => setSelectedClientId(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-zinc-800/60 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white silver-text-gradient">Client Portfolio</h1>
          <p className="text-xs text-zinc-500">Manage account relationships, contract values, upsell opportunities, and customer retention metrics.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="h-8 border-zinc-800 text-zinc-300 gap-1.5">
            <Filter className="h-3.5 w-3.5" />
            <span>Filter List</span>
          </Button>
          <Link href="/clients/onboard">
            <Button variant="default" size="sm" className="h-8 gap-1.5 font-semibold">
              <Plus className="h-3.5 w-3.5" />
              <span>Add Client</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card hoverEffect>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Average Portfolio Health</CardTitle>
            <ShieldCheck className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight text-white">
              {dbClients.length > 0
                ? `${(dbClients.reduce((sum, c) => sum + c.healthScore, 0) / dbClients.length).toFixed(1)}/100`
                : '77.8/100'}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[10px] text-zinc-500 font-medium">
              <span>Stable based on recent CSAT audits</span>
            </div>
          </CardContent>
        </Card>

        <Card hoverEffect>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Accounts At Risk</CardTitle>
            <AlertTriangle className="h-4 w-4 text-rose-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight text-rose-400">
              {dbClients.length > 0 ? dbClients.filter(c => c.healthScore < 50).length : 2} Accounts
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[10px] text-rose-400/80 font-medium">
              <span>Solaria Energy & Pinnacle Health</span>
            </div>
          </CardContent>
        </Card>

        <Card hoverEffect>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Total Portfolio Value</CardTitle>
            <UserCheck className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight text-white">
              {dbClients.length > 0
                ? `$${dbClients.reduce((sum, c) => sum + (c.status === 'ACTIVE' ? c.upsellOpportunityValue + 20000 : 0), 0).toLocaleString()}/yr`
                : '$276,500/yr'}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[10px] text-emerald-400 font-semibold">
              <span>+14.2% YoY contract additions</span>
            </div>
          </CardContent>
        </Card>

        <Card hoverEffect>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Upsell Pipeline</CardTitle>
            <ShieldCheck className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight text-white">
              {dbClients.length > 0
                ? `$${dbClients.reduce((sum, c) => sum + c.upsellOpportunityValue, 0).toLocaleString()}`
                : '$45,000'}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[10px] text-zinc-500 font-medium">
              <span>Upgrade proposals pending review</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Split */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Table of clients */}
        <div className="md:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-white">Active Accounts List</CardTitle>
              <CardDescription>Comprehensive overview of portfolio relationships and engagement scores.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client Name</TableHead>
                    <TableHead>Domain</TableHead>
                    <TableHead>Assigned Specialist</TableHead>
                    <TableHead className="text-center">Health Score</TableHead>
                    <TableHead className="text-center">Churn Risk</TableHead>
                    <TableHead className="text-right">Contract Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((c: any) => {
                    const activeTeam = team.length > 0 ? team : [
                      { id: '1', name: 'Lohith Sundar' },
                      { id: '2', name: 'Sarah Chen' },
                      { id: '3', name: 'Marcus Aurelius' },
                      { id: '4', name: 'Elena Rostova' },
                      { id: '5', name: 'David Kim' },
                      { id: '6', name: 'Sophie Dubois' },
                    ];
                    const specialist = activeTeam.find((t: any) => t.id === c.metadata?.assignedTeamMemberId);
                    return (
                      <TableRow 
                        key={c.id} 
                        className="cursor-pointer hover:bg-zinc-900/30 transition-colors" 
                        onClick={() => setSelectedClientId(c.id)}
                      >
                        <TableCell className="font-semibold text-white">{c.name}</TableCell>
                        <TableCell className="font-mono text-xs text-zinc-500">{c.domain}</TableCell>
                        <TableCell className="text-zinc-300">
                          {specialist ? (
                            <span className="inline-flex items-center gap-1.5">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              <span>{specialist.name}</span>
                            </span>
                          ) : (
                            <span className="text-zinc-600 italic">Unassigned</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={
                              c.healthScore >= 80 ? 'risk-low' : c.healthScore >= 50 ? 'risk-medium' : 'risk-high'
                            }
                          >
                            {c.healthScore}/100 ({c.healthStatus})
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-mono text-xs text-zinc-300 font-semibold">{c.churnRiskScore}%</span>
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold">${(c.upsellOpportunityValue || 20000).toLocaleString()}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Insights */}
        <div className="space-y-6">
          <InsightPanel
            type="churn"
            title="Prism Client Churn Alert"
            score="78%"
            scoreLabel="PINNACLE HEALTH CHURN RISK"
            riskLevel="HIGH"
          >
            <FormattedMarkdown text={aiText} />
          </InsightPanel>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-white">Client Health Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-400">Excellent Status (80-100)</span>
                <span className="font-semibold text-white">3 Accounts</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-400">Good / Fair Status (50-79)</span>
                <span className="font-semibold text-white">3 Accounts</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-400">High Risk Status (0-49)</span>
                <span className="font-semibold text-white">2 Accounts</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
