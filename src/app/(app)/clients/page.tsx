'use client';

import * as React from 'react';
import { workspaceFetch as fetch } from '@/lib/workspace-data-cache';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { ArrowRight, Plus, Sparkles, Trash2, X } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import ClientDetailDashboard from '@/components/clients/client-detail-dashboard';
import { ClientPortfolioValueChart } from '@/components/clients/client-revenue-chart';

type SavedStrategy = {
  id: string;
  type: string;
  title: string;
  content: string;
  createdAt: string;
};

function summarizeStrategy(content: string) {
  const plainText = content
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_`>|-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return plainText.length > 360 ? `${plainText.slice(0, 357).trimEnd()}...` : plainText;
}

export default function ClientsPage() {
  const [dbClients, setDbClients] = React.useState<any[]>([]);
  const [team, setTeam] = React.useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = React.useState<string | null>(null);
  const [latestStrategy, setLatestStrategy] = React.useState<SavedStrategy | null>(null);
  const [canManageClients, setCanManageClients] = React.useState(false);
  const [clientPendingDeletion, setClientPendingDeletion] = React.useState<any | null>(null);
  const [deleteAcknowledged, setDeleteAcknowledged] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState('');

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

        const userRes = await fetch('/api/user');
        if (userRes.ok) {
          const currentUser = await userRes.json();
          setCanManageClients(currentUser.role?.toLowerCase() === 'admin');
        }

        const strategyRes = await fetch('/api/strategies');
        if (strategyRes.ok) {
          const strategyJson = await strategyRes.json();
          setLatestStrategy(strategyJson.strategies?.[0] || null);
        }
      } catch (e) {
        console.error(e);
      }
    }
    load();
  }, []);

  const clients = dbClients;

  const portfolioYear = clients[0]?.portfolioYear || new Date().getFullYear();
  const totalPortfolioValue = clients.reduce((sum, c) => sum + (c.contractValue || 0), 0);
  const chartClients = clients.map(c => ({
    id: c.id,
    name: c.name,
    portfolioValue: c.contractValue || 0,
  })).sort((a, b) => b.portfolioValue - a.portfolioValue);

  const selectedClient = clients.find(c => c.id === selectedClientId);

  const openDeleteConfirmation = (client: any) => {
    setClientPendingDeletion(client);
    setDeleteAcknowledged(false);
    setDeleteError('');
  };

  const closeDeleteConfirmation = () => {
    if (isDeleting) return;
    setClientPendingDeletion(null);
    setDeleteAcknowledged(false);
    setDeleteError('');
  };

  const deleteClient = async () => {
    if (!clientPendingDeletion || !deleteAcknowledged) return;

    setIsDeleting(true);
    setDeleteError('');
    try {
      const response = await fetch(`/api/clients?clientId=${encodeURIComponent(clientPendingDeletion.id)}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Unable to delete client');
      }
      setDbClients((current) => current.filter((client) => client.id !== clientPendingDeletion.id));
      setClientPendingDeletion(null);
      setDeleteAcknowledged(false);
      setDeleteError('');
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Unable to delete client');
    } finally {
      setIsDeleting(false);
    }
  };

  if (selectedClient) {
    return (
      <ClientDetailDashboard
        client={selectedClient}
        teamMembers={team}
        onBack={() => setSelectedClientId(null)}
        canManageMetaAccounts={canManageClients}
        onClientUpdated={(updatedClient) => {
          setDbClients((current) => current.map((client) =>
            client.id === updatedClient.id ? { ...client, ...updatedClient } : client
          ));
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-zinc-800/60 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white silver-text-gradient">Client Portfolio</h1>
          <p className="text-xs text-zinc-500">Review signed project contract values without annualization or revenue forecasting.</p>
        </div>
        <div className="flex items-center gap-3">

          <Link href="/clients/onboard">
            <Button variant="default" size="sm" className="h-8 gap-1.5 font-semibold">
              <Plus className="h-3.5 w-3.5" />
              <span>Add Client</span>
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card hoverEffect>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{portfolioYear} Portfolio Value</CardTitle>
            <span className="rounded border border-zinc-700 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-zinc-500">Face value</span>
          </CardHeader>
          <CardContent>
            <div className="font-mono text-2xl font-bold tracking-tight text-white">{formatCurrency(totalPortfolioValue)}</div>
          </CardContent>
        </Card>
      </div>


      {/* Main Split */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Table of clients */}
        <div className="md:col-span-2 space-y-6">
          <ClientPortfolioValueChart clients={chartClients} />
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-white">Active Accounts List</CardTitle>
              <CardDescription>Portfolio relationships with renewal timing and churn exposure.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client Name</TableHead>
                    <TableHead>Domain</TableHead>
                    <TableHead>Assigned Specialist</TableHead>
                    <TableHead className="text-center">Renewal</TableHead>
                    <TableHead className="text-center">Churn Risk</TableHead>
                    <TableHead className="text-right">Contract Value</TableHead>
                    {canManageClients && <TableHead className="w-[68px] text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={canManageClients ? 7 : 6} className="text-center py-8 text-zinc-500">
                        No clients registered.
                      </TableCell>
                    </TableRow>
                  ) : (
                    clients.map((c: any) => {
                      const specialist = team.find((t: any) => t.id === c.metadata?.assignedTeamMemberId);
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
                          <TableCell className="text-center text-xs text-zinc-300">
                            {c.renewalDate || 'Not scheduled'}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="font-mono text-xs text-zinc-300 font-semibold">{c.churnRiskScore}%</span>
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold">{formatCurrency(c.contractValue || 0)}</TableCell>
                          {canManageClients && (
                            <TableCell className="text-right">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-zinc-500 hover:bg-zinc-800 hover:text-rose-300"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  openDeleteConfirmation(c);
                                }}
                                aria-label={`Delete ${c.name}`}
                                title={`Delete ${c.name}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Strategy summary */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-200">
                <Sparkles className="h-4 w-4" />
              </div>
              <CardTitle className="pt-3 text-sm font-semibold text-white">Prism AI Strategy</CardTitle>
              <CardDescription>
                {latestStrategy ? 'A concise view of your latest generated strategy.' : 'Generate a strategy from your client and project portfolio.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {latestStrategy ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-zinc-600">{latestStrategy.type.replaceAll('_', ' ')}</p>
                    <p className="mt-1 text-sm font-semibold text-zinc-200">{latestStrategy.title}</p>
                    <p className="mt-2 text-xs leading-5 text-zinc-500">{summarizeStrategy(latestStrategy.content)}</p>
                  </div>
                  <Link href="/strategy">
                    <Button variant="outline" size="sm" className="w-full gap-2">
                      Open strategy <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              ) : (
                <Link href="/strategy">
                  <Button className="w-full gap-2">
                    <Sparkles className="h-4 w-4" /> Create a strategy
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {clientPendingDeletion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="presentation">
          <button
            type="button"
            className="workspace-overlay absolute inset-0 cursor-default bg-black/70 backdrop-blur-sm"
            onClick={closeDeleteConfirmation}
            aria-label="Close delete confirmation"
          />
          <div
            className="workspace-command-dialog relative w-full max-w-md rounded-2xl border border-zinc-800 bg-[#0d0e12] p-6 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-client-title"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Destructive action</p>
                <h2 id="delete-client-title" className="mt-1 text-lg font-semibold text-white">Delete {clientPendingDeletion.name}?</h2>
              </div>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={closeDeleteConfirmation} aria-label="Close delete confirmation">
                <X className="h-4 w-4" />
              </Button>
            </div>

            <p className="mt-4 text-sm leading-6 text-zinc-400">
              This permanently removes the client and associated client records. This action cannot be undone.
            </p>

            <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-950/40 p-3 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={deleteAcknowledged}
                onChange={(event) => setDeleteAcknowledged(event.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-white"
              />
              <span>I understand that deleting this client is permanent.</span>
            </label>

            {deleteError && <p className="mt-3 text-xs text-rose-300" role="alert">{deleteError}</p>}

            <div className="mt-6 flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={closeDeleteConfirmation} disabled={isDeleting}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={deleteClient}
                disabled={!deleteAcknowledged || isDeleting}
                className="bg-zinc-100 text-zinc-950 hover:bg-white"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {isDeleting ? 'Deleting…' : 'Permanently delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
