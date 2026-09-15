import { describe, expect, it } from 'vitest';
import { hasDeliveryWork, isDeliveryTeamMember, teamMemberWorkspaceHome } from './team-member-access';

describe('team member workspace access', () => {
  it('uses the team workspace for legacy members and delivery-enabled delegated accounts', () => {
    expect(isDeliveryTeamMember({ role: 'member' })).toBe(true);
    expect(isDeliveryTeamMember({ role: 'sub_admin', deliveryWorkspace: true })).toBe(true);
    expect(teamMemberWorkspaceHome({ role: 'sub_admin', plan: 'PRO', deliveryWorkspace: true })).toBe('/teams-dashboard');
  });

  it('uses the first assigned agency page when there is no delivery work', () => {
    expect(teamMemberWorkspaceHome({ role: 'sub_admin', plan: 'PRO', accessPermissions: ['finance', 'reporting'] })).toBe('/finance');
  });

  it('detects explicit, project, and active-task delivery responsibility', () => {
    expect(hasDeliveryWork({ handlesDeliverables: true })).toBe(true);
    expect(hasDeliveryWork({ projectCount: 1 })).toBe(true);
    expect(hasDeliveryWork({ activeTaskCount: 1 })).toBe(true);
    expect(hasDeliveryWork({ activeDeliverableCount: 1 })).toBe(true);
    expect(hasDeliveryWork({})).toBe(false);
  });
});
