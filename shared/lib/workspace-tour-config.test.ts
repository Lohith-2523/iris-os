import { describe, expect, it } from 'vitest';
import { WORKSPACE_TOURS, workspaceTourForPath, workspaceToursForAccess } from './workspace-tour-config';

describe('workspace tour registry', () => {
  it('covers every unique sidebar destination for admin, client, and team workspaces', () => {
    const expectedRoutes = [
      '/dashboard', '/agency-leads', '/clients', '/clients/onboard', '/projects', '/finance', '/invoices',
      '/tasks', '/team', '/calendar', '/messages', '/proposals', '/documents', '/reporting',
      '/strategy', '/atlas', '/client-dashboard', '/client-projects', '/client-documents',
      '/client-deliverables', '/teams-dashboard', '/settings',
    ];

    expect(WORKSPACE_TOURS.map((tour) => tour.route).sort()).toEqual(expectedRoutes.sort());
    expect(WORKSPACE_TOURS.every((tour) => tour.steps.length >= 1 && tour.steps.every((step) => step.tip.length > 0))).toBe(true);
    expect(WORKSPACE_TOURS.every((tour) => tour.steps.every((step) => step.target.startsWith('[data-tour=')))).toBe(true);
  });

  it('uses the parent sidebar tour for nested record pages', () => {
    expect(workspaceTourForPath('/clients/client-123')?.route).toBe('/clients');
  });

  it('covers the requested dashboard and lead workflows', () => {
    const dashboardSteps = WORKSPACE_TOURS.find((tour) => tour.id === 'dashboard-orientation')!.steps.map((step) => step.id);
    const leadSteps = WORKSPACE_TOURS.find((tour) => tour.id === 'sales-pipeline')!.steps.map((step) => step.id);

    expect(dashboardSteps).toEqual(expect.arrayContaining(['workspace-overview', 'dashboard-sales-pipeline']));
    expect(leadSteps).toEqual(expect.arrayContaining(['add-lead', 'connect-meta']));
  });

  it('previews client setup pages and returns to the required first page', () => {
    const tour = WORKSPACE_TOURS.find((item) => item.id === 'client-onboarding')!;

    expect(tour.steps.map((step) => (step.preview?.detail as { step?: number })?.step)).toEqual([1, 2, 2, 2, 2, 2, 3]);
    expect(tour.returnRoute).toBe('/clients/onboard');
    expect((tour.returnPreview?.detail as { step?: number }).step).toBe(1);
  });

  it('covers project setup details, page overviews, and recurring subscriptions', () => {
    const clientSteps = WORKSPACE_TOURS.find((tour) => tour.id === 'client-onboarding')!.steps.map((step) => step.id);
    const projectSteps = WORKSPACE_TOURS.find((tour) => tour.id === 'create-project')!.steps.map((step) => step.id);
    const taskSteps = WORKSPACE_TOURS.find((tour) => tour.id === 'manage-tasks')!.steps.map((step) => step.id);
    const financeSteps = WORKSPACE_TOURS.find((tour) => tour.id === 'record-finances')!.steps.map((step) => step.id);

    expect(clientSteps).toEqual(expect.arrayContaining(['client-project-payment', 'client-project-budget', 'client-project-stages', 'client-project-task']));
    expect(projectSteps).toEqual(expect.arrayContaining(['projects-overview', 'project-payment', 'project-budget', 'project-stages', 'project-task']));
    expect(taskSteps[0]).toBe('task-workspace');
    expect(financeSteps).toContain('recurring-subscriptions');
  });

  it('covers the expanded invoice, task, team, document, output, Miles, and header guidance', () => {
    const steps = (id: string) => WORKSPACE_TOURS.find((tour) => tour.id === id)!.steps.map((step) => step.id);

    expect(steps('create-invoice')).toEqual(expect.arrayContaining(['proforma-lead', 'proforma-details', 'proforma-items', 'proforma-generate']));
    expect(steps('manage-tasks')).toEqual(expect.arrayContaining(['task-create-basics', 'task-create-routing', 'task-create-schedule', 'task-detail', 'task-edit']));
    expect(steps('add-team-member')).toEqual(expect.arrayContaining(['handles-deliverables', 'member-projects']));
    expect(steps('reporting')).toContain('reporting-archive');
    expect(steps('strategy')).toContain('strategy-history');
    expect(steps('meet-miles')).toEqual(expect.arrayContaining(['miles-transcribe', 'miles-voice-chat']));
    expect(steps('dashboard-orientation')).toEqual(expect.arrayContaining(['header-miles', 'header-notifications', 'header-theme', 'header-search']));
    expect(WORKSPACE_TOURS.find((tour) => tour.id === 'create-proposal')!.steps.every((step) => step.preview)).toBe(true);
    expect(WORKSPACE_TOURS.find((tour) => tour.id === 'create-contract')!.steps.every((step) => step.preview)).toBe(true);
    expect(steps('settings')).toEqual(expect.arrayContaining(['settings-profile', 'settings-security', 'settings-billing', 'settings-integrations']));
  });

  it('only returns tours the current workspace role can access', () => {
    const ids = (role: string, accessPermissions?: string[], deliveryWorkspace = false) => workspaceToursForAccess({
      role,
      plan: 'ADVANCED',
      accessPermissions,
      deliveryWorkspace,
    }).map((tour) => tour.id);

    expect(ids('client')).toEqual(expect.arrayContaining(['client-dashboard', 'client-projects', 'client-documents', 'client-deliverables', 'schedule-meeting', 'messages']));
    expect(ids('client')).not.toEqual(expect.arrayContaining(['dashboard-orientation', 'add-client', 'client-onboarding', 'record-finances', 'settings']));
    expect(ids('admin')).toEqual(expect.arrayContaining(['dashboard-orientation', 'add-client', 'record-finances', 'settings']));
    expect(ids('admin')).not.toEqual(expect.arrayContaining(['client-dashboard', 'client-projects', 'team-workspace']));
    expect(ids('member')).toEqual(expect.arrayContaining(['team-workspace', 'manage-tasks', 'schedule-meeting', 'messages']));
    expect(ids('member')).not.toEqual(expect.arrayContaining(['dashboard-orientation', 'add-team-member', 'settings']));
    expect(ids('sub_admin', ['finance', 'invoices'])).toEqual(['record-finances', 'create-invoice']);
    expect(ids('sub_admin', ['clients'], true)).toEqual(expect.arrayContaining(['add-client', 'client-onboarding', 'manage-tasks', 'team-workspace', 'schedule-meeting', 'messages']));
  });

  it('removes plan-gated tours even when the route belongs to the role', () => {
    const basicTours = workspaceToursForAccess({ role: 'admin', plan: 'BASIC' }).map((tour) => tour.id);

    expect(basicTours).toContain('meet-miles');
    expect(basicTours).not.toContain('strategy');
  });
});
