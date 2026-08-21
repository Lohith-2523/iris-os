import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  checkWorkspaceDataRevision,
  configureWorkspaceDataCache,
  invalidateWorkspaceDataCache,
  primeWorkspaceJson,
  prepareWorkspaceDataCacheForRouteChange,
  stageWorkspaceDataCache,
  workspaceFetch,
} from '@/lib/workspace-data-cache';

function jsonResponse(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('workspace data cache', () => {
  beforeEach(() => {
    configureWorkspaceDataCache({ userId: 'user-1', orgId: 'org-1' });
    invalidateWorkspaceDataCache();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('deduplicates concurrent reads for the same scoped resource', async () => {
    const networkFetch = vi.fn(async () => {
      await Promise.resolve();
      return jsonResponse([{ id: 'task-1', title: 'First task' }]);
    });
    vi.stubGlobal('fetch', networkFetch);

    const [left, right] = await Promise.all([
      workspaceFetch('/api/tasks'),
      workspaceFetch('/api/tasks'),
    ]);

    expect(networkFetch).toHaveBeenCalledTimes(1);
    expect(await left.json()).toEqual([{ id: 'task-1', title: 'First task' }]);
    expect(await right.json()).toEqual([{ id: 'task-1', title: 'First task' }]);
  });

  it('keeps prefetched data staged until a foreground load promotes it', async () => {
    const networkFetch = vi.fn(async () => jsonResponse([{ id: 'task-1', title: 'Staged task' }]));
    vi.stubGlobal('fetch', networkFetch);

    prepareWorkspaceDataCacheForRouteChange('/tasks');
    await stageWorkspaceDataCache(['/api/tasks']);
    expect(networkFetch).toHaveBeenCalledTimes(1);

    const promoted = await workspaceFetch('/api/tasks');
    expect(networkFetch).toHaveBeenCalledTimes(1);
    expect(promoted.headers.get('X-Workspace-Cache')).toBe('STAGED');
    expect(await promoted.json()).toEqual([{ id: 'task-1', title: 'Staged task' }]);
  });

  it('primes bootstrap JSON without making a duplicate network request', async () => {
    const networkFetch = vi.fn(async () => jsonResponse({ error: 'unexpected request' }, 500));
    vi.stubGlobal('fetch', networkFetch);
    const workspace = { organization: { id: 'org-1' }, user: { id: 'user-1' } };

    primeWorkspaceJson('/api/workspace', workspace);
    const response = await workspaceFetch('/api/workspace');

    expect(networkFetch).not.toHaveBeenCalled();
    expect(response.headers.get('X-Workspace-Cache')).toBe('HIT');
    expect(await response.json()).toEqual(workspace);
  });

  it('stages independent route data with bounded concurrency', async () => {
    const releases: Array<(response: Response) => void> = [];
    const networkFetch = vi.fn(() => new Promise<Response>((resolve) => releases.push(resolve)));
    vi.stubGlobal('fetch', networkFetch);

    const staging = stageWorkspaceDataCache([
      '/api/projects',
      '/api/data?domain=clients',
      '/api/data?domain=team',
    ], 3);

    await vi.waitFor(() => expect(networkFetch).toHaveBeenCalledTimes(3));
    releases.forEach((release) => release(jsonResponse([])));
    await staging;
  });

  it('patches an entity list from an authoritative mutation response', async () => {
    const updatedTask = {
      id: 'task-1',
      title: 'Updated task',
      clientId: 'client-1',
      createdAt: '2026-07-24T08:00:00.000Z',
    };
    const networkFetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if ((init?.method || 'GET').toUpperCase() === 'PATCH') {
        return jsonResponse({ success: true, task: updatedTask });
      }
      return jsonResponse([{
        id: 'task-1',
        title: 'Original task',
        clientId: 'client-1',
        createdAt: '2026-07-24T08:00:00.000Z',
      }]);
    });
    vi.stubGlobal('fetch', networkFetch);

    await workspaceFetch('/api/tasks');
    await workspaceFetch('/api/tasks', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: 'task-1', title: 'Updated task' }),
    });
    const cached = await workspaceFetch('/api/tasks');

    expect(networkFetch).toHaveBeenCalledTimes(2);
    expect(await cached.json()).toEqual([updatedTask]);
    expect(cached.headers.get('X-Workspace-Cache')).toBe('HIT');
  });

  it('removes deleted entities without refetching the full collection', async () => {
    const networkFetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if ((init?.method || 'GET').toUpperCase() === 'POST') {
        return jsonResponse({ success: true });
      }
      return jsonResponse([
        { id: 'task-1', title: 'Keep this task' },
        { id: 'task-2', title: 'Delete this task' },
      ]);
    });
    vi.stubGlobal('fetch', networkFetch);

    await workspaceFetch('/api/tasks');
    await workspaceFetch('/api/tasks', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'delete_task', taskId: 'task-2' }),
    });
    const cached = await workspaceFetch('/api/tasks');

    expect(networkFetch).toHaveBeenCalledTimes(2);
    expect(await cached.json()).toEqual([
      { id: 'task-1', title: 'Keep this task' },
    ]);
  });

  it('defers server-side changes until the user moves to another workspace page', async () => {
    let revisionChecks = 0;
    let taskReads = 0;
    const networkFetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = input.toString();
      if (url === '/api/workspace/revision') {
        revisionChecks += 1;
        return jsonResponse({ revision: revisionChecks === 1 ? 'revision-1' : 'revision-2' });
      }
      if (url === '/api/tasks') {
        taskReads += 1;
        return jsonResponse([{ id: 'task-1', title: `Task read ${taskReads}` }]);
      }
      return jsonResponse({});
    });
    vi.stubGlobal('fetch', networkFetch);

    prepareWorkspaceDataCacheForRouteChange('/tasks');
    await workspaceFetch('/api/tasks');
    await checkWorkspaceDataRevision();
    expect(await checkWorkspaceDataRevision()).toBe(true);

    const beforeNavigation = await workspaceFetch('/api/tasks');
    expect(taskReads).toBe(1);
    expect(await beforeNavigation.json()).toEqual([{ id: 'task-1', title: 'Task read 1' }]);

    expect(prepareWorkspaceDataCacheForRouteChange('/projects')).toBe(true);
    const afterNavigation = await workspaceFetch('/api/tasks');
    expect(taskReads).toBe(2);
    expect(await afterNavigation.json()).toEqual([{ id: 'task-1', title: 'Task read 2' }]);
  });

  it('removes a client from an aggregate client cache from the delete response', async () => {
    const networkFetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if ((init?.method || 'GET').toUpperCase() === 'DELETE') {
        return jsonResponse({ success: true });
      }
      return jsonResponse([
        { id: 'client-1', name: 'Keep', revenue: 100 },
        { id: 'client-2', name: 'Remove', revenue: 200 },
      ]);
    });
    vi.stubGlobal('fetch', networkFetch);

    await workspaceFetch('/api/data?domain=clients');
    await workspaceFetch('/api/clients?clientId=client-2', { method: 'DELETE' });
    const cached = await workspaceFetch('/api/data?domain=clients');

    expect(networkFetch).toHaveBeenCalledTimes(2);
    expect(await cached.json()).toEqual([{ id: 'client-1', name: 'Keep', revenue: 100 }]);
  });
});
