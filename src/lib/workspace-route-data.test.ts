import { describe, expect, it } from 'vitest';
import { isWorkspaceDataUrlForRoute, workspaceDataUrlsForRoute } from '@/lib/workspace-route-data';

describe('workspace route data', () => {
  it('returns only data used by the requested route', () => {
    expect(workspaceDataUrlsForRoute('/tasks')).toContain('/api/tasks');
    expect(workspaceDataUrlsForRoute('/tasks')).not.toContain('/api/transactions');
  });

  it('inherits mappings for nested route segments', () => {
    expect(workspaceDataUrlsForRoute('/settings/profile')).toEqual(workspaceDataUrlsForRoute('/settings'));
  });

  it('matches cursor variants of current-route resources', () => {
    expect(isWorkspaceDataUrlForRoute('/tasks', '/api/tasks?cursor=opaque')).toBe(true);
    expect(isWorkspaceDataUrlForRoute('/tasks', '/api/invoices?cursor=opaque')).toBe(false);
  });
});
