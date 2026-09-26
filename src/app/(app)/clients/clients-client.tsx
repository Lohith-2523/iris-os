'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Plus, Trash2, X } from 'lucide-react';
import ClientDetailDashboard from '@/components/clients/client-detail-dashboard';
import { formatCurrency } from '@/lib/utils';
import { collectAssignedSpecialists, type AssignedSpecialist } from '@/lib/clients/assigned-specialists';
import type { ClientsReadModel } from '@/server/read-models/workspace-pages';
import { ProfileAvatar } from '@/components/ui/profile-avatar';
import { useWorkspaceRuntime } from '@/components/demo/demo-mode-provider';

function SpecialistAvatar({ specialist, index }: { specialist: AssignedSpecialist; index: number }) {
  return (
    <span
      className="group relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-zinc-950 bg-zinc-800 text-[9px] font-bold text-zinc-200 outline-none transition-[transform,z-index] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:z-20 hover:-translate-y-0.5 focus-visible:z-20 focus-visible:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-zinc-500"
      style={{ zIndex: index + 1 }}
      tabIndex={0}
      aria-label={specialist.name}
    >
      <ProfileAvatar src={specialist.avatarUrl} name={specialist.name} seed={specialist.id} className="rounded-full" />
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 translate-y-1 scale-95 whitespace-nowrap rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-[10px] font-medium text-zinc-100 opacity-0 shadow-xl transition-[opacity,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:translate-y-0 group-hover:scale-100 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:scale-100 group-focus-visible:opacity-100"
      >
        {specialist.name}
      </span>
    </span>
  );
}

function AssignedSpecialists({ specialists }: { specialists: AssignedSpecialist[] }) {
  if (specialists.length === 0) return <span className="text-zinc-600 italic">Unassigned</span>;

  const visibleSpecialists = specialists.slice(0, 6);
  const remainingSpecialists = specialists.slice(6);

  return (
    <div className="flex items-center -space-x-2" aria-label={`${specialists.length} assigned specialist${specialists.length === 1 ? '' : 's'}`}>
      {visibleSpecialists.map((specialist, index) => (
        <SpecialistAvatar key={specialist.id} specialist={specialist} index={index} />
      ))}
      {remainingSpecialists.length > 0 && (
        <span
          className="group relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-zinc-950 bg-zinc-700 text-[9px] font-bold text-white outline-none focus-visible:ring-2 focus-visible:ring-zinc-500"
          tabIndex={0}
          aria-label={`${remainingSpecialists.length} more assigned specialists`}
        >
          +{remainingSpecialists.length}
          <span role="tooltip" className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 translate-y-1 scale-95 whitespace-nowrap rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-[10px] font-medium text-zinc-100 opacity-0 shadow-xl transition-[opacity,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:translate-y-0 group-hover:scale-100 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:scale-100 group-focus-visible:opacity-100">
            {remainingSpecialists.map((specialist) => specialist.name).join(', ')}
          </span>
        </span>
      )}
    </div>
  );
}

export default function ClientsPage({ initialData }: { initialData: ClientsReadModel }) {
  const { fetch } = useWorkspaceRuntime();
  const searchParams = useSearchParams();
  const [dbClients, setDbClients] = React.useState<any[]>(initialData.clients);
  const [team] = React.useState<any[]>(initialData.team);
  const [selectedClientId, setSelectedClientId] = React.useState<string | null>(null);
  const [canManageClients] = React.useState(initialData.canManageClients);
  const [clientPendingDeletion, setClientPendingDeletion] = React.useState<any | null>(null);
  const [deleteAcknowledged, setDeleteAcknowledged] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState('');

  const clients = dbClients;

  const activeClients = clients.filter((client) => client.status === 'ACTIVE');
  const deletedClients = clients.filter((client) => client.status !== 'ACTIVE');
  const activeProjects = clients.flatMap((client) => client.projects || []).filter((project) => ['IN_PROGRESS', 'OVERDUE'].includes(project.status));

  const selectedClient = clients.find(c => c.id === selectedClientId);

  React.useEffect(() => {
    const requestedClientId = searchParams.get('clientId');
    if (requestedClientId && clients.some((client) => client.id === requestedClientId)) setSelectedClientId(requestedClientId);
  }, [clients, searchParams]);

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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deleteRelatedData: true }),
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
          <h1 className="text-2xl font-bold tracking-tight text-white silver-text-gradient">Clients</h1>
        </div>
        <div className="flex items-center gap-3">

          <Link href="/clients/onboard" prefetch={false}>
            <Button variant="default" size="sm" className="h-8 gap-1.5 font-semibold">
              <Plus className="h-3.5 w-3.5" />
              <span>Add Client</span>
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3"><Card><CardHeader><CardDescription>Total clients</CardDescription><CardTitle className="text-3xl">{clients.length}</CardTitle><p className="text-zinc-500">{activeClients.length} active · {deletedClients.length} deleted/inactive</p></CardHeader></Card><Card><CardHeader><CardDescription>Active clients</CardDescription><CardTitle className="text-3xl">{activeClients.length}</CardTitle></CardHeader></Card><Card><CardHeader><CardDescription>Active projects</CardDescription><CardTitle className="text-3xl">{activeProjects.length}</CardTitle></CardHeader></Card></div>


      {/* Main Split */}
      <div className="grid gap-6">
        {/* Table of clients */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-white">Active Accounts List</CardTitle>
              <CardDescription>Portfolio relationships with project coverage, assigned specialists, and annual contract value.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client Name</TableHead>
                    <TableHead>Projects</TableHead>
                    <TableHead>Assigned Specialists</TableHead>
                    <TableHead className="text-right">Contract Value</TableHead>
                    {canManageClients && <TableHead className="w-[68px] text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={canManageClients ? 5 : 4} className="text-center py-8 text-zinc-500">
                        No clients registered.
                      </TableCell>
                    </TableRow>
                  ) : (
                    clients.map((c: any) => {
                      const legacySpecialist = team.find((member: any) => member.id === c.metadata?.assignedTeamMemberId);
                      const assignedSpecialists = collectAssignedSpecialists(c.projects || [], legacySpecialist);
                      return (
                        <TableRow 
                          key={c.id} 
                          className="cursor-pointer hover:bg-zinc-900/30 transition-colors" 
                          onClick={() => setSelectedClientId(c.id)}
                        >
                          <TableCell className="font-semibold text-white">{c.name}</TableCell>
                          <TableCell className="text-zinc-300">
                            <span className="font-mono font-semibold text-white">{c.projects?.length || 0}</span>
                            <span className="ml-1.5 text-[10px] text-zinc-600">{c.projects?.length === 1 ? 'project' : 'projects'}</span>
                          </TableCell>
                          <TableCell className="text-zinc-300">
                            <AssignedSpecialists specialists={assignedSpecialists} />
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-semibold text-zinc-200">
                            {formatCurrency(Number(c.contractValue || 0))}
                          </TableCell>
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
              This revokes every client login and permanently removes the client account, projects, financial records, messages, chats, chat history, files, and all other related data. This action cannot be undone.
            </p>

            <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-950/40 p-3 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={deleteAcknowledged}
                onChange={(event) => setDeleteAcknowledged(event.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-white"
              />
              <span>Delete all data related to this client, including their access, messages, chats, and chat history.</span>
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
