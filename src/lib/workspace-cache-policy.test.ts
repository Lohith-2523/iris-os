import { describe, expect, it } from 'vitest';

import {
  workspaceMutationPlan,
  workspaceReadTags,
} from '@/lib/workspace-cache-policy';

describe('workspace cache policy', () => {
  it('maps aggregate reads to their domain without coupling unrelated pages', () => {
    expect(workspaceReadTags('/api/data?domain=finance')).toEqual(['finance']);
    expect(workspaceReadTags('/api/data?domain=clients')).toEqual(['clients']);
    expect(workspaceReadTags('/api/tasks?projectId=project-1')).toEqual(['tasks']);
  });

  it('patches transactions and only stales their dependent aggregates', () => {
    expect(workspaceMutationPlan('/api/transactions', 'POST', {
      amount: 1_000,
      type: 'revenue',
    })).toEqual({
      invalidateTags: ['transactions', 'finance', 'dashboard', 'clients', 'leads'],
      patchKind: 'transactions',
    });
  });

  it('patches client collections instead of reloading the full portfolio', () => {
    expect(workspaceMutationPlan('/api/clients?clientId=client-1', 'DELETE', null)).toEqual({
      invalidateTags: ['clients', 'projects', 'tasks', 'retainers', 'finance', 'dashboard', 'leads'],
      patchKind: 'clients',
    });
  });

  it('stales task-dependent views without refreshing unrelated finance data', () => {
    const plan = workspaceMutationPlan('/api/tasks', 'PATCH', {
      id: 'task-1',
      status: 'DONE',
    });

    expect(plan.patchKind).toBe('tasks');
    expect(plan.invalidateTags).toEqual([
      'tasks',
      'projects',
      'team',
      'dashboard',
      'operations',
    ]);
    expect(plan.invalidateTags).not.toContain('finance');
  });

  it('refreshes only the workspace preference record after a theme-only update', () => {
    expect(workspaceMutationPlan('/api/workspace', 'PATCH', {
      user: {
        preferences: {
          theme: 'light',
        },
      },
    })).toEqual({
      invalidateTags: ['workspace'],
    });
  });

  it('falls back to a narrow workspace invalidation for unknown mutations', () => {
    expect(workspaceMutationPlan('/api/custom-action', 'POST', null)).toEqual({
      invalidateTags: ['workspace'],
    });
  });
});
