import { describe, expect, it } from 'vitest';
import { workspaceRoleLabel } from './workspace-role-label';

describe('workspaceRoleLabel', () => {
  it.each(['sub_admin', 'SUB_ADMIN', 'sub-admin', 'Sub Admin', 'subadmin'])(
    'renders %s as Core member',
    (role) => {
      expect(workspaceRoleLabel(role)).toBe('Core member');
    },
  );

  it('keeps unknown role names readable', () => {
    expect(workspaceRoleLabel('Senior_Designer')).toBe('Senior Designer');
  });
});
