'use client';

import * as React from 'react';
import { Loader2, MessageSquareText, Save, Sparkles } from 'lucide-react';
import { workspaceFetch as fetch } from '@/lib/workspace-data-cache';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

type ChangeRequestStatus = 'PROPOSED' | 'DISCUSSION' | 'FINALIZED';

type ChangeRequestDraft = {
  title: string;
  details: string;
  status: ChangeRequestStatus;
  agencyResponse: string;
  alternateProposal: string;
};

interface ChangeRequestManagerProps {
  requests: any[];
  canManage?: boolean;
  showProjectName?: boolean;
  onUpdated?: (changeRequest: any) => void | Promise<void>;
}

function normalizeStatus(status?: string): ChangeRequestStatus {
  if (status === 'FINALIZED' || status === 'RESOLVED') return 'FINALIZED';
  if (status === 'DISCUSSION' || status === 'IN_REVIEW' || status === 'DECLINED') return 'DISCUSSION';
  return 'PROPOSED';
}

function statusLabel(status?: string) {
  const normalized = normalizeStatus(status);
  return normalized.charAt(0) + normalized.slice(1).toLowerCase();
}

function draftFor(request: any): ChangeRequestDraft {
  return {
    title: request.title || '',
    details: request.details || '',
    status: normalizeStatus(request.status),
    agencyResponse: request.agencyResponse || '',
    alternateProposal: request.alternateProposal || '',
  };
}

