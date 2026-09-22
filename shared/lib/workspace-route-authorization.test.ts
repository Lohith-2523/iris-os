import { describe, expect, it } from 'vitest';
import { canRenderWorkspaceRoute, workspaceRouteRestriction } from './workspace-route-authorization';

describe('workspace route authorization', () => {
  it('preserves client and member route restrictions', () => {
    expect(workspaceRouteRestriction({ role: 'client', plan: 'BASIC' }, '/finance')).toBe('client');
    expect(workspaceRouteRestriction({ role: 'client', plan: 'BASIC' }, '/client-dashboard')).toBe('plan');
    expect(canRenderWorkspaceRoute({ role: 'client', plan: 'PRO' }, '/client-dashboard')).toBe(true);
    expect(workspaceRouteRestriction({ role: 'member', plan: 'BASIC' }, '/projects')).toBe('member');
    expect(canRenderWorkspaceRoute({ role: 'member', plan: 'BASIC' }, '/tasks')).toBe(true);
  });

  it('keeps messaging visible for free clients and members', () => {
    expect(canRenderWorkspaceRoute({ role: 'client', plan: 'BASIC' }, '/messages')).toBe(true);
    expect(canRenderWorkspaceRoute({ role: 'member', plan: 'BASIC' }, '/messages')).toBe(true);
    expect(canRenderWorkspaceRoute({ role: 'member', plan: 'PRO' }, '/messages')).toBe(true);
  });

  it('enforces delegated team member permission lists and admin portal separation', () => {
    expect(canRenderWorkspaceRoute({ role: 'sub_admin', plan: 'PRO', accessPermissions: ['tasks'] }, '/tasks')).toBe(true);
    expect(workspaceRouteRestriction({ role: 'sub_admin', plan: 'PRO', accessPermissions: ['tasks'] }, '/finance')).toBe('sub_admin');
    expect(workspaceRouteRestriction({ role: 'admin', plan: 'ADVANCED' }, '/client-dashboard')).toBe('admin');
  });

  it('adds assigned agency pages to a delivery team workspace', () => {
    const principal = { role: 'sub_admin', plan: 'PRO', deliveryWorkspace: true, accessPermissions: ['agency-leads'] };
    expect(canRenderWorkspaceRoute(principal, '/teams-dashboard')).toBe(true);
    expect(canRenderWorkspaceRoute(principal, '/tasks')).toBe(true);
    expect(canRenderWorkspaceRoute(principal, '/agency-leads')).toBe(true);
    expect(canRenderWorkspaceRoute(principal, '/finance')).toBe(false);
  });

  it('keeps non-delivery team members in an agency workspace containing assigned pages only', () => {
    const principal = { role: 'sub_admin', plan: 'ADVANCED', deliveryWorkspace: false, accessPermissions: ['finance', 'reporting'] };
    expect(canRenderWorkspaceRoute(principal, '/finance')).toBe(true);
    expect(canRenderWorkspaceRoute(principal, '/reporting')).toBe(true);
    expect(canRenderWorkspaceRoute(principal, '/teams-dashboard')).toBe(false);
  });
});
