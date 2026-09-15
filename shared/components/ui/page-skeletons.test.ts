import { describe, expect, it } from 'vitest';
import { pageSkeletonVariantForPath } from './page-skeletons';

describe('page-specific skeleton routing', () => {
  it.each([
    ['/dashboard', 'dashboard'],
    ['/analytics', 'analytics'],
    ['/finance', 'finance'],
    ['/agency-leads', 'leads'],
    ['/clients', 'clients'],
    ['/clients/onboard', 'onboarding'],
    ['/projects', 'projects'],
    ['/tasks', 'tasks'],
    ['/team', 'team'],
    ['/calendar', 'calendar'],
    ['/messages', 'messages'],
    ['/reporting', 'reporting'],
    ['/invoices', 'invoices'],
    ['/strategy', 'strategy'],
    ['/atlas', 'atlas'],
    ['/explorer', 'explorer'],
    ['/settings', 'settings'],
    ['/settings/security', 'security'],
    ['/client-dashboard', 'client-portal'],
    ['/client-leads', 'client-leads'],
    ['/teams-dashboard', 'team-dashboard'],
  ])('maps %s to the %s skeleton', (pathname, expected) => {
    expect(pageSkeletonVariantForPath(pathname)).toBe(expected);
  });
});
