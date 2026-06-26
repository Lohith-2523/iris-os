'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { InsightPanel } from '@/components/ui/insight-panel';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Blocks, RefreshCw, AlertTriangle, ShieldCheck } from 'lucide-react';
import { IntegrationAdapters } from '@/lib/integrations/adapters';
import { formatUserMessage } from '@/lib/utils';

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = React.useState<any[]>([]);
  const [syncingProvider, setSyncingProvider] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function load() {
      const data = await IntegrationAdapters.getStates();
      setIntegrations(data);
    }
    load();
  }, []);

  const handleSync = async (provider: string) => {
    setSyncingProvider(provider);
    // Simulate API delay
    setTimeout(async () => {
      const result = await IntegrationAdapters.syncProvider(provider);
      setIntegrations((prev) =>
        prev.map((item) => (item.provider === provider ? { ...item, ...result } : item))
      );
      setSyncingProvider(null);
      alert(formatUserMessage(`Lohith, successfully synced data for provider: ${provider}`));
    }, 1500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-zinc-800/60 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white silver-text-gradient">App Integrations</h1>
          <p className="text-xs text-zinc-500">Configure OAuth connection parameters, monitor data sync schedules, and review sync audit logs.</p>
        </div>
      </div>

      {/* Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card hoverEffect>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Connected Apps</CardTitle>
            <Blocks className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight text-white">
              {integrations.filter((i) => i.status === 'CONNECTED').length} Connected
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[10px] text-zinc-500 font-medium">
              <span>Stable API connections active</span>
            </div>
          </CardContent>
        </Card>

        <Card hoverEffect>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Integration Errors</CardTitle>
            <AlertTriangle className="h-4 w-4 text-rose-450" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight text-rose-405">
              {integrations.filter((i) => i.status === 'DISCONNECTED' || i.status === 'ERROR').length} Flagged
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[10px] text-rose-450/80 font-medium">
              <span>Token expiration issues</span>
            </div>
          </CardContent>
        </Card>

        <Card hoverEffect>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Daily API Calls</CardTitle>
            <Blocks className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight text-white">4,280 calls</div>
            <div className="flex items-center gap-1.5 mt-2 text-[10px] text-zinc-500 font-medium">
              <span>No throttle rates triggered</span>
            </div>
          </CardContent>
        </Card>

        <Card hoverEffect>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Webhook Events</CardTitle>
            <Blocks className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight text-white">128 Received</div>
            <div className="flex items-center gap-1.5 mt-2 text-[10px] text-zinc-500 font-medium">
              <span>All listening hooks stable</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Split */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Connections List */}
        <div className="md:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-white">API Connections Directory</CardTitle>
              <CardDescription>Verify link statuses and sync audit logs with client-facing integrations.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Provider</TableHead>
                    <TableHead>Link Status</TableHead>
                    <TableHead>Connection Audit Logs</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {integrations.map((intg) => (
                    <TableRow key={intg.provider}>
                      <TableCell className="font-semibold text-white tracking-wider">{intg.provider}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            intg.status === 'CONNECTED' 
                              ? 'risk-low' 
                              : intg.status === 'SYNCING' 
                                ? 'outline' 
                                : 'risk-high'
                          }
                        >
                          {intg.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-zinc-400 font-sans">{intg.logs}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={syncingProvider !== null}
                          onClick={() => handleSync(intg.provider)}
                          className="h-8 w-8 text-zinc-400 hover:text-white rounded"
                        >
                          <RefreshCw className={`h-3.5 w-3.5 ${syncingProvider === intg.provider ? 'animate-spin text-white' : ''}`} />
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
            type="churn"
            title="Prism Integration Compliance Alert"
            score="1 Failed Connection"
            scoreLabel="API SYNC STATUS"
            riskLevel="MEDIUM"
          >
            {formatUserMessage("Lohith, the connection to **HubSpot CRM** stands at DISCONNECTED due to an expired OAuth refresh token. Re-authorization is required to resume client contact indexing updates.")}
          </InsightPanel>
        </div>
      </div>
    </div>
  );
}
