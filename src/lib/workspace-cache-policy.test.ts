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

  it('does not treat a theme-only preference update as data mutation', () => {
    expect(workspaceMutationPlan('/api/workspace', 'PATCH', {
      user: {
        preferences: {
          theme: 'light',
        },
      },
    })).toEqual({
      invalidateTags: [],
      skip: true,
    });
  });

  it('falls back to a narrow workspace invalidation for unknown mutations', () => {
    expect(workspaceMutationPlan('/api/custom-action', 'POST', null)).toEqual({
      invalidateTags: ['workspace'],
    });
  });
});
