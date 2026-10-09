import { describe, expect, it } from 'vitest';
import { canManageWorkspacePage } from './workspace-page-permissions';

describe('workspace page mutation permissions', () => {
  it('allows administrators and sub-admins assigned to the matching page', () => {
    expect(canManageWorkspacePage({ role: 'admin' }, 'finance')).toBe(true);
    expect(canManageWorkspacePage({ role: 'sub_admin', accessPermissions: ['finance'] }, 'finance')).toBe(true);
    expect(canManageWorkspacePage({ role: 'sub_admin', accessPermissions: ['agency-leads'] }, 'agency-leads')).toBe(true);
  });

  it('does not let page access spill into another domain or role', () => {
    expect(canManageWorkspacePage({ role: 'sub_admin', accessPermissions: ['agency-leads'] }, 'finance')).toBe(false);
    expect(canManageWorkspacePage({ role: 'member', accessPermissions: ['finance'] }, 'finance')).toBe(false);
  });
});