export function ChangeRequestManager({ requests, canManage = false, showProjectName = false, onUpdated }: ChangeRequestManagerProps) {
  const [localRequests, setLocalRequests] = React.useState<any[]>(requests);
  const [drafts, setDrafts] = React.useState<Record<string, ChangeRequestDraft>>(() => Object.fromEntries(requests.map((request) => [request.id, draftFor(request)])));
  const [busyId, setBusyId] = React.useState('');
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState('');

  React.useEffect(() => {
    setLocalRequests(requests);
    setDrafts(Object.fromEntries(requests.map((request) => [request.id, draftFor(request)])));
  }, [requests]);

  const updateDraft = (id: string, patch: Partial<ChangeRequestDraft>) => {
    setDrafts((current) => ({ ...current, [id]: { ...current[id], ...patch } }));
  };

  const saveRequest = async (request: any) => {
    const draft = drafts[request.id];
    if (!draft || busyId) return;
    setBusyId(request.id);
    setError('');
    setSuccess('');
    try {
      const response = await fetch('/api/deliverables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_change_request',
          id: request.id,
          title: draft.title,
          note: draft.details,
          status: draft.status,
          agencyResponse: draft.agencyResponse || null,
          alternateProposal: draft.alternateProposal || null,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Unable to update this change request.');
      const updated = payload.changeRequest || { ...request, ...draft };
      setLocalRequests((current) => current.map((item) => item.id === request.id ? updated : item));
      setDrafts((current) => ({ ...current, [request.id]: draftFor(updated) }));
      setSuccess(payload.atlas?.summary || `${draft.title} was updated.`);
      await onUpdated?.(updated);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to update this change request.');
    } finally {
      setBusyId('');
    }
  };

  return (
    <div className="space-y-4">
      {error && <div role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">{error}</div>}
      {success && <div role="status" className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-4 text-sm"><Sparkles className="mt-0.5 h-4 w-4 shrink-0" />{success}</div>}
      {localRequests.map((request) => {
        const draft = drafts[request.id] || draftFor(request);
        const isBusy = busyId === request.id;
        return (
          <Card key={request.id}>
            <CardContent className="space-y-5 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold">{request.title}</h3>
                    <Badge variant="outline">{statusLabel(request.status)}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Proposed by {request.requestedByName || 'Client'}
                    {showProjectName && request.project?.name ? ` · ${request.project.name}` : ''}
                  </p>
                </div>
                {request.atlasAppliedAt && <Badge variant="risk-low"><Sparkles className="mr-1 h-3.5 w-3.5" />Atlas applied</Badge>}
              </div>

              {canManage ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  <label className="space-y-2 lg:col-span-2">
                    <span className="text-sm font-semibold">Request title</span>
                    <input value={draft.title} onChange={(event) => updateDraft(request.id, { title: event.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-foreground outline-none focus:border-foreground/40" />
                  </label>
                  <label className="space-y-2 lg:col-span-2">
                    <span className="text-sm font-semibold">Client&apos;s requested change</span>
                    <textarea value={draft.details} onChange={(event) => updateDraft(request.id, { details: event.target.value })} className="min-h-28 w-full rounded-lg border border-border bg-background p-3 text-foreground outline-none focus:border-foreground/40" />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-semibold">Agency response</span>
                    <textarea value={draft.agencyResponse} onChange={(event) => updateDraft(request.id, { agencyResponse: event.target.value })} placeholder="Add questions, constraints, or the agency response" className="min-h-28 w-full rounded-lg border border-border bg-background p-3 text-foreground outline-none focus:border-foreground/40" />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-semibold">Proposed alternate</span>
                    <textarea value={draft.alternateProposal} onChange={(event) => updateDraft(request.id, { alternateProposal: event.target.value })} placeholder="Offer an alternate scope or approach; when present, Atlas treats this as the finalized scope" className="min-h-28 w-full rounded-lg border border-border bg-background p-3 text-foreground outline-none focus:border-foreground/40" />
                  </label>
                  <div className="flex flex-wrap items-end justify-between gap-4 lg:col-span-2">
                    <label className="min-w-56 space-y-2">
                      <span className="text-sm font-semibold">Status</span>
                      <select value={draft.status} onChange={(event) => updateDraft(request.id, { status: event.target.value as ChangeRequestStatus })} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-foreground outline-none">
                        <option value="PROPOSED">Proposed</option>
                        <option value="DISCUSSION">Discussion</option>
                        <option value="FINALIZED">Finalized</option>
                      </select>
                    </label>
                    <div className="text-right">
                      {draft.status === 'FINALIZED' && <p className="mb-2 max-w-lg text-sm text-muted-foreground">Finalizing asks Atlas to add or adapt project tasks using the agreed scope and alternate proposal.</p>}
                      <Button type="button" disabled={isBusy || !draft.title.trim() || !draft.details.trim()} onClick={() => void saveRequest(request)} className="gap-2">
                        {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : draft.status === 'FINALIZED' ? <Sparkles className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                        {isBusy ? 'Saving...' : draft.status === 'FINALIZED' ? 'Finalize and apply with Atlas' : 'Save change request'}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div><p className="text-sm font-semibold">Requested change</p><p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{request.details}</p></div>
                  {request.agencyResponse && <div className="rounded-lg border border-border p-4"><p className="text-sm font-semibold">Agency response</p><p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{request.agencyResponse}</p></div>}
                  {request.alternateProposal && <div className="rounded-lg border border-border p-4"><p className="text-sm font-semibold">Proposed alternate</p><p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{request.alternateProposal}</p></div>}
                </div>
              )}

              {request.atlasSummary && <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-4"><Sparkles className="mt-0.5 h-4 w-4 shrink-0" /><div><p className="text-sm font-semibold">Atlas project-plan update</p><p className="mt-1 text-sm text-muted-foreground">{request.atlasSummary}</p></div></div>}
            </CardContent>
          </Card>
        );
      })}
      {!localRequests.length && (
        <Card><CardContent className="flex min-h-44 flex-col items-center justify-center p-8 text-center"><MessageSquareText className="h-8 w-8 text-muted-foreground" /><h3 className="mt-4 font-semibold">No project change requests</h3><p className="mt-2 text-sm text-muted-foreground">Client proposals will appear here against the relevant project.</p></CardContent></Card>
      )}
    </div>
  );
}
