import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  configureWorkspaceDataCache,
  invalidateWorkspaceDataCache,
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
});
