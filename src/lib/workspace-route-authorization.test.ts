import { describe, expect, it } from 'vitest';
import { canRenderWorkspaceRoute, workspaceRouteRestriction } from './workspace-route-authorization';

describe('workspace route authorization', () => {
  it('preserves client and member route restrictions', () => {
    expect(workspaceRouteRestriction({ role: 'client', plan: 'BASIC' }, '/finance')).toBe('client');
    expect(canRenderWorkspaceRoute({ role: 'client', plan: 'BASIC' }, '/client-dashboard')).toBe(true);
    expect(workspaceRouteRestriction({ role: 'member', plan: 'BASIC' }, '/projects')).toBe('member');
    expect(canRenderWorkspaceRoute({ role: 'member', plan: 'BASIC' }, '/tasks')).toBe(true);
  });

  it('keeps messaging behind plan access for clients and members', () => {
    expect(canRenderWorkspaceRoute({ role: 'client', plan: 'BASIC' }, '/messages')).toBe(false);
    expect(canRenderWorkspaceRoute({ role: 'member', plan: 'PRO' }, '/messages')).toBe(true);
  });

  it('enforces sub-admin permission lists and admin portal separation', () => {
    expect(canRenderWorkspaceRoute({ role: 'sub_admin', plan: 'PRO', accessPermissions: ['tasks'] }, '/tasks')).toBe(true);
    expect(workspaceRouteRestriction({ role: 'sub_admin', plan: 'PRO', accessPermissions: ['tasks'] }, '/finance')).toBe('sub_admin');
    expect(workspaceRouteRestriction({ role: 'admin', plan: 'ADVANCED' }, '/client-dashboard')).toBe('admin');
  });
});
