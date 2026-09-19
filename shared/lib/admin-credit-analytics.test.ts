import { describe, expect, it } from 'vitest';
import { buildAdminCreditAnalytics } from './admin-credit-analytics';

describe('buildAdminCreditAnalytics', () => {
  it('includes zero-use users and calculates plan and provider averages', () => {
    const result = buildAdminCreditAnalytics([
      { id: 'basic-admin', name: 'Ari', email: 'ari@example.com', role: 'admin', organization: { name: 'North', plan: 'BASIC' } },
      { id: 'basic-member', name: 'Bea', email: 'bea@example.com', role: 'member', organization: { name: 'North', plan: 'BASIC' } },
      { id: 'pro-admin', name: 'Cal', email: 'cal@example.com', role: 'admin', organization: { name: 'South', plan: 'PRO' } },
    ], [
      { userId: 'basic-admin', provider: 'GPT', inputCredits: 100, outputCredits: 300, totalCredits: 400, requests: 2 },
      { userId: 'basic-admin', provider: 'GEMINI', inputCredits: 50, outputCredits: 50, totalCredits: 100, requests: 1 },
      { userId: 'pro-admin', provider: 'CLAUDE', inputCredits: 200, outputCredits: 800, totalCredits: 1000, requests: 1 },
    ]);

    expect(result.totals).toMatchObject({ total: 1500, users: 3, activeUsers: 2, averagePerUser: 500, averagePerActiveUser: 750 });
    expect(result.topUser?.id).toBe('pro-admin');
    expect(result.plans.find((plan) => plan.plan === 'BASIC')).toMatchObject({ users: 2, activeUsers: 1, total: 500, averagePerUser: 250, averagePerActiveUser: 500, mostSpent: 500 });
    expect(result.providers).toEqual(expect.arrayContaining([
      expect.objectContaining({ provider: 'GPT', total: 400 }),
      expect.objectContaining({ provider: 'CLAUDE', total: 1000 }),
    ]));
    expect(result.users.find((user) => user.id === 'basic-member')?.total).toBe(0);
  });
});
